using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using NTC.ModelViews.RoleModelView;
using NTC.Services.Mappings;
using NTC.Contract.Repositories.Entities;
using NTC.Contract.Repositories.IUOW;
using NTC.Contract.Services.Interface;
using NTC.Core.Base;
using NTC.Core.Security;
using NTC.Services.Security;
using NTC.Services.Shared;
using NTC.Contract.Repositories.Entities.Identity;
namespace NTC.Services.Service;
public sealed class UserRoleService(IUnitOfWork work, ICurrentUser actor, TimeProvider clock,
    UserManager<ApplicationUser> users, RoleManager<ApplicationRole> roles) : BaseService(work,actor,clock), IUserRoleService
{
    public Task AddRoleToUserAsync(Guid userId,Guid roleId) => Change(userId,roleId,true);
    public Task RemoveRoleFromUserAsync(Guid userId,Guid roleId) => Change(userId,roleId,false);
    public async Task<IReadOnlyList<RoleResponseModelView>> GetForUserAsync(Guid userId)
    {
        RequireAdmin();
        var user = await users.FindByIdAsync(userId.ToString()) ?? throw DomainErrors.NotFound("Account");
        var names = await users.GetRolesAsync(user);
        return (await roles.Roles.AsNoTracking().Where(x => x.DeletedTime == null && names.Contains(x.Name!)).OrderBy(x => x.Name).ToListAsync())
            .Select(x => x.ToViewModel()).ToArray();
    }
    private async Task Change(Guid userId,Guid roleId,bool add)
    {
        RequireAdmin();
        await InTransactionAsync(async () =>
        {
            var user=await users.FindByIdAsync(userId.ToString())??throw DomainErrors.NotFound("Account");
            var role=await roles.FindByIdAsync(roleId.ToString())??throw DomainErrors.NotFound("Role");
            if(user.DeletedTime!=null||role.DeletedTime!=null)throw DomainErrors.NotFound();
            if(!add&&userId==UserId&&role.Name=="Admin")throw DomainErrors.Conflict("You cannot remove your own administrator role.");
            var exists=await users.IsInRoleAsync(user,role.Name!);
            if(exists==add)return true;
            SessionSecurity.RequireSuccess(add?await users.AddToRoleAsync(user,role.Name!):await users.RemoveFromRoleAsync(user,role.Name!));
            await SessionSecurity.RevokeAllAsync(UnitOfWork,users,user,UtcNow);
            await RecordAdministrativeActionAsync(add ? AdministrativeAction.RoleGranted : AdministrativeAction.RoleRevoked,userId,roleId);
            await UnitOfWork.SaveAsync();return true;
        });
    }
}
