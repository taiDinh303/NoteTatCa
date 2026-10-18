using NTC.Contract.Repositories.IUOW;
using NTC.Core.Base;
using NTC.Core.Security;
using NTC.Contract.Repositories.Entities.Identity;

namespace NTC.Services.Shared;

public abstract class BaseService(IUnitOfWork unitOfWork, ICurrentUser currentUser, TimeProvider clock)
{
    protected IUnitOfWork UnitOfWork { get; } = unitOfWork;
    protected ICurrentUser CurrentUser { get; } = currentUser;
    protected TimeProvider Clock { get; } = clock;
    protected DateTimeOffset UtcNow => Clock.GetUtcNow();
    protected IGenericRepository<T> Repository<T>() where T : class => UnitOfWork.GetRepository<T>();
    protected Guid UserId => CurrentUser.IsAuthenticated && CurrentUser.UserId is { } id && id != Guid.Empty
        ? id : throw DomainErrors.Unauthorized();
    protected void RequireSelf(Guid id) { if (id != UserId) throw DomainErrors.NotFound(); }
    protected void RequireAdmin() { _ = UserId; if (!CurrentUser.IsInRole("Admin")) throw DomainErrors.Forbidden(); }
    protected static void RequireVersion(Guid expected, Guid current)
    {
        if (expected == Guid.Empty) throw DomainErrors.Invalid("A version is required when saving.");
        if (expected != current) throw DomainErrors.Conflict();
    }
    protected Task RecordAdministrativeActionAsync(AdministrativeAction action, Guid? targetUserId = null, Guid? roleId = null)
    {
        RequireAdmin();
        return Repository<AdministrativeAuditEvent>().InsertAsync(new()
        { ActorUserId = UserId, TargetUserId = targetUserId, RoleId = roleId, Action = action, OccurredAt = UtcNow });
    }
    protected static void ValidatePage(int page, int size)
    {
        if (page < 1 || size is < 1 or > 100 || (long)(page - 1) * size > int.MaxValue)
            throw DomainErrors.Invalid("pageNumber must be positive and pageSize between 1 and 100.");
    }
    protected async Task<T> InTransactionAsync<T>(Func<Task<T>> operation)
    {
        await UnitOfWork.BeginTransactionAsync();
        try { var result = await operation(); await UnitOfWork.CommitTransactionAsync(); return result; }
        catch { await UnitOfWork.RollBackAsync(); throw; }
    }
}
