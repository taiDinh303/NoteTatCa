using Microsoft.EntityFrameworkCore;
using NTC.Contract.Repositories.Entities;
using NTC.Contract.Repositories.Entities.Tasks;
using NTC.Contract.Repositories.IUOW;
using NTC.Contract.Services.Interface;
using NTC.Core.Base;
using NTC.Core.Security;
using NTC.ModelViews.Notifications;
using NTC.Services.Shared;
namespace NTC.Services.Service;
public sealed class InboxService(IUnitOfWork work, ICurrentUser actor, TimeProvider clock) : BaseService(work, actor, clock), IInboxService
{
    private IQueryable<Notification> Owned()
    {
        var notes = Repository<Note>().Entities;
        return Repository<Notification>().Entities.Where(x => x.UserId == UserId
            && notes.Any(n => n.Id == x.NoteId && n.UserId == UserId && n.DeletedTime == null));
    }
    public async Task<BasePaginatedList<NotificationResponse>> GetAsync(int page, int size, bool unreadOnly)
    {
        _ = UserId; ValidatePage(page, size); var query = Owned().AsNoTracking(); if (unreadOnly) query = query.Where(x => x.ReadAt == null);
        var count = await query.CountAsync(); var result = await query.OrderByDescending(x => x.OccurrenceAt).ThenBy(x => x.Id).Skip((page - 1) * size).Take(size)
            .Select(x => new NotificationResponse(x.Id, x.NoteId, x.ReminderId, x.OccurrenceAt, x.ReadAt)).ToListAsync();
        return new(result, count, page, size);
    }
    public async Task MarkReadAsync(Guid id)
    { var n = await Owned().FirstOrDefaultAsync(x => x.Id == id) ?? throw DomainErrors.NotFound("Notification"); n.ReadAt ??= UtcNow; await UnitOfWork.SaveAsync(); }
    public Task<int> CountUnreadAsync() { _ = UserId; return Owned().CountAsync(x => x.ReadAt == null); }
    public async Task<int> MarkAllReadAsync()
    {
        return await InTransactionAsync(async () =>
        {
            var count = 0;
            while (true)
            {
                var batch = await Owned().Where(x => x.ReadAt == null).OrderBy(x => x.Id).Take(500).ToListAsync();
                if (batch.Count == 0) return count;
                foreach (var notification in batch) notification.ReadAt = UtcNow;
                await UnitOfWork.SaveAsync(); count += batch.Count;
            }
        });
    }
}
