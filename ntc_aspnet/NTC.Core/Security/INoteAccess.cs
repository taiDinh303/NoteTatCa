namespace NTC.Core.Security;
public interface INoteAccess { bool HiddenNotesUnlocked { get; set; } }
public sealed class NoteAccess : INoteAccess { public bool HiddenNotesUnlocked { get; set; } }
