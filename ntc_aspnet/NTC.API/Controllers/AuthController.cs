using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using NTC.API.Controllers.Shared;
using NTC.Contract.Services.Interface;
using NTC.ModelViews.AuthModelView;
namespace NTC.API.Controllers;
[ApiController, Route("api/auth"), EnableRateLimiting("auth")]
public sealed class AuthController(IAuthService auth) : BaseApiController
{
    [AllowAnonymous, HttpPost("login")] [ProducesResponseType(typeof(NTC.Core.Base.BaseResponse<NTC.ModelViews.AuthModelView.AuthResponseModelView>), 200)]
        public async Task<IActionResult> Login(LoginModelView model) => Success(await auth.LoginAsync(model));
    [AllowAnonymous, HttpPost("register")] [ProducesResponseType(typeof(NTC.Core.Base.BaseResponse<string>), 200)]
        public async Task<IActionResult> Register(RegisterModelView model) { await auth.RegisterAsync(model); return Success("Registered successfully."); }
    [AllowAnonymous, HttpPost("google-login")] [ProducesResponseType(typeof(NTC.Core.Base.BaseResponse<NTC.ModelViews.AuthModelView.AuthResponseModelView>), 200)]
        public async Task<IActionResult> Google(GoogleLoginRequest model) => Success(await auth.LoginWithGoogle(model.IdToken));
    [AllowAnonymous, HttpPost("send-email-confirmation")] [ProducesResponseType(typeof(NTC.Core.Base.BaseResponse<string>), 200)]
        public async Task<IActionResult> Confirmation([FromBody] string email) { await auth.SendEmailConfirmationAsync(email); return Success("If eligible, a confirmation email has been sent."); }
    [AllowAnonymous, HttpPost("send-forgot-password-link")] [ProducesResponseType(typeof(NTC.Core.Base.BaseResponse<string>), 200)]
        public async Task<IActionResult> Forgot([FromBody] string email) { await auth.SendForgotPasswordLinkAsync(email); return Success("If eligible, a recovery email has been sent."); }
    [HttpPost("verify-password")] [ProducesResponseType(typeof(NTC.Core.Base.BaseResponse<bool>), 200)]
        public async Task<IActionResult> Verify(VerifyPasswordModelView model) => Success(await auth.VerifyPassword(model));
}
