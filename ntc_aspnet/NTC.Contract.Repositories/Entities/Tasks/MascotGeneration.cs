namespace NTC.Contract.Repositories.Entities.Tasks;

// Separate from note content. The quota reservation survives restarts and tab retries.
public sealed class MascotGeneration
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public Guid RequestId { get; set; }
    public string QuotaDay { get; set; } = "";
    public string State { get; set; } = "queued";
    public bool OccupiesSlot { get; set; }
    public Guid? ReplacesId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset? StartedAt { get; set; }
    public DateTimeOffset? FinishedAt { get; set; }
    public string Description { get; set; } = "";
    public byte[]? ReferenceImage { get; set; }
    public byte[]? DirectionsPng { get; set; }
    public byte[]? ReactionsPng { get; set; }
    public byte[]? SavedDirectionsWebp { get; set; }
    public byte[]? SavedReactionsWebp { get; set; }
    public string? ErrorCode { get; set; }
}
