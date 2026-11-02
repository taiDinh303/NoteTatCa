using NTC.Contract.Repositories.Entities;
using NTC.Core.Base;
using NTC.ModelViews.NoteModelView;
using NTC.ModelViews.Notes;

namespace NTC.Contract.Services.Interface
{
    public interface INoteService
    {
        Task<BasePaginatedList<NoteResponseModelView>> GetAllAsync(int pageNumber, int pageSize);
        Task<BasePaginatedList<NoteResponseModelView>> GetByTagAsync(Guid? tagId, int pageNumber, int pageSize);
        Task<BasePaginatedList<NoteResponseModelView>> GetTrashAsync(int pageNumber, int pageSize);
        Task<BasePaginatedList<NoteResponseModelView>> GetByReminderAsync(int pageNumber, int pageSize);
        Task<NoteResponseModelView> GetByIdAsync(Guid id);
        Task <Note>CreateAsync(CreateNoteModelView model);
        Task UpdateAsync(UpdateNoteModelView model);
        Task SoftDeleteAsync(Guid id);
        Task RestoreAsync(Guid id);
        Task DeleteAsync(Guid id);
        Task TogglePinAsync(Guid id);

        Task ReorderAsync(ReorderNoteModelView model);
        Task<BasePaginatedList<NoteResponseModelView>> QueryAsync(int page, int size, string? search = null, Guid? tagId = null, bool trash = false, bool? pinned = null, bool hasReminder = false);
        Task SetPinnedAsync(Guid id, bool pinned, Guid version);
        Task<BasePaginatedList<NoteRevisionModel>> QueryRevisionsAsync(Guid id, int page, int size);
        Task RestoreRevisionAsync(Guid id, Guid revisionId, Guid expectedVersion);
    }

}
