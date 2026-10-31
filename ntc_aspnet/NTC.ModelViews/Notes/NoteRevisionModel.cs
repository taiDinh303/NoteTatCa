namespace NTC.ModelViews.Notes;

public sealed record NoteRevisionModel(
    Guid Id,
    Guid NoteId,
    Guid SourceVersion,
    DateTimeOffset SavedAt,
    string Title,
    string Content,
    string? DocumentJson,
    int DocumentSchemaVersion,
    string? IconEmoji,
    string? BackgroundColor,
    bool IsCurrent);

public sealed record RestoreNoteRevisionRequest(Guid Version);
