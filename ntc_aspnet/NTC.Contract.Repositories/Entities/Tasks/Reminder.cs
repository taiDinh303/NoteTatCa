using NTC.Core.Base;

namespace NTC.Contract.Repositories.Entities.Tasks
{
    public class Reminder : BaseEntity
    {
        public Guid NoteId { get; set; }

        // The reminder start time (also the first occurrence).
        public DateTimeOffset ReminderAt { get; set; }

        // The recurrence type.
        public RepeatType RepeatType { get; set; } = RepeatType.None;

        // For example: every 2 weeks, every 3 days, etc.
        public int RepeatInterval { get; set; } = 1;

        // Used for weekly recurrence (selected days of the week).
        public WeekDays? RepeatDays { get; set; }

        // Recurrence end date.
        public DateTimeOffset? RepeatUntil { get; set; }

        // Maximum recurrence count.
        public int? RepeatCount { get; set; }



        public virtual Note? Note { get; set; }

        public bool IsActive { get; set; } = true;
        public string TimeZoneId { get; set; } = "Asia/Ho_Chi_Minh";
        public DateTimeOffset? NextOccurrenceAt { get; set; }
        public int OccurrencesProcessed { get; set; }
        public bool SendEmail { get; set; } = true;
        public ICollection<Notification> Notifications { get; set; } = new HashSet<Notification>();
        public ICollection<ReminderDelivery> Deliveries { get; set; } = new HashSet<ReminderDelivery>();
    }

    public enum RepeatType
    {
        None = 0,
        Daily = 1,
        Weekly = 2,
        Monthly = 3,
        Yearly = 4
    }

    // Flag enum for selecting multiple days of the week.
    [Flags]
    public enum WeekDays
    {
        None = 0,
        Monday = 1,
        Tuesday = 2,
        Wednesday = 4,
        Thursday = 8,
        Friday = 16,
        Saturday = 32,
        Sunday = 64
    }
}
