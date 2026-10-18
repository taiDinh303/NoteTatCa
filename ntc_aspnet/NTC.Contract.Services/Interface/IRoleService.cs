using NTC.Core.Base;
using NTC.ModelViews.RoleModelView;

namespace NTC.Contract.Services.Interface
{
    public interface IRoleService
    {
        Task<BasePaginatedList<RoleResponseModelView>> GetAllAsync(int pageNumber, int pageSize);
        Task<RoleResponseModelView> GetByIdAsync(Guid id);
        Task<NTC.Contract.Repositories.Entities.ApplicationRole> CreateAsync(CreateRoleModelView role);
        Task PatchAsync(Guid id, PatchRoleRequest request);
        Task UpdateAsync(UpdateRoleModelView role);
        Task DeleteAsync(Guid id);
        Task SoftDeleteAsync(Guid id);
    }
}
