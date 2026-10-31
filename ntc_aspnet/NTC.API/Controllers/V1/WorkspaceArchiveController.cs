using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NTC.API.Configuration;
using NTC.API.Controllers.Shared;
using NTC.Contract.Services.Interface;
using NTC.Core.Base;
using NTC.ModelViews.Backup;

namespace NTC.API.Controllers.V1;

[Authorize(Policy = AuthConfiguration.WorkspacePolicy)]
[ApiController, Route("api/v1/workspace/archive")]
public sealed class WorkspaceArchiveController(IWorkspaceArchiveService archives) : BaseApiController
{
    [HttpGet]
    [ProducesResponseType(typeof(BaseResponse<WorkspaceArchive>), 200)]
    public async Task<IActionResult> Export() => Success(await archives.ExportAsync());

    [HttpPost("import")]
    [RequestSizeLimit(50 * 1024 * 1024)]
    [ProducesResponseType(typeof(BaseResponse<ImportArchiveResult>), 200)]
    public async Task<IActionResult> Import([FromBody] WorkspaceArchive archive) =>
        Success(await archives.ImportAsync(archive));
}
