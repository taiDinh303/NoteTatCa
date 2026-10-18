namespace NTC.Contract.Services.Interface
{
    public interface INoteTagService
    {
        Task AddTagToNoteAsync(Guid noteId, Guid tagId);
        Task RemoveTagFromNoteAsync(Guid noteId, Guid tagId);

        Task RemoveTagFromAllNotesAsync(Guid tagId);

        Task RemoveAllTagsFromNoteAsync(Guid noteId);
    }
}
