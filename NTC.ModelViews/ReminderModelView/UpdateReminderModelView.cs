using System.ComponentModel.DataAnnotations;
using NTC.Contract.Repositories.Entities.Tasks;

namespace NTC.ModelViews.ReminderModelView
{
    public class UpdateReminderModelView
    {

        [Required]
        public Guid Id { get; set; }

        [Required]
        public DateTimeOffset ReminderAt { get; set; }

        public RepeatType RepeatType { get; set; }

        public int RepeatInterval { get; set; }

        public WeekDays? RepeatDays { get; set; }

        public DateTimeOffset? RepeatUntil { get; set; }

        public int? RepeatCount { get; set; }

        public bool IsActive { get; set; }
    }
}
