using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
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
public sealed class AdminService(IUnitOfWork work, ICurrentUser actor, TimeProvider clock, UserManager<ApplicationUser> users)
    : BaseService(work, actor, clock), IAdminService
{
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
            await Repository<Note>().Entities.CountAsync(x => x.DeletedTime == null), await Repository<Note>().Entities.CountAsync(x => x.DeletedTime != null),
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
}
