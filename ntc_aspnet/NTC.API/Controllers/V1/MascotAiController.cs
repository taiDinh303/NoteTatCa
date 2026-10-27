using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NTC.API.Configuration;
using NTC.API.Controllers.Shared;
using NTC.Contract.Services.Interface;
using NTC.ModelViews.Mascots;
namespace NTC.API.Controllers.V1;
[Authorize(Policy = AuthConfiguration.WorkspacePolicy)]
[ApiController, Route("api/v1/mascot-ai")]
public sealed class MascotAiController(IMascotAiService mascots) : BaseApiController
{
    [HttpGet("status")]
    public async Task<IActionResult> Status(CancellationToken token) => Success(await mascots.StatusAsync(token));
    [HttpPost("generations"), RequestSizeLimit(3 * 1024 * 1024)]
    public async Task<IActionResult> Create(CreateMascotRequest request, CancellationToken token)
    {
        var result = await mascots.CreateAsync(request, token);
        return CreatedResource($"/api/v1/mascot-ai/generations/{result.Id}", result);
    }
    [HttpGet("generations/{id:guid}/result")]
    public async Task<IActionResult> Result(Guid id, CancellationToken token) => Success(await mascots.ResultAsync(id, token));
    [HttpPost("generations/{id:guid}/apply"), RequestSizeLimit(2 * 1024 * 1024)]
    public async Task<IActionResult> Apply(Guid id, ApplyMascotRequest request, CancellationToken token)
    { await mascots.ApplyAsync(id, request, token); return Success(true); }
    [HttpDelete("slot/{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken token)
    { await mascots.DeleteAsync(id, token); return Success(true); }
    [HttpGet("slot/result")]
    public async Task<IActionResult> Saved(CancellationToken token) => Success(await mascots.SavedAsync(token));
}
