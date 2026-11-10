using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NTC.API.Configuration;
using NTC.API.Controllers.Shared;
using NTC.Contract.Services.Interface;
using NTC.ModelViews.Administration;
using NTC.Core.Base;

namespace NTC.API.Controllers.V1;

[ApiController, Authorize(Policy = AuthConfiguration.WorkspacePolicy), Route("api/v1/notifications/feed")]
public sealed class NotificationFeedController(IAnnouncementService service) : BaseApiController
{
    [HttpGet, ProducesResponseType(typeof(BaseResponse<BasePaginatedList<InboxMessageResponse>>), 200)] public async Task<IActionResult> List(int pageNumber = 1, int pageSize = 20, bool unreadOnly = false) => Success(await service.FeedAsync(pageNumber, pageSize, unreadOnly));
    [HttpGet("unread-count"), ProducesResponseType(typeof(BaseResponse<int>), 200)] public async Task<IActionResult> Count() => Success(await service.CountUnreadAsync());
    [HttpPatch("{id:guid}/read"), ProducesResponseType(typeof(BaseResponse<bool>), 200)] public async Task<IActionResult> Read(Guid id) { await service.ReadAsync(id); return Success(true); }
    [HttpPatch("read-all"), ProducesResponseType(typeof(BaseResponse<int>), 200)] public async Task<IActionResult> ReadAll() => Success(await service.ReadAllAsync());
}
