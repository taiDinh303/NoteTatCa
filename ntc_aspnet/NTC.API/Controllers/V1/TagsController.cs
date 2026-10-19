using Microsoft.AspNetCore.Authorization;
using NTC.API.Configuration;
using Microsoft.AspNetCore.Mvc;
using NTC.API.Controllers.Shared;
using NTC.Contract.Services.Interface;
using NTC.Core.Base;
using NTC.ModelViews.TagModelView;

namespace NTC.API.Controllers.V1;

[Authorize(Policy = AuthConfiguration.WorkspacePolicy)]
[ApiController, Route("api/v1/tags")]
public sealed class TagsController(ITagService tags) : BaseApiController
{
    [HttpGet, ProducesResponseType(typeof(BaseResponse<BasePaginatedList<TagResponseModelView>>), 200)]
    public async Task<IActionResult> List(int pageNumber = 1, int pageSize = 20) => Success(await tags.GetAllAsync(pageNumber, pageSize));
    [HttpGet("{id:guid}"), ProducesResponseType(typeof(BaseResponse<TagResponseModelView>), 200)]
    public async Task<IActionResult> Get(Guid id) => Success(await tags.GetByIdAsync(id));
    [HttpPost, ProducesResponseType(typeof(BaseResponse<TagResponseModelView>), 201)]
    public async Task<IActionResult> Create(CreateTagModelView request)
    { var tag = await tags.CreateAsync(request); return CreatedResource($"/api/v1/tags/{tag.Id}", await tags.GetByIdAsync(tag.Id)); }
    [HttpPatch("{id:guid}"), ProducesResponseType(typeof(BaseResponse<TagResponseModelView>), 200)]
    public async Task<IActionResult> Update(Guid id, PatchTagRequest request)
    { await tags.PatchAsync(id, request); return Success(await tags.GetByIdAsync(id)); }
    [HttpDelete("{id:guid}"), ProducesResponseType(typeof(BaseResponse<bool>), 200)]
    public async Task<IActionResult> Delete(Guid id) { await tags.DeleteAsync(id); return Success(true); }
}
