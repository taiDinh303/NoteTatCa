using NTC.ModelViews.TagModelView;
using NTC.ModelViews.ReminderModelView;

namespace NTC.ModelViews.NoteModelView
{
    public class NoteResponseModelView
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }

        public string? Title { get; set; }
        public string Content { get; set; } = string.Empty;
        public string? DocumentJson { get; set; }
        public int DocumentSchemaVersion { get; set; }
        public string? IconEmoji { get; set; }
        public Guid Version { get; set; }

        public bool IsPinned { get; set; }
        public DateTimeOffset? PinnedAt { get; set; }
        public int Priority { get; set; }

        public string? BackgroundColor { get; set; }

        public double SortOrder { get; set; }

        // When true this item came from a list projection: the rich document is
        // intentionally omitted (DocumentJson is null) to keep list payloads small.
        // The full document is fetched on demand via GET /notes/{id} (detail-on-open).
        public bool Preview { get; set; }

        // Cheap derived flag so list cards can keep the checklist preview styling
        // without shipping the full rich document.
        public bool HasTaskList { get; set; }


        // Navigation
        public List<TagResponseModelView> Tags { get; set; } = new();

        public List<ReminderResponseModelView> Reminders { get; set; } = new();


        // Audit
        public string? CreatedBy { get; set; }
        public DateTimeOffset CreatedTime { get; set; }
        public string? LastUpdatedBy { get; set; }
        public DateTimeOffset LastUpdatedTime { get; set; }
        public DateTimeOffset? DeletedTime { get; set; }

    }
}
