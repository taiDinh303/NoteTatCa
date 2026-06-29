using Microsoft.Data.SqlClient;
using NTC.Contract.Repositories.Entities;
using NTC.ModelViews.TagModelView;
using NTC.ModelViews.NoteModelView;

namespace NTC.Services.Mappings
{
    public static class NoteMapping
    {
        // 🔹 Mapping Note -> NoteResponseModelView
        public static NoteResponseModelView ToViewModel(this Note note)
        {
            if (note == null)
                throw new ArgumentNullException(nameof(note));

            var model = new NoteResponseModelView
            {
                Id = note.Id,
                UserId = note.UserId,

                Title = note.Title,
                Content = note.Content,

                IsCompleted = note.IsCompleted,
                DueDate = note.DueDate,
                CompletedAt = note.CompletedAt,

                IsPinned = note.IsPinned,
                Priority = note.Priority,

                //
                SortOrder = note.SortOrder,
                BackgroundColor = note.BackgroundColor,

                Tags = note.NoteTags?
                            .Select(nc => nc.Tag)
                            .Where(c => c != null)
                            .Select(c => new TagResponseModelView
                            {
                                Id = c.Id,
                                Name = c.Name,
                                Color = c.Color,
                                Icon = c.Icon
                            })
                            .ToList() ?? new(),

                Reminders = note.Reminders?.ToViewModelList() ?? new(),

                //



                // Audit
                CreatedBy = note.CreatedBy,
                CreatedTime = note.CreatedTime,
                LastUpdatedBy = note.LastUpdatedBy,
                LastUpdatedTime = note.LastUpdatedTime
            };

            return model;
        }

        // 🔹 Mapping List<Note> -> List<NoteResponseModelView>
        public static List<NoteResponseModelView> ToViewModelList(this IEnumerable<Note> notes)
        {
            if (notes == null)
                return new List<NoteResponseModelView>();

            return notes
                .Where(x => x != null)
                .Select(x => x.ToViewModel())
                .ToList();
        }

        // 🔹 Mapping NoteResponseModelView -> Note
        public static Note ToEntity(this NoteResponseModelView model)
        {
            if (model == null)
                throw new ArgumentNullException(nameof(model));

            var entity = new Note
            {
                Id = model.Id,
                UserId = model.UserId,

                Title = model.Title,
                Content = model.Content ?? string.Empty,

                IsCompleted = model.IsCompleted,
                DueDate = model.DueDate,
                CompletedAt = model.CompletedAt,

                IsPinned = model.IsPinned,
                Priority = model.Priority,

                //
                BackgroundColor = model.BackgroundColor,
                SortOrder = model.SortOrder,

                // Audit
                CreatedBy = model.CreatedBy,
                CreatedTime = model.CreatedTime,
                LastUpdatedBy = model.LastUpdatedBy,
                LastUpdatedTime = model.LastUpdatedTime
            };

            return entity;
        }

        // 🔹 Mapping CreateNoteModelView -> Note
        public static Note ToEntity(this CreateNoteModelView model)
        {
            if (model == null)
                throw new ArgumentNullException(nameof(model));

            return new Note
            {
                UserId = model.UserId,
                Title = model.Title?.Trim() ?? string.Empty,
                Content = model.Content ?? string.Empty,
                DueDate = model.DueDate,
                Priority = model.Priority,
                IsPinned = model.IsPinned,
                IsCompleted = false,

                //
                BackgroundColor = model.BackgroundColor,
                SortOrder = model.SortOrder
            };
        }

        // 🔹 Mapping UpdateNoteModelView -> Note (update fields only)
        public static void ToEntity(this UpdateNoteModelView model, Note note)
        {
            if (model == null)
                throw new ArgumentNullException(nameof(model));

            if (note == null)
                throw new ArgumentNullException(nameof(note));

            note.Title = model.Title ?? string.Empty;
            note.Content = model.Content ?? string.Empty;
            note.DueDate = model.DueDate;
            note.IsPinned = model.IsPinned;
            note.Priority = model.Priority;
            note.IsCompleted = model.IsCompleted;

            if (model.IsCompleted && note.CompletedAt == null)
                note.CompletedAt = DateTime.UtcNow;

            if (!model.IsCompleted)
                note.CompletedAt = null;

            //
            note.BackgroundColor = model.BackgroundColor;
            note.SortOrder = model.SortOrder;
        }
    }
}
