namespace NTC.Contract.Services.Interface
{
    public interface IUserRoleService
    {
        Task AddRoleToUserAsync(Guid userId, Guid roleId);
        Task RemoveRoleFromUserAsync(Guid userId, Guid roleId);
        Task<IReadOnlyList<NTC.ModelViews.RoleModelView.RoleResponseModelView>> GetForUserAsync(Guid userId);
    }
}
