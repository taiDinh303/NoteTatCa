using Microsoft.AspNetCore.Mvc;
using NTC.Contract.Services.Interface;
using NTC.Core.Base;
using NTC.Core.Store;
using NTC.ModelViews.UserInfoModelView;

namespace NTC.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Microsoft.AspNetCore.RateLimiting.EnableRateLimiting("auth")]
    // No Authorize
    public class UserLoginController : NTC.API.Controllers.Shared.BaseApiController
    {
        private readonly IUserLoginService _userLoginService;

        public UserLoginController(IUserLoginService userLoginService)
        {
            _userLoginService = userLoginService;
        }

        /// <summary>
        /// Check if the user has linked a Google account (or another provider)
        /// </summary>
        [HttpGet("is-connected")]
        [ProducesResponseType(typeof(NTC.Core.Base.BaseResponse<bool>), 200)]
        public async Task<IActionResult> IsConnected(Guid userId, string provider = "Google")
        {
            bool isConnected = await _userLoginService.IsConnectedAsync(userId, provider);

            return Ok(new BaseResponse<bool>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: isConnected
            ));
        }

        /// <summary>
        ///  Get all linked login providers for the user
        /// </summary>
        [HttpGet("get-all")]
        [ProducesResponseType(typeof(NTC.Core.Base.BaseResponse<IEnumerable<LegacyLinkedLoginResponse>>), 200)]
        public async Task<IActionResult> GetAll(Guid userId)
        {
            var result = await _userLoginService.GetAllByUserAsync(userId);

            return Ok(new BaseResponse<IEnumerable<LegacyLinkedLoginResponse>>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result.Select(x => new LegacyLinkedLoginResponse(x.LoginProvider, x.ProviderDisplayName))
            ));
        }

        /// <summary>
        /// Link a Google account (or another provider)
        /// </summary>
        [HttpPost("connect")]
        [ProducesResponseType(typeof(NTC.Core.Base.BaseResponse<string>), 200)]
        public async Task<IActionResult> Connect(Guid userId, string provider, string providerKey, string? displayName = null)
        {
            await _userLoginService.ConnectAsync(userId, provider, providerKey, displayName);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: $"{provider} connected successfully!"
            ));
        }

        /// <summary>
        /// Unlink a connected account (e.g., Google)
        /// </summary>
        [HttpDelete("disconnect")]
        [ProducesResponseType(typeof(NTC.Core.Base.BaseResponse<string>), 200)]
        public async Task<IActionResult> Disconnect(Guid userId, string provider = "Google")
        {
            await _userLoginService.DisconnectAsync(userId, provider);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: $"{provider} disconnected successfully!"
            ));
        }
    }
}
