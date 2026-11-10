using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NTC.API.Controllers.Shared;
using NTC.Contract.Services.Interface;
using NTC.ModelViews.Administration;
using NTC.Core.Base;

namespace NTC.API.Controllers.V1;

[ApiController, Authorize(Roles = "Admin"), Route("api/v1/admin/announcements")]
public sealed class AnnouncementsController(IAnnouncementService service) : BaseApiController
{
    [HttpGet, ProducesResponseType(typeof(BaseResponse<BasePaginatedList<AnnouncementResponse>>), 200)] public async Task<IActionResult> List(int pageNumber = 1, int pageSize = 20) => Success(await service.ListAsync(pageNumber, pageSize));
    [HttpGet("recipients"), ProducesResponseType(typeof(BaseResponse<BasePaginatedList<AnnouncementCandidate>>), 200)] public async Task<IActionResult> Recipients(int pageNumber = 1, int pageSize = 20, string? q = null) => Success(await service.CandidatesAsync(pageNumber, pageSize, q));
    [HttpGet("{id:guid}"), ProducesResponseType(typeof(BaseResponse<AnnouncementDetail>), 200)] public async Task<IActionResult> Get(Guid id) => Success(await service.GetAsync(id));
    [HttpPost, ProducesResponseType(typeof(BaseResponse<AnnouncementDetail>), 200)] public async Task<IActionResult> Create(AnnouncementDraftRequest request) => Success(await service.CreateAsync(request));
    [HttpPatch("{id:guid}"), ProducesResponseType(typeof(BaseResponse<AnnouncementDetail>), 200)] public async Task<IActionResult> Update(Guid id, AnnouncementDraftRequest request) => Success(await service.UpdateAsync(id, request));
    [HttpPost("{id:guid}/preview"), ProducesResponseType(typeof(BaseResponse<AnnouncementPreview>), 200)] public async Task<IActionResult> Preview(Guid id, AnnouncementVersionRequest request) => Success(await service.PreviewAsync(id, request.ExpectedVersion));
    [HttpPost("{id:guid}/publish"), ProducesResponseType(typeof(BaseResponse<AnnouncementDetail>), 200)] public async Task<IActionResult> Publish(Guid id, AnnouncementPublishRequest request) => Success(await service.PublishAsync(id, request));
    [HttpPost("{id:guid}/revoke"), ProducesResponseType(typeof(BaseResponse<AnnouncementDetail>), 200)] public async Task<IActionResult> Revoke(Guid id, AnnouncementVersionRequest request) => Success(await service.RevokeAsync(id, request.ExpectedVersion));
}
