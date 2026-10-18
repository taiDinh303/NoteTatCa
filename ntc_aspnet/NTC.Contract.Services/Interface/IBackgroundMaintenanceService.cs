namespace NTC.Contract.Services.Interface;

public interface IBackgroundMaintenanceService
{
    Task<int> DispatchRemindersAsync(CancellationToken cancellationToken = default);
    Task<int> DeliverEmailsAsync(CancellationToken cancellationToken = default);
    Task<int> PurgeTrashAsync(CancellationToken cancellationToken = default);
    Task<int> PruneIdentityStateAsync(CancellationToken cancellationToken = default);
}
