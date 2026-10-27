using NTC.Contract.Repositories;
using NTC.Contract.Services.Interface;
namespace NTC.Services.Mascots;

public sealed class MascotGenerationProcessor(IMascotGenerationStore store, IMascotImageGenerator generator, TimeProvider clock)
{
    public async Task<bool> ProcessNextAsync(CancellationToken token)
    {
        await store.ExpireAsync(clock.GetUtcNow(), token);
        var job = await store.ClaimAsync(clock.GetUtcNow(), token);
        if (job is null) return false;
        using var deadline = CancellationTokenSource.CreateLinkedTokenSource(token);
        deadline.CancelAfter(TimeSpan.FromMinutes(10));
        try
        {
            var images = await generator.GenerateAsync(job.UserId, job.Description, job.ReferenceImage, deadline.Token);
            await store.CompleteAsync(job.Id, images.Directions, images.Reactions, clock.GetUtcNow(), deadline.Token);
        }
        catch (Exception error)
        {
            var code = error is MascotProviderException provider ? provider.Code
                : error is OperationCanceledException ? "INTERRUPTED" : "GENERATION_FAILED";
            using var cleanup = new CancellationTokenSource(TimeSpan.FromSeconds(10));
            await store.FailAsync(job.Id, code, clock.GetUtcNow(), cleanup.Token);
            // Deliberately do not log exceptions: upstream errors may contain private data.
        }
        return true;
    }
}
