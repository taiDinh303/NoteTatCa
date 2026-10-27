using NTC.Contract.Repositories.Entities.Tasks;
namespace NTC.Contract.Repositories;
public interface IMascotGenerationStore
{
    Task<MascotGeneration?> LatestAsync(Guid userId, CancellationToken token);
    Task<MascotGeneration?> OwnedAsync(Guid userId, Guid id, CancellationToken token);
    Task<MascotGeneration?> CurrentSlotAsync(Guid userId, CancellationToken token);
    Task<MascotGeneration?> OptionalSlotAsync(Guid userId, CancellationToken token);
    Task<bool> ReserveAsync(MascotGeneration item, CancellationToken token);
    Task<MascotGeneration?> ClaimAsync(DateTimeOffset now, CancellationToken token);
    Task CompleteAsync(Guid id, byte[] directions, byte[] reactions, DateTimeOffset now, CancellationToken token);
    Task FailAsync(Guid id, string code, DateTimeOffset now, CancellationToken token);
    Task ExpireAsync(DateTimeOffset now, CancellationToken token);
    Task<bool> ApplyAsync(Guid userId, Guid id, byte[] directionsWebp, byte[] reactionsWebp, DateTimeOffset now, CancellationToken token);
    Task<bool> DeleteSlotAsync(Guid userId, Guid id, CancellationToken token);
}
