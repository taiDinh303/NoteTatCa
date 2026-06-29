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
        public string? Title { get; set; }

        public string Content { get; set; } = string.Empty;

        // Todo behavior
        public bool IsCompleted { get; set; }
        public DateTimeOffset? DueDate { get; set; }
        public DateTimeOffset? CompletedAt { get; set; }



        // UI / UX
        public bool IsPinned { get; set; }
        public DateTimeOffset? PinnedAt { get; set; }
        public int Priority { get; set; } = 1;

        //
        public string? BackgroundColor { get; set; }
        //
        public int SortOrder { get; set; } = -99;


        // Navigation
        public virtual ICollection<NoteTag> NoteTags { get; set; } = new HashSet<NoteTag>();
        public virtual ICollection<Reminder> Reminders { get; set; } = new HashSet<Reminder>();

    }
}
