using System.ComponentModel.DataAnnotations;
using NTC.Contract.Repositories.Entities.Tasks;

namespace NTC.ModelViews.ReminderModelView
{
    public class CreateReminderModelView
    {
        [Required]
        public Guid NoteId { get; set; }

        [Required]
        public DateTimeOffset ReminderAt { get; set; }

        public RepeatType RepeatType { get; set; } = RepeatType.None;

        public int RepeatInterval { get; set; } = 1;

        // chỉ dùng khi Weekly
        public WeekDays? RepeatDays { get; set; }

        public DateTimeOffset? RepeatUntil { get; set; }

        public int? RepeatCount { get; set; }

    }
}
