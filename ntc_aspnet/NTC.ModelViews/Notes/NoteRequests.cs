using System.ComponentModel.DataAnnotations;
using NTC.ModelViews.NoteModelView;
namespace NTC.ModelViews.Notes;

public sealed class SaveNoteRequest
{
    [MaxLength(150)] public string? Title { get; set; }
    public string Content { get; set; } = string.Empty;
    public string? DocumentJson { get; set; }
    public string? IconEmoji { get; set; }
    public string? BackgroundColor { get; set; }
    public bool IsPinned { get; set; }
    public List<Guid>? TagIds { get; set; }
    public Guid? Version { get; set; }
    public CreateNoteModelView ToCreate(Guid? key) => new() { Title = Title, Content = Content, DocumentJson = DocumentJson,
        IconEmoji = IconEmoji, BackgroundColor = BackgroundColor, IsPinned = IsPinned, TagIds = TagIds, ClientRequestId = key };
    public UpdateNoteModelView ToUpdate(Guid id) => new() { Id = id, Title = Title, Content = Content, DocumentJson = DocumentJson,
        IconEmoji = IconEmoji, BackgroundColor = BackgroundColor, IsPinned = IsPinned, TagIds = TagIds, Version = Version };
}
public sealed class PinNoteRequest { public bool IsPinned { get; set; } public Guid Version { get; set; } }
public sealed class PatchNoteRequest
{
    public string? Title { get; set; }
    public string? Content { get; set; }
    public string? DocumentJson { get; set; }
    public string? IconEmoji { get; set; }
    public string? BackgroundColor { get; set; }
    public bool? IsPinned { get; set; }
    public List<Guid>? TagIds { get; set; }
    public Guid Version { get; set; }
    public bool ConvertToPlainText { get; set; }
}
