using NTC.Core.Base;

namespace NTC.Contract.Repositories.Entities.Tasks;

// Immutable content snapshot captured before a successful note edit or restore.
public sealed class NoteRevision : BaseEntity
{
    public Guid NoteId { get; set; }
    public Guid UserId { get; set; }
    public Guid SourceVersion { get; set; }
    public DateTimeOffset SavedAt { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string? DocumentJson { get; set; }
    public int DocumentSchemaVersion { get; set; } = 1;
    public string? IconEmoji { get; set; }
    public string? BackgroundColor { get; set; }
    public Note Note { get; set; } = null!;
}
