using NTC.Contract.Repositories.Entities;
using NTC.Repositories.Context;
using NTC.Services.Notes;

namespace NTC.API.Operations;

internal static class DemoNotes
{
    internal static void Add(DatabaseContext database, Guid owner, DateTimeOffset now)
    {
        var personal = new Tag { UserId = owner, Name = "Personal", Color = "#DBEAFE", Icon = "🏠" };
        var work = new Tag { UserId = owner, Name = "Work", Color = "#DCFCE7", Icon = "💼" };
        var ideas = new Tag { UserId = owner, Name = "Ideas", Color = "#FEF3C7", Icon = "💡" };
        database.Tags.AddRange(personal, work, ideas);
        const string welcome = """
            {"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Your private space"}]},{"type":"paragraph","content":[{"type":"text","text":"Welcome to NoteTatCa! ","marks":[{"type":"bold"}]},{"type":"text","text":"Capture ideas, organize labels and make each note your own.","marks":[{"type":"textStyle","attrs":{"color":"#2563EB"}}]}]},{"type":"paragraph","content":[{"type":"text","text":"Try editing this note, changing its color, or dragging another note to reorder your board. 👋"}]}]}
            """;
        const string checklist = """
            {"type":"doc","content":[{"type":"taskList","content":[{"type":"taskItem","attrs":{"checked":true},"content":[{"type":"paragraph","content":[{"type":"text","text":"Sign in to my account"}]}]},{"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph","content":[{"type":"text","text":"Write my first idea"}]}]},{"type":"taskItem","attrs":{"checked":false},"content":[{"type":"paragraph","content":[{"type":"text","text":"Organize notes with labels"}]}]}]}]}
            """;
        Add("Welcome to NoteTatCa", null, welcome, "👋", "#DBEAFE", personal, 1000, pinned: true);
        Add("Getting started checklist", null, checklist, "✅", "#DCFCE7", work, 2000);
        Add("Ideas for the weekend", "Visit a new coffee shop.\nRead a chapter of a favorite book.\nTake a photo walk and collect inspiration.", null, "💡", "#FEF3C7", ideas, 3000);
        Add("", "A quick thought does not need a title. Try searching for inspiration to find this note again.", null, "📝", "#F3E8FF", personal, 4000);
        Add("Restore me from Trash", "This is a sample deleted note. Restore it to the board or delete it permanently. Trash keeps notes for 7 days.", null, "🗑️", "#FCE7F3", personal, 5000, trash: true);

        void Add(string title, string? plain, string? document, string emoji, string color, Tag tag,
            double order, bool pinned = false, bool trash = false)
        {
            var note = new Note { UserId = owner, Title = title, DocumentJson = document,
                Content = ContentRules.PlainText(document, plain), IconEmoji = ContentRules.Emoji(emoji),
                BackgroundColor = ContentRules.Color(color), SortOrder = order, IsPinned = pinned,
                PinnedAt = pinned ? now : null, DeletedTime = trash ? now : null,
                DeletedBy = trash ? owner.ToString() : null };
            note.NoteTags.Add(new NoteTag { NoteId = note.Id, TagId = tag.Id, UserId = owner, Note = note, Tag = tag });
            database.Notes.Add(note);
        }
    }
}
