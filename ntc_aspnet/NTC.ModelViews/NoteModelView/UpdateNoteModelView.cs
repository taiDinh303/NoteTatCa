using System.ComponentModel.DataAnnotations;

namespace NTC.ModelViews.NoteModelView
{
    public class UpdateNoteModelView
    {
        [Required]
        public Guid Id { get; set; }

        [MaxLength(150)]
        public string? Title { get; set; }

        public string Content { get; set; } = string.Empty;
        public string? DocumentJson { get; set; }
        public string? IconEmoji { get; set; }
        public List<Guid>? TagIds { get; set; }
        public Guid? Version { get; set; }
        public Guid? ClientRequestId { get; set; }
        public bool ConvertToPlainText { get; set; }

        //
        public bool IsPinned { get; set; }
        public DateTimeOffset? PinnedAt { get; set; }

        public int Priority { get; set; }
        //
        public string? BackgroundColor { get; set; }

    }
}
