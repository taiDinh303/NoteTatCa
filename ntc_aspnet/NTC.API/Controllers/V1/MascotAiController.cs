using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NTC.API.Configuration;
using NTC.API.Controllers.Shared;
using NTC.Contract.Services.Interface;
using NTC.ModelViews.Mascots;
using NTC.Core.Base;
namespace NTC.API.Controllers.V1;
[Authorize(Policy = AuthConfiguration.WorkspacePolicy)]
[ApiController, Route("api/v1/mascot-ai")]
public sealed class MascotAiController(IMascotAiService mascots) : BaseApiController
{
    [HttpGet("status")]
    [ProducesResponseType(typeof(BaseResponse<MascotAiStatus>), 200)]
    public async Task<IActionResult> Status(CancellationToken token) => Success(await mascots.StatusAsync(token));
    [HttpPost("generations"), RequestSizeLimit(3 * 1024 * 1024)]
    [ProducesResponseType(typeof(BaseResponse<MascotJobView>), 201)]
    public async Task<IActionResult> Create(CreateMascotRequest request, CancellationToken token)
    {
        var result = await mascots.CreateAsync(request, token);
        return CreatedResource($"/api/v1/mascot-ai/generations/{result.Id}", result);
    }
    [HttpGet("generations/{id:guid}/result")]
    [ProducesResponseType(typeof(BaseResponse<MascotAiResult>), 200)]
    public async Task<IActionResult> Result(Guid id, CancellationToken token) => Success(await mascots.ResultAsync(id, token));
    [HttpPost("generations/{id:guid}/apply"), RequestSizeLimit(2 * 1024 * 1024)]
    [ProducesResponseType(typeof(BaseResponse<bool>), 200)]
    public async Task<IActionResult> Apply(Guid id, ApplyMascotRequest request, CancellationToken token)
    { await mascots.ApplyAsync(id, request, token); return Success(true); }
    [HttpDelete("slot/{id:guid}")]
    [ProducesResponseType(typeof(BaseResponse<bool>), 200)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken token)
    { await mascots.DeleteAsync(id, token); return Success(true); }
    [HttpGet("slot/result")]
    [ProducesResponseType(typeof(BaseResponse<SavedMascotResult>), 200)]
    public async Task<IActionResult> Saved(CancellationToken token) => Success(await mascots.SavedAsync(token));
}
