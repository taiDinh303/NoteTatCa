using NTC.Contract.Repositories.Entities;
using NTC.Core.Base;
using NTC.ModelViews.NoteModelView;

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
    }

}
