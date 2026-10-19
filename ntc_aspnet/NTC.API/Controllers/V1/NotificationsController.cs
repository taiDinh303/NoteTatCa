using Microsoft.AspNetCore.Authorization;
using NTC.API.Configuration;
using Microsoft.AspNetCore.Mvc;
using NTC.API.Controllers.Shared;
using NTC.Contract.Services.Interface;
using NTC.Core.Base;
using NTC.ModelViews.Notifications;

namespace NTC.API.Controllers.V1;

[Authorize(Policy = AuthConfiguration.WorkspacePolicy)]
[ApiController, Route("api/v1/notifications")]
public sealed class NotificationsController(IInboxService inbox) : BaseApiController
{
    [HttpGet, ProducesResponseType(typeof(BaseResponse<BasePaginatedList<NotificationResponse>>), 200)]
    public async Task<IActionResult> List(int pageNumber = 1, int pageSize = 20, bool unreadOnly = false) => Success(await inbox.GetAsync(pageNumber, pageSize, unreadOnly));
    [HttpPatch("{id:guid}/read"), ProducesResponseType(typeof(BaseResponse<bool>), 200)]
    public async Task<IActionResult> Read(Guid id) { await inbox.MarkReadAsync(id); return Success(true); }
    [HttpGet("unread-count"), ProducesResponseType(typeof(BaseResponse<int>), 200)]
    public async Task<IActionResult> UnreadCount() => Success(await inbox.CountUnreadAsync());
    [HttpPatch("read-all"), ProducesResponseType(typeof(BaseResponse<int>), 200)]
    public async Task<IActionResult> ReadAll() => Success(await inbox.MarkAllReadAsync());
}
