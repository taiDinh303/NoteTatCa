using NTC.Contract.Repositories.Entities.Tasks;
using NTC.ModelViews.ReminderModelView;

namespace NTC.Services.Mappings
{
    public static class ReminderMapping
    {
        // 🔹 Mapping Reminder -> ReminderResponseModelView
        public static ReminderResponseModelView ToViewModel(this Reminder reminder)
        {
            if (reminder == null)
                throw new ArgumentNullException(nameof(reminder));

            var model = new ReminderResponseModelView
            {
                Id = reminder.Id,
                NoteId = reminder.NoteId,

                ReminderAt = reminder.ReminderAt,
                RepeatType = reminder.RepeatType,
                RepeatInterval = reminder.RepeatInterval,
                RepeatDays = reminder.RepeatDays,

                RepeatUntil = reminder.RepeatUntil,
                RepeatCount = reminder.RepeatCount,

                IsActive = reminder.IsActive,

                // optional display
                NoteTitle = reminder.Note?.Title,

                // Audit
                CreatedBy = reminder.CreatedBy,
                CreatedTime = reminder.CreatedTime,
                LastUpdatedBy = reminder.LastUpdatedBy,
                LastUpdatedTime = reminder.LastUpdatedTime
            };

            return model;
        }

        // 🔹 Mapping List<Reminder> -> List<ReminderResponseModelView>
        public static List<ReminderResponseModelView> ToViewModelList(this IEnumerable<Reminder> reminders)
        {
            if (reminders == null)
                return new List<ReminderResponseModelView>();

            return reminders
                .Where(x => x != null)
                .Select(x => x.ToViewModel())
                .ToList();
        }

        // 🔹 Mapping ReminderResponseModelView -> Reminder
        public static Reminder ToEntity(this ReminderResponseModelView model)
        {
            if (model == null)
                throw new ArgumentNullException(nameof(model));

            var entity = new Reminder
            {
                Id = model.Id,
                NoteId = model.NoteId,

                ReminderAt = model.ReminderAt,
                RepeatType = model.RepeatType,
                RepeatInterval = model.RepeatInterval,
                RepeatDays = model.RepeatDays,

                RepeatUntil = model.RepeatUntil,
                RepeatCount = model.RepeatCount,

                IsActive = model.IsActive,

                // Audit
                CreatedBy = model.CreatedBy,
                CreatedTime = model.CreatedTime,
                LastUpdatedBy = model.LastUpdatedBy,
                LastUpdatedTime = model.LastUpdatedTime
            };

            return entity;
        }

        // 🔹 Mapping CreateReminderModelView -> Reminder
        public static Reminder ToEntity(this CreateReminderModelView model)
        {
            if (model == null)
                throw new ArgumentNullException(nameof(model));

            return new Reminder
            {
                NoteId = model.NoteId,

                ReminderAt = model.ReminderAt,
                RepeatType = model.RepeatType,
                RepeatInterval = model.RepeatInterval,
                RepeatDays = model.RepeatDays,

                RepeatUntil = model.RepeatUntil,
                RepeatCount = model.RepeatCount,

                IsActive = true
            };
        }

        // 🔹 Mapping UpdateReminderModelView -> Reminder (update fields only)
        public static void ToEntity(this UpdateReminderModelView model, Reminder reminder)
        {
            if (model == null)
                throw new ArgumentNullException(nameof(model));

            if (reminder == null)
                throw new ArgumentNullException(nameof(reminder));

            reminder.ReminderAt = model.ReminderAt;
            reminder.RepeatType = model.RepeatType;
            reminder.RepeatInterval = model.RepeatInterval;
            reminder.RepeatDays = model.RepeatDays;

            reminder.RepeatUntil = model.RepeatUntil;
            reminder.RepeatCount = model.RepeatCount;

            reminder.IsActive = model.IsActive;
        }
    }
}