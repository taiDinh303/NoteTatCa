using NTC.Contract.Repositories.Entities.Tasks;

namespace NTC.ModelViews.ReminderModelView
{
    public class ReminderResponseModelView
    {
        public Guid Id { get; set; }

        public Guid NoteId { get; set; }

        public DateTimeOffset ReminderAt { get; set; }
        public string? TimeZoneId { get; set; }
        public bool SendEmail { get; set; } = true;

        public RepeatType RepeatType { get; set; }

        public int RepeatInterval { get; set; }

        public WeekDays? RepeatDays { get; set; }

        public DateTimeOffset? RepeatUntil { get; set; }

        public int? RepeatCount { get; set; }

        public Guid Version { get; set; }
        public DateTimeOffset? NextOccurrenceAt { get; set; }
        public bool IsActive { get; set; }

        // optional hiển thị
        public string? NoteTitle { get; set; }
        public string? NotePreview { get; set; }
        public string? NoteColor { get; set; }

        // Audit
        public string? CreatedBy { get; set; }
        public DateTimeOffset CreatedTime { get; set; }
        public string? LastUpdatedBy { get; set; }
        public DateTimeOffset LastUpdatedTime { get; set; }

    }
}
