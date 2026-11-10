using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using NTC.Contract.Repositories.Entities;
using NTC.Contract.Repositories.Entities.Tasks;
using NTC.Contract.Repositories.IUOW;
using NTC.Contract.Services.Interface;
using NTC.Core.Base;
using NTC.Core.Security;
using NTC.ModelViews.Administration;
using NTC.Services.Shared;

namespace NTC.Services.Service;

public sealed class AnnouncementService(IUnitOfWork work, ICurrentUser actor, TimeProvider clock)
    : BaseService(work, actor, clock), IAnnouncementService
{
    private static AnnouncementResponse View(Announcement a) => new(a.Id, a.Title, a.Body, a.AllActiveUsers,
        a.Version, a.AuthorId, a.CreatedTime, a.PublishedAt, a.PublishedBy, a.RecipientCount, a.RevokedAt, a.RevokedBy);
    private async Task<Announcement> Find(Guid id) => await Repository<Announcement>().Entities.SingleOrDefaultAsync(x => x.Id == id)
        ?? throw DomainErrors.NotFound("Announcement");
    private async Task Audit(Guid id, string action) => await Repository<AnnouncementEvent>().InsertAsync(new()
        { AnnouncementId = id, ActorId = UserId, Action = action, OccurredAt = UtcNow });
    private IQueryable<ApplicationUser> Eligible()
    {
        var memberships = Repository<ApplicationUserRole>().Entities;
        var roles = Repository<ApplicationRole>().Entities;
        return Repository<ApplicationUser>().Entities.Where(u => !u.IsLocked && u.DeletedTime == null
            && memberships.Any(m => m.UserId == u.Id && roles.Any(r => r.Id == m.RoleId && r.Name == "User" && r.DeletedTime == null))
            && !memberships.Any(m => m.UserId == u.Id && roles.Any(r => r.Id == m.RoleId && r.Name == "Admin")));
    }
    private async Task<Guid[]> Recipients(Announcement a)
    {
        if (a.AllActiveUsers) return await Eligible().Select(x => x.Id).ToArrayAsync();
        var targets = await Repository<AnnouncementTarget>().Entities.Where(x => x.AnnouncementId == a.Id).Select(x => x.UserId).ToArrayAsync();
        var valid = await Eligible().Where(x => targets.Contains(x.Id)).Select(x => x.Id).ToArrayAsync();
        if (valid.Length != targets.Length || valid.Length == 0)
            throw DomainErrors.Invalid("Every selected recipient must be an active customer account.");
        return valid;
    }
    private static void Validate(AnnouncementDraftRequest r)
    {
        r.Title = r.Title?.Trim() ?? ""; r.Body = r.Body?.Trim() ?? "";
        if (r.Title.Length is < 1 or > 150 || r.Body.Length is < 1 or > 10000)
            throw DomainErrors.Invalid("Title must contain 1–150 characters and message 1–10000 characters.");
        if (r.UserIds == null || r.UserIds.Length > 1000 || r.UserIds.Any(x => x == Guid.Empty)
            || r.UserIds.Distinct().Count() != r.UserIds.Length || (r.AllActiveUsers && r.UserIds.Length != 0)
            || (!r.AllActiveUsers && r.UserIds.Length == 0))
            throw DomainErrors.Invalid("Choose all active customers or 1–1000 distinct account IDs.");
    }
    private async Task ValidateTargets(AnnouncementDraftRequest request)
    {
        if (!request.AllActiveUsers && await Eligible().CountAsync(x => request.UserIds.Contains(x.Id)) != request.UserIds.Length)
            throw DomainErrors.Invalid("Every selected recipient must be an active customer account.");
    }
    public async Task<BasePaginatedList<AnnouncementResponse>> ListAsync(int page, int size)
    {
        RequireAdmin(); ValidatePage(page, size);
        var query = Repository<Announcement>().Entities.AsNoTracking(); var count = await query.CountAsync();
        var rows = await query.OrderByDescending(x => x.CreatedTime).ThenByDescending(x => x.Id).Skip((page - 1) * size).Take(size).ToListAsync();
        return new(rows.Select(View).ToArray(), count, page, size);
    }
    public async Task<BasePaginatedList<AnnouncementCandidate>> CandidatesAsync(int page, int size, string? q)
    {
        RequireAdmin(); ValidatePage(page, size); q = q?.Trim();
        if (q?.Length > 150) throw DomainErrors.Invalid("Search is too long.");
        var query = Eligible().AsNoTracking();
        if (!string.IsNullOrEmpty(q)) query = query.Where(x => x.Email != null && x.Email.Contains(q));
        var count = await query.CountAsync();
        var rows = await query.OrderBy(x => x.Email).ThenBy(x => x.Id).Skip((page - 1) * size).Take(size)
            .Select(x => new AnnouncementCandidate(x.Id, x.Email ?? "")).ToListAsync();
        return new(rows, count, page, size);
    }
    public async Task<AnnouncementDetail> GetAsync(Guid id)
    {
        RequireAdmin(); var a = await Find(id);
        var targets = await Repository<AnnouncementTarget>().Entities.Where(x => x.AnnouncementId == id).OrderBy(x => x.UserId).Select(x => x.UserId).ToArrayAsync();
        var events = await Repository<AnnouncementEvent>().Entities.Where(x => x.AnnouncementId == id).OrderBy(x => x.OccurredAt).ThenBy(x => x.Id)
            .Select(x => new AnnouncementEventResponse(x.Id, x.ActorId, x.Action, x.OccurredAt)).ToArrayAsync();
        var recipientIds = await Repository<AnnouncementReceipt>().Entities.Where(x => x.AnnouncementId == id).OrderBy(x => x.UserId).Select(x => x.UserId).ToArrayAsync();
        return new(View(a), targets, events, recipientIds);
    }
    public async Task<AnnouncementDetail> CreateAsync(AnnouncementDraftRequest request)
    {
        RequireAdmin(); Validate(request);
        if (request.RequestId == Guid.Empty) throw DomainErrors.Invalid("A request ID is required.");
        var hash = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(new {
            request.Title, request.Body, request.AllActiveUsers, UserIds = request.UserIds.Order().ToArray() }))));
        async Task<Announcement?> Existing() => await Repository<Announcement>().Entities.AsNoTracking()
            .SingleOrDefaultAsync(x => x.AuthorId == UserId && x.CreateRequestId == request.RequestId);
        var existing = await Existing();
        if (existing != null) {
            if (existing.CreateRequestHash != hash) throw DomainErrors.Conflict("The request ID was used with different content.");
            return await GetAsync(existing.Id);
        }
        Guid id;
        try { id = await InTransactionAsync(async () => {
            await ValidateTargets(request);
            var a = new Announcement { Title = request.Title, Body = request.Body, AllActiveUsers = request.AllActiveUsers, AuthorId = UserId,
                CreateRequestId = request.RequestId, CreateRequestHash = hash };
            await Repository<Announcement>().InsertAsync(a);
            foreach (var user in request.UserIds) a.Targets.Add(new() { AnnouncementId = a.Id, UserId = user });
            await UnitOfWork.SaveAsync(); await Recipients(a); await Audit(a.Id, "Created"); await UnitOfWork.SaveAsync(); return a.Id;
        }); }
        catch (DbUpdateException) {
            existing = await Existing();
            if (existing == null || existing.CreateRequestHash != hash) throw;
            id = existing.Id;
        }
        return await GetAsync(id);
    }
    public async Task<AnnouncementDetail> UpdateAsync(Guid id, AnnouncementDraftRequest request)
    {
        RequireAdmin(); Validate(request);
        await InTransactionAsync(async () => {
            var a = await Find(id); RequireVersion(request.ExpectedVersion, a.Version);
            if (a.PublishedAt != null) throw DomainErrors.Conflict("Published announcements cannot be edited.");
            await ValidateTargets(request);
            // A recipient-only edit must also participate in the parent version check.
            a.Version = Guid.NewGuid();
            a.Title = request.Title; a.Body = request.Body; a.AllActiveUsers = request.AllActiveUsers;
            var targets = await Repository<AnnouncementTarget>().Entities.Where(x => x.AnnouncementId == id).ToListAsync();
            foreach (var target in targets.Where(x => !request.UserIds.Contains(x.UserId))) await Repository<AnnouncementTarget>().DeleteAsync(target);
            foreach (var user in request.UserIds.Where(x => targets.All(t => t.UserId != x)))
                await Repository<AnnouncementTarget>().InsertAsync(new() { AnnouncementId = id, UserId = user });
            await Audit(id, "Updated"); await UnitOfWork.SaveAsync(); await Recipients(a); return true;
        });
        return await GetAsync(id);
    }
    public async Task<AnnouncementPreview> PreviewAsync(Guid id, Guid version)
    {
        RequireAdmin(); var a = await Find(id); RequireVersion(version, a.Version);
        if (a.PublishedAt != null) throw DomainErrors.Conflict("Only drafts can be previewed for sending.");
        return new(View(a), (await Recipients(a)).Length);
    }
    public async Task<AnnouncementDetail> PublishAsync(Guid id, AnnouncementPublishRequest request)
    {
        RequireAdmin(); if (request.RequestId == Guid.Empty) throw DomainErrors.Invalid("A request ID is required.");
        await InTransactionAsync(async () => {
            var a = await Find(id);
            if (a.PublishedAt != null)
            {
                if (a.PublishRequestId == request.RequestId && a.PublishedVersion == request.ExpectedVersion && a.PublishedBy == UserId) return true;
                throw DomainErrors.Conflict("This announcement was already published.");
            }
            RequireVersion(request.ExpectedVersion, a.Version);
            if (await Repository<Announcement>().Entities.AnyAsync(x => x.PublishedBy == UserId && x.PublishRequestId == request.RequestId))
                throw DomainErrors.Conflict("The request ID was already used for another announcement.");
            var recipients = await Recipients(a);
            if (recipients.Length == 0) throw DomainErrors.Invalid("There are no eligible recipients.");
            a.PublishedAt = UtcNow; a.PublishedBy = UserId; a.PublishRequestId = request.RequestId;
            a.PublishedVersion = request.ExpectedVersion; a.RecipientCount = recipients.Length;
            foreach (var user in recipients) await Repository<AnnouncementReceipt>().InsertAsync(new() { UserId = user, AnnouncementId = id });
            await Audit(id, "Published"); await UnitOfWork.SaveAsync(); return true;
        });
        return await GetAsync(id);
    }
    public async Task<AnnouncementDetail> RevokeAsync(Guid id, Guid version)
    {
        RequireAdmin();
        await InTransactionAsync(async () => {
            var a = await Find(id);
            if (a.RevokedAt != null) return true;
            RequireVersion(version, a.Version);
            if (a.PublishedAt == null) throw DomainErrors.Conflict("A draft cannot be revoked.");
            a.RevokedAt = UtcNow; a.RevokedBy = UserId; await Audit(id, "Revoked"); await UnitOfWork.SaveAsync(); return true;
        });
        return await GetAsync(id);
    }
    private void Customer() { _ = UserId; if (CurrentUser.IsInRole("Admin")) throw DomainErrors.Forbidden(); }
    private IQueryable<Notification> Reminders() => Repository<Notification>().Entities.Where(x => x.UserId == UserId
        && x.Note.UserId == UserId && x.Note.DeletedTime == null);
    private IQueryable<AnnouncementReceipt> Receipts() => Repository<AnnouncementReceipt>().Entities.Where(x => x.UserId == UserId
        && x.Announcement.PublishedAt != null && x.Announcement.RevokedAt == null);
    public async Task<BasePaginatedList<InboxMessageResponse>> FeedAsync(int page, int size, bool unreadOnly)
    {
        Customer(); ValidatePage(page, size);
        var reminders = Reminders().AsNoTracking().Select(x => new { x.Id, NoteId = (Guid?)x.NoteId, ReminderId = (Guid?)x.ReminderId,
            x.OccurrenceAt, x.ReadAt, Kind = "reminder", Title = "", Body = "" });
        var announcements = Receipts().AsNoTracking().Select(x => new { x.Id, NoteId = (Guid?)null, ReminderId = (Guid?)null,
            OccurrenceAt = x.Announcement.PublishedAt!.Value, x.ReadAt, Kind = "announcement", x.Announcement.Title, x.Announcement.Body });
        var query = reminders.Concat(announcements); if (unreadOnly) query = query.Where(x => x.ReadAt == null);
        var count = await query.CountAsync();
        var rows = await query.OrderByDescending(x => x.OccurrenceAt).ThenBy(x => x.Id).Skip((page - 1) * size).Take(size).ToListAsync();
        return new(rows.Select(x => new InboxMessageResponse(x.Id, x.NoteId, x.ReminderId, x.OccurrenceAt, x.ReadAt, x.Kind, x.Title, x.Body)).ToArray(), count, page, size);
    }
    public async Task<int> CountUnreadAsync() { Customer(); return await Reminders().CountAsync(x => x.ReadAt == null) + await Receipts().CountAsync(x => x.ReadAt == null); }
    public async Task ReadAsync(Guid id)
    {
        Customer();
        await InTransactionAsync(async () => {
            var receipt = await Receipts().SingleOrDefaultAsync(x => x.Id == id);
            if (receipt != null) receipt.ReadAt ??= UtcNow;
            else { var reminder = await Reminders().SingleOrDefaultAsync(x => x.Id == id) ?? throw DomainErrors.NotFound("Notification"); reminder.ReadAt ??= UtcNow; }
            await UnitOfWork.SaveAsync(); return true;
        });
    }
    public async Task<int> ReadAllAsync()
    {
        Customer();
        return await InTransactionAsync(async () => {
            var count = 0;
            while (true) {
                var batch = await Reminders().Where(x => x.ReadAt == null).OrderBy(x => x.Id).Take(500).ToListAsync();
                if (batch.Count == 0) break;
                foreach (var item in batch) item.ReadAt = UtcNow;
                await UnitOfWork.SaveAsync(); count += batch.Count;
            }
            while (true) {
                var batch = await Receipts().Where(x => x.ReadAt == null).OrderBy(x => x.Id).Take(500).ToListAsync();
                if (batch.Count == 0) break;
                foreach (var item in batch) item.ReadAt = UtcNow;
                await UnitOfWork.SaveAsync(); count += batch.Count;
            }
            return count;
        });
    }
}
