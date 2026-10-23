using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using NTC.API.Configuration;
using NTC.API.Controllers.Shared;
using NTC.Contract.Services.Interface;
using NTC.ModelViews.Feedback;
using NTC.Core.Base;
namespace NTC.API.Controllers.V1;
[Authorize(Policy = AuthConfiguration.WorkspacePolicy)]
[ApiController, Route("api/v1/feedback")]
public sealed class FeedbackController(IFeedbackService feedback) : BaseApiController
{
    [HttpPost, EnableRateLimiting("feedback"), RequestSizeLimit(32768)]
    [ProducesResponseType(typeof(BaseResponse<bool>), 200)]
    public async Task<IActionResult> Send(FeedbackRequest request)
    {
        await feedback.SendAsync(request);
        return Success(true);
    }
}
