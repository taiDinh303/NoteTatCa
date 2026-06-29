using NTC.Contract.Repositories.Entities;
using NTC.Core.Base;
using NTC.ModelViews.TagModelView;

namespace NTC.Contract.Services.Interface
{
    public interface ITagService
    {
        Task<BasePaginatedList<TagResponseModelView>> GetAllAsync(int pageNumber, int pageSize);
        Task<TagResponseModelView> GetByIdAsync(Guid id);
        Task<Tag> CreateAsync(CreateTagModelView model);
        Task UpdateAsync(UpdateTagModelView model);
        Task DeleteAsync(Guid id);
        Task SoftDeleteAsync(Guid id);
    }
}
