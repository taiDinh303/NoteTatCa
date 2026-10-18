using Microsoft.EntityFrameworkCore;
using NTC.Contract.Repositories.Entities.Identity;
using NTC.Contract.Repositories.IUOW;
using NTC.Contract.Services.Interface;
using NTC.Core.Base;
using NTC.Core.Security;
using NTC.ModelViews.AuthModelView;
using NTC.Services.Shared;

namespace NTC.Services.Service;

public sealed class SessionService(IUnitOfWork work, ICurrentUser actor, TimeProvider clock)
    : BaseService(work, actor, clock), ISessionService
{
    public async Task<BasePaginatedList<SessionResponse>> GetAsync(int page, int size)
    {
        _ = UserId; ValidatePage(page, size); var now = UtcNow; var sid = CurrentUser.SessionId;
        var query = Repository<RefreshSession>().Entities.AsNoTracking().Where(x => x.UserId == UserId && x.RevokedAt == null && x.ExpiresAt > now);
        var count = await query.CountAsync();
        var rows = await query.OrderByDescending(x => x.CreatedAt).ThenBy(x => x.Id).Skip((page - 1) * size).Take(size)
            .Select(x => new SessionResponse(x.Id, x.CreatedAt, x.ExpiresAt, x.Id == sid)).ToListAsync();
        return new(rows, count, page, size);
    }
    public async Task RevokeAsync(Guid sessionId)
    {
        await InTransactionAsync(async () =>
        {
            var selected = await Repository<RefreshSession>().Entities.FirstOrDefaultAsync(x => x.Id == sessionId && x.UserId == UserId)
                ?? throw DomainErrors.NotFound("Session");
            foreach (var session in await Repository<RefreshSession>().Entities.Where(x => x.UserId == UserId && x.FamilyId == selected.FamilyId && x.RevokedAt == null).ToListAsync())
                session.RevokedAt = UtcNow;
            await UnitOfWork.SaveAsync(); return true;
        });
    }
}
