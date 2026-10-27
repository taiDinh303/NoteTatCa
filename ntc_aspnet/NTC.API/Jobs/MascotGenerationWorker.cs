using Microsoft.Extensions.Options;
using NTC.Services.Mascots;
namespace NTC.API.Jobs;
public sealed class MascotGenerationWorker(IServiceScopeFactory scopes, IOptions<MascotAiOptions> options,
    ILogger<MascotGenerationWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!options.Value.Available) return;
        while (!stoppingToken.IsCancellationRequested)
        {
            var worked = false;
            try
            {
                using var scope = scopes.CreateScope();
                worked = await scope.ServiceProvider.GetRequiredService<MascotGenerationProcessor>().ProcessNextAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception) { logger.LogWarning("Mascot worker could not process the queue; check schema and service availability."); }
            if (!worked) await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
        }
    }
}
