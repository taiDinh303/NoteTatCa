using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using NTC.Contract.Repositories.Entities.Tasks;
using NTC.Core.Base;

namespace NTC.Contract.Repositories.Entities
{
    public class Note : BaseEntity
    {
        // Owner
        public Guid UserId { get; set; }

        [ForeignKey(nameof(UserId))]
        public virtual ApplicationUser? User { get; set; }

        // Content
        [MaxLength(150)]
        public string Title { get; set; } = string.Empty;

        public string Content { get; set; } = string.Empty;
        public string? DocumentJson { get; set; }
        public int DocumentSchemaVersion { get; set; } = 1;
        public string? IconEmoji { get; set; }
        public Guid? CreateRequestId { get; set; }
        public string? CreateRequestHash { get; set; }


        // UI / UX
        public bool IsPinned { get; set; }
        public DateTimeOffset? PinnedAt { get; set; }
        public int Priority { get; set; } = 1;

        //
        public string? BackgroundColor { get; set; }
        //
        public double SortOrder { get; set; }


        // Navigation
        public virtual ICollection<NoteTag> NoteTags { get; set; } = new HashSet<NoteTag>();
        public virtual ICollection<Reminder> Reminders { get; set; } = new HashSet<Reminder>();
        public virtual ICollection<Notification> Notifications { get; set; } = new HashSet<Notification>();
        public virtual ICollection<ReminderDelivery> ReminderDeliveries { get; set; } = new HashSet<ReminderDelivery>();

    }
}
