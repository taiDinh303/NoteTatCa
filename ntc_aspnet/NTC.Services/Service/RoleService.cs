using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using NTC.Contract.Repositories.Entities;
using NTC.Contract.Repositories.IUOW;
using NTC.Contract.Services.Interface;
using NTC.Core.Base;
using NTC.Core.Security;
using NTC.ModelViews.RoleModelView;
using NTC.Services.Mappings;
using NTC.Services.Security;
using NTC.Services.Shared;
using NTC.Contract.Repositories.Entities.Identity;
namespace NTC.Services.Service;
public sealed class RoleService(IUnitOfWork work, ICurrentUser actor, TimeProvider clock, RoleManager<ApplicationRole> roles)
    : BaseService(work, actor, clock), IRoleService
{
    private async Task<ApplicationRole> Find(Guid id) => await roles.Roles.FirstOrDefaultAsync(x => x.Id == id && x.DeletedTime == null) ?? throw DomainErrors.NotFound("Role");
    private static void Editable(ApplicationRole role)
    { if (role.Name is "User" or "Admin") throw DomainErrors.Conflict("Built-in roles cannot be renamed or deleted."); }
    private static void Validate(string? name, string? description)
    {
        if (string.IsNullOrWhiteSpace(name) || name.Length > 64 || name.Any(c => !char.IsAsciiLetterOrDigit(c) && c is not ('-' or '_')) || description?.Length > 500)
            throw DomainErrors.Invalid("Role names must contain 1 to 64 letters, numbers, underscores or hyphens; description at most 500 characters.");
    }
    public async Task<BasePaginatedList<RoleResponseModelView>> GetAllAsync(int pageNumber, int pageSize)
    {
        RequireAdmin(); ValidatePage(pageNumber, pageSize); var query=roles.Roles.AsNoTracking().Where(x=>x.DeletedTime==null);
        var count=await query.CountAsync();var result=await query.OrderBy(x=>x.Name).ThenBy(x=>x.Id).Skip((pageNumber-1)*pageSize).Take(pageSize).ToListAsync();
        return new(result.Select(x=>x.ToViewModel()).ToArray(),count,pageNumber,pageSize);
    }
    public async Task<RoleResponseModelView> GetByIdAsync(Guid id) { RequireAdmin(); return (await Find(id)).ToViewModel(); }
    public async Task<ApplicationRole> CreateAsync(CreateRoleModelView model)
    {
        RequireAdmin(); Validate(model.Name,model.Description);
        return await InTransactionAsync(async () =>
        {
            var role = new ApplicationRole { Name = model.Name!.Trim(), Description = model.Description };
            SessionSecurity.RequireSuccess(await roles.CreateAsync(role));
            await RecordAdministrativeActionAsync(AdministrativeAction.RoleCreated, roleId: role.Id);
            await UnitOfWork.SaveAsync(); return role;
        });
    }
    public async Task UpdateAsync(UpdateRoleModelView model)
    {
        RequireAdmin();
        await InTransactionAsync(async () =>
        {
            var role = await Find(model.Id); Editable(role); Validate(model.Name ?? role.Name, model.Description ?? role.Description);
            role.Name = model.Name ?? role.Name; role.Description = model.Description ?? role.Description;
            SessionSecurity.RequireSuccess(await roles.UpdateAsync(role));
            await RecordAdministrativeActionAsync(AdministrativeAction.RoleUpdated, roleId: role.Id);
            await UnitOfWork.SaveAsync(); return true;
        });
    }
    public async Task PatchAsync(Guid id, PatchRoleRequest request)
    {
        RequireAdmin();
        await InTransactionAsync(async () =>
        {
            var role = await Find(id); Editable(role);
            var name = request.Includes(nameof(request.Name)) ? request.Name : role.Name;
            var description = request.Includes(nameof(request.Description)) ? request.Description : role.Description;
            Validate(name, description); role.Name = name!.Trim(); role.Description = description;
            SessionSecurity.RequireSuccess(await roles.UpdateAsync(role));
            await RecordAdministrativeActionAsync(AdministrativeAction.RoleUpdated, roleId: role.Id);
            await UnitOfWork.SaveAsync(); return true;
        });
    }
    public async Task SoftDeleteAsync(Guid id)
    {
        RequireAdmin();
        await InTransactionAsync(async () =>
        {
            var role = await Find(id); Editable(role); role.DeletedTime = UtcNow; role.DeletedBy = CurrentUser.Name;
            SessionSecurity.RequireSuccess(await roles.UpdateAsync(role));
            await RecordAdministrativeActionAsync(AdministrativeAction.RoleDeactivated, roleId: role.Id);
            await UnitOfWork.SaveAsync(); return true;
        });
    }
    public async Task DeleteAsync(Guid id)
    {
        RequireAdmin();
        await InTransactionAsync(async () =>
        {
            var role = await Find(id); Editable(role); SessionSecurity.RequireSuccess(await roles.DeleteAsync(role));
            await RecordAdministrativeActionAsync(AdministrativeAction.RoleDeleted, roleId: role.Id);
            await UnitOfWork.SaveAsync(); return true;
        });
    }
}
