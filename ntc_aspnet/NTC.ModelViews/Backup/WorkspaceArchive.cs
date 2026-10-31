using NTC.Contract.Repositories.Entities.Tasks;

namespace NTC.ModelViews.Backup;

public sealed class WorkspaceArchive
{
    public const string FormatName = "notetatca-workspace";
    public string Format { get; set; } = FormatName;
    public int SchemaVersion { get; set; } = 1;
    public DateTimeOffset ExportedAt { get; set; }
    public List<ArchiveLabel> Labels { get; set; } = [];
    public List<ArchiveNote> Notes { get; set; } = [];
}

public sealed record ArchiveLabel(Guid Id, string Name, string? Color, string? Icon);
public sealed record ArchiveReminder(DateTimeOffset ReminderAt, string TimeZoneId,
    bool SendEmail, RepeatType RepeatType, int RepeatInterval, WeekDays? RepeatDays,
    DateTimeOffset? RepeatUntil, int? RepeatCount, bool IsActive);
public sealed record ArchiveRevision(Guid SourceVersion, DateTimeOffset SavedAt,
    string Title, string Content, string? DocumentJson, int DocumentSchemaVersion,
    string? IconEmoji, string? BackgroundColor);
public sealed class ArchiveNote
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public string? DocumentJson { get; set; }
    public int DocumentSchemaVersion { get; set; } = 1;
    public string? IconEmoji { get; set; }
    public string? BackgroundColor { get; set; }
    public bool IsPinned { get; set; }
    public DateTimeOffset? PinnedAt { get; set; }
    public int Priority { get; set; } = 1;
    public double SortOrder { get; set; }
    public bool InTrash { get; set; }
    public DateTimeOffset CreatedTime { get; set; }
    public DateTimeOffset LastUpdatedTime { get; set; }
    public List<Guid> LabelIds { get; set; } = [];
    public List<ArchiveReminder> Reminders { get; set; } = [];
    public List<ArchiveRevision> Revisions { get; set; } = [];
}

public sealed record ImportArchiveResult(int Notes, int Labels, int Reminders, int Revisions);
