using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NTC.API.Controllers.Shared;
using NTC.Contract.Services.Interface;
using NTC.Core.Base;
using NTC.ModelViews.RoleModelView;

namespace NTC.API.Controllers.V1;

[ApiController, Authorize(Roles = "Admin"), Route("api/v1/admin")]
public sealed class AdminRolesController(IRoleService roles, IUserRoleService memberships) : BaseApiController
{
    [HttpGet("roles"), ProducesResponseType(typeof(BaseResponse<BasePaginatedList<RoleResponseModelView>>), 200)]
    public async Task<IActionResult> List(int pageNumber = 1, int pageSize = 20) => Success(await roles.GetAllAsync(pageNumber, pageSize));
    [HttpGet("roles/{id:guid}"), ProducesResponseType(typeof(BaseResponse<RoleResponseModelView>), 200)]
    public async Task<IActionResult> Get(Guid id) => Success(await roles.GetByIdAsync(id));
    [HttpPost("roles"), ProducesResponseType(typeof(BaseResponse<RoleResponseModelView>), 201)]
    public async Task<IActionResult> Create(CreateRoleModelView request)
    { var role = await roles.CreateAsync(request); return CreatedResource($"/api/v1/admin/roles/{role.Id}", await roles.GetByIdAsync(role.Id)); }
    [HttpPatch("roles/{id:guid}"), ProducesResponseType(typeof(BaseResponse<RoleResponseModelView>), 200)]
    public async Task<IActionResult> Patch(Guid id, PatchRoleRequest request)
    { await roles.PatchAsync(id, request); return Success(await roles.GetByIdAsync(id)); }
    [HttpDelete("roles/{id:guid}"), ProducesResponseType(typeof(BaseResponse<bool>), 200)]
    public async Task<IActionResult> Delete(Guid id) { await roles.DeleteAsync(id); return Success(true); }
    [HttpGet("users/{userId:guid}/roles"), ProducesResponseType(typeof(BaseResponse<IReadOnlyList<RoleResponseModelView>>), 200)]
    public async Task<IActionResult> ForUser(Guid userId) => Success(await memberships.GetForUserAsync(userId));
    [HttpPut("users/{userId:guid}/roles/{roleId:guid}"), ProducesResponseType(typeof(BaseResponse<bool>), 200)]
    public async Task<IActionResult> Assign(Guid userId, Guid roleId) { await memberships.AddRoleToUserAsync(userId, roleId); return Success(true); }
    [HttpDelete("users/{userId:guid}/roles/{roleId:guid}"), ProducesResponseType(typeof(BaseResponse<bool>), 200)]
    public async Task<IActionResult> Remove(Guid userId, Guid roleId) { await memberships.RemoveRoleFromUserAsync(userId, roleId); return Success(true); }
}
