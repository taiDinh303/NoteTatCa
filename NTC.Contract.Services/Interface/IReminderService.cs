using NTC.Contract.Repositories.Entities.Tasks;
using NTC.Core.Base;
using NTC.ModelViews.ReminderModelView;

namespace NTC.Contract.Services.Interface
{
    public interface IReminderService
    {
        Task<BasePaginatedList<ReminderResponseModelView>> GetAllAsync(int pageNumber, int pageSize);

        Task<ReminderResponseModelView> GetByIdAsync(Guid id);

        Task<List<ReminderResponseModelView>> GetByNoteIdAsync(Guid noteId);

        Task<Reminder> CreateAsync(CreateReminderModelView model);

        Task UpdateAsync(UpdateReminderModelView model);

        Task DeleteAsync(Guid id);

        Task SoftDeleteAsync(Guid id);
    }
}