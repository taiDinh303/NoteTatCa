using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using NTC.Contract.Repositories.Entities;
using NTC.Contract.Repositories.Entities.Tasks;
using NTC.Contract.Repositories.IUOW;
using NTC.Contract.Services.Interface;
using NTC.Core.Base;
using NTC.Core.Security;
using NTC.ModelViews.Administration;
using NTC.Services.Security;
using NTC.Services.Shared;
using NTC.Contract.Repositories.Entities.Identity;
namespace NTC.Services.Service;
public sealed class AdminService(IUnitOfWork work, ICurrentUser actor, TimeProvider clock, UserManager<ApplicationUser> users,
    IEmailService email, ILogger<AdminService> logger)
    : BaseService(work, actor, clock), IAdminService
{
    public async Task SendPasswordResetLinkAsync(Guid userId)
    {
        RequireAdmin();
        var user = await users.FindByIdAsync(userId.ToString()) ?? throw DomainErrors.NotFound("Account");
        if (user.IsLocked || user.DeletedTime != null)
            throw DomainErrors.Invalid("Unlock and restore this account before requesting a password reset.");
        if (!user.EmailConfirmed || string.IsNullOrWhiteSpace(user.Email))
            throw DomainErrors.Invalid("A verified email is required for password recovery.");

        // Audit metadata only. The reset token and email body must never reach logs or API responses.
        logger.LogInformation("Administrator {ActorUserId} requested password recovery for account {TargetUserId} at {OccurredAt}",
            UserId, userId, UtcNow);
        var token = await users.GeneratePasswordResetTokenAsync(user);
        await email.SendForgotPasswordLinkAsync(user, token);
        logger.LogInformation("Password recovery email accepted for account {TargetUserId}, requested by administrator {ActorUserId}",
            userId, UserId);
    }
    public async Task SetLockedAsync(Guid userId, bool locked)
    {
        RequireAdmin(); if (userId == UserId) throw DomainErrors.Invalid("You cannot lock your current administrator account.");
        await InTransactionAsync(async () =>
        {
            var user = await users.FindByIdAsync(userId.ToString()) ?? throw DomainErrors.NotFound("Account");
            if (user.IsLocked == locked) return true;
            user.IsLocked = locked; user.LastUpdatedBy = CurrentUser.Name; user.LastUpdatedTime = UtcNow;
            SessionSecurity.RequireSuccess(await users.UpdateAsync(user));
            await SessionSecurity.RevokeAllAsync(UnitOfWork, users, user, UtcNow);
            await RecordAdministrativeActionAsync(locked ? AdministrativeAction.AccountLocked : AdministrativeAction.AccountUnlocked, userId);
            await UnitOfWork.SaveAsync(); return true;
        });
    }
    public async Task<AdminStatistics> GetStatisticsAsync()
    {
        RequireAdmin(); // Aggregate only; never project title/content/document.
        return new(await Repository<ApplicationUser>().Entities.CountAsync(), await Repository<ApplicationUser>().Entities.CountAsync(x => x.IsLocked),
            await Repository<Note>().Entities.IgnoreQueryFilters().CountAsync(x => x.DeletedTime == null), await Repository<Note>().Entities.IgnoreQueryFilters().CountAsync(x => x.DeletedTime != null),
            await Repository<Reminder>().Entities.CountAsync(x => x.IsActive && x.DeletedTime == null),
            await Repository<ReminderDelivery>().Entities.CountAsync(x => x.SentAt == null && !x.Abandoned));
    }
    public async Task<BasePaginatedList<AdministrativeAuditResponse>> GetAuditEventsAsync(int page, int size, Guid? targetUserId, AdministrativeAction? action)
    {
        RequireAdmin(); ValidatePage(page, size);
        if (action.HasValue && !Enum.IsDefined(action.Value)) throw DomainErrors.Invalid("Unknown audit action.");
        var query = Repository<AdministrativeAuditEvent>().Entities.AsNoTracking();
        if (targetUserId.HasValue) query = query.Where(x => x.TargetUserId == targetUserId);
        if (action.HasValue) query = query.Where(x => x.Action == action);
        var count = await query.CountAsync();
        var items = await query.OrderByDescending(x => x.OccurredAt).ThenByDescending(x => x.Id)
            .Skip((page - 1) * size).Take(size)
            .Select(x => new AdministrativeAuditResponse(x.Id, x.ActorUserId, x.TargetUserId, x.RoleId, x.Action, x.OccurredAt)).ToListAsync();
        return new(items, count, page, size);
    }

    public async Task<BasePaginatedList<ReminderDeliveryResponse>> GetReminderDeliveriesAsync(int page, int size,
        Guid? userId, string? status, DateTimeOffset? from, DateTimeOffset? to)
    {
        RequireAdmin(); ValidatePage(page, size);
        status = string.IsNullOrWhiteSpace(status) ? null : status.Trim().ToLowerInvariant();
        if (status is not (null or "pending" or "retrying" or "leased" or "sent" or "abandoned"))
            throw DomainErrors.Invalid("Unknown delivery status.");
        if (from > to) throw DomainErrors.Invalid("from must not be after to.");
        var now = UtcNow;
        // Explicit metadata-only projection across owners/hidden notes. Never include a note or raw provider response.
        var query = Repository<ReminderDelivery>().Entities.IgnoreQueryFilters().AsNoTracking();
        if (userId.HasValue) query = query.Where(x => x.UserId == userId);
        if (from.HasValue) query = query.Where(x => x.OccurrenceAt >= from.Value);
        if (to.HasValue) query = query.Where(x => x.OccurrenceAt < to.Value);
        query = status switch
        {
            "sent" => query.Where(x => x.SentAt != null),
            "abandoned" => query.Where(x => x.SentAt == null && x.Abandoned),
            "leased" => query.Where(x => x.SentAt == null && !x.Abandoned && x.LeaseUntil > now),
            "retrying" => query.Where(x => x.SentAt == null && !x.Abandoned && (x.LeaseUntil == null || x.LeaseUntil <= now) && x.Attempts > 0),
            "pending" => query.Where(x => x.SentAt == null && !x.Abandoned && (x.LeaseUntil == null || x.LeaseUntil <= now) && x.Attempts == 0),
            _ => query
        };
        var count = await query.CountAsync();
        var items = await query.OrderByDescending(x => x.OccurrenceAt).ThenByDescending(x => x.Id)
            .Skip((page - 1) * size).Take(size)
            .Select(x => new ReminderDeliveryResponse(x.Id, x.UserId,
                x.SentAt != null ? "sent" : x.Abandoned ? "abandoned" : x.LeaseUntil > now ? "leased" : x.Attempts > 0 ? "retrying" : "pending",
                x.Attempts, x.OccurrenceAt, x.NextAttemptAt, x.LastAttemptAt, x.SentAt, x.AbandonedAt, x.LeaseUntil,
                x.LastErrorCode == null ? null :
                x.LastErrorCode == "PARENT_UNAVAILABLE" || x.LastErrorCode == "RETRY_LIMIT_REACHED" ||
                x.LastErrorCode == "EMAIL_TIMEOUT" || x.LastErrorCode == "EMAIL_SEND_FAILED" ? x.LastErrorCode : "UNKNOWN_ERROR"))
            .ToListAsync();
        return new(items, count, page, size);
    }
}
