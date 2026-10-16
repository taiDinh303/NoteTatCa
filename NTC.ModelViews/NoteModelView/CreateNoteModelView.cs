using System.ComponentModel.DataAnnotations;

namespace NTC.ModelViews.NoteModelView
{
    public class CreateNoteModelView
    {
        [Required]
        public Guid UserId { get; set; }

        [MaxLength(150)]
        public string? Title { get; set; }

        public string Content { get; set; } = string.Empty;

        public DateTimeOffset? DueDate { get; set; }
        public bool IsPinned { get; set; }
        public int Priority { get; set; } = 1;

        public string? BackgroundColor { get; set; }

        public double SortOrder { get; set; } = -99;
    }
   
}
