using NTC.Contract.Services.Interface;
namespace NTC.API.Jobs;
public sealed class MaintenanceWorker(IServiceScopeFactory scopes, ILogger<MaintenanceWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(30));
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                var started = System.Diagnostics.Stopwatch.StartNew();
                int dispatched, delivered;
                using (var scope = scopes.CreateScope()) dispatched = await scope.ServiceProvider.GetRequiredService<IBackgroundMaintenanceService>().DispatchRemindersAsync(stoppingToken);
                using (var scope = scopes.CreateScope()) delivered = await scope.ServiceProvider.GetRequiredService<IBackgroundMaintenanceService>().DeliverEmailsAsync(stoppingToken);
                using (var scope = scopes.CreateScope()) await scope.ServiceProvider.GetRequiredService<IBackgroundMaintenanceService>().PurgeTrashAsync(stoppingToken);
                using (var scope = scopes.CreateScope()) await scope.ServiceProvider.GetRequiredService<IBackgroundMaintenanceService>().PruneIdentityStateAsync(stoppingToken);
                logger.LogInformation("Maintenance completed in {ElapsedMs}ms; dispatched {Dispatched}; delivered {Delivered}", started.ElapsedMilliseconds, dispatched, delivered);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception ex) { logger.LogError("Maintenance batch failed ({ExceptionType}); retry on next tick.", ex.GetType().Name); }
        }
    }
}
