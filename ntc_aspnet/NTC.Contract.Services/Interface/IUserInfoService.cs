using NTC.Core.Base;
using NTC.ModelViews.UserInfoModelView;

namespace NTC.Contract.Services.Interface
{
    public interface IUserInfoService
    {
        Task<BasePaginatedList<UserInfoResponseModelView>> GetAllAsync(int pageNumber, int pageSize);
        Task<UserInfoResponseModelView> GetByIdAsync(Guid id);
        Task CreateAsync(CreateUserInfoModelView model);
        Task UpdateAsync(UpdateUserInfoModelView user);
        Task<UserInfoResponseModelView?> GetCurrentAsync();
        Task PatchAsync(PatchProfileRequest request);
        Task DeleteAsync(Guid id);
        Task SoftDeleteAsync(Guid id);



        Task UpdateNameAsync(UpdateNameModelView model);
        Task UpdateGenderAsync(UpdateGenderModelView model);
        Task UpdateBirthdayAsync(UpdateBirthdayModelView model);
    }
}
