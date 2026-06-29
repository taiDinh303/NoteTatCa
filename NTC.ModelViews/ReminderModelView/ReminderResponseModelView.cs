using NTC.Contract.Repositories.Entities.Tasks;

namespace NTC.ModelViews.ReminderModelView
{
    public class ReminderResponseModelView
    {
        public Guid Id { get; set; }

        public Guid NoteId { get; set; }

        public DateTimeOffset ReminderAt { get; set; }

        public RepeatType RepeatType { get; set; }

        public int RepeatInterval { get; set; }

        public WeekDays? RepeatDays { get; set; }

        public DateTimeOffset? RepeatUntil { get; set; }

        public int? RepeatCount { get; set; }

        public bool IsActive { get; set; }

        // optional hiển thị
        public string? NoteTitle { get; set; }

        // Audit
        public string? CreatedBy { get; set; }
        public DateTimeOffset CreatedTime { get; set; }
        public string? LastUpdatedBy { get; set; }
        public DateTimeOffset LastUpdatedTime { get; set; }

    }
}
