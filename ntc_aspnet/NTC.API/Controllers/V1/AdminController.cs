using NTC.Core.Base;
using NTC.ModelViews.NoteModelView;
using NTC.ModelViews.TagModelView;
using NTC.ModelViews.ReminderModelView;
using NTC.ModelViews.AuthModelView;
using NTC.ModelViews.Notifications;
using NTC.ModelViews.UserInfoModelView;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NTC.API.Controllers.Shared;
using NTC.Contract.Services.Interface;
using NTC.ModelViews.Administration;
using NTC.ModelViews.UserModelView;
using NTC.Contract.Repositories.Entities.Identity;
namespace NTC.API.Controllers.V1;
[ApiController, Authorize(Roles = "Admin"), Route("api/v1/admin")]
public sealed class AdminController(IUserService users, IAdminService admin) : BaseApiController
{
    [HttpGet("users")] [ProducesResponseType(typeof(BaseResponse<BasePaginatedList<UserResponseModelView>>), 200)]
    public async Task<IActionResult> List(int pageNumber = 1, int pageSize = 20, string? q = null, bool includeDeactivated = false) => Success(await users.GetAllAsync(pageNumber, pageSize, q, includeDeactivated));
    [HttpGet("users/{id:guid}")] [ProducesResponseType(typeof(BaseResponse<UserResponseModelView>), 200)]
    public async Task<IActionResult> GetUser(Guid id) => Success(await users.GetByIdAsync(id));
    [HttpPost("users")] [ProducesResponseType(typeof(NTC.Core.Base.BaseResponse<bool>), 200)]
        public async Task<IActionResult> Create(CreateUserModelView request) { await users.CreateAsync(request); return Success(true); }
    [HttpPatch("users/{id:guid}/lock")] [ProducesResponseType(typeof(NTC.Core.Base.BaseResponse<bool>), 200)]
        public async Task<IActionResult> Lock(Guid id, LockUserRequest request) { await admin.SetLockedAsync(id, request.IsLocked); return Success(true); }
    [HttpGet("statistics")] [ProducesResponseType(typeof(BaseResponse<AdminStatistics>), 200)]
    public async Task<IActionResult> Statistics() => Success(await admin.GetStatisticsAsync());
    [HttpGet("audit-events")]
    [ProducesResponseType(typeof(BaseResponse<BasePaginatedList<AdministrativeAuditResponse>>), 200)]
    public async Task<IActionResult> AuditEvents(int pageNumber = 1, int pageSize = 20, Guid? targetUserId = null, AdministrativeAction? action = null)
        => Success(await admin.GetAuditEventsAsync(pageNumber, pageSize, targetUserId, action));
    [HttpPost("users/{id:guid}/deactivate"), ProducesResponseType(typeof(BaseResponse<bool>), 200)]
    public async Task<IActionResult> Deactivate(Guid id) { await users.SoftDeleteAsync(id); return Success(true); }
    [HttpPost("users/{id:guid}/restore"), ProducesResponseType(typeof(BaseResponse<UserResponseModelView>), 200)]
    public async Task<IActionResult> Restore(Guid id) { await users.RestoreAsync(id); return Success(await users.GetByIdAsync(id)); }
}
