using NTC.ModelViews.NoteModelView;
using NTC.ModelViews.TagModelView;
using NTC.ModelViews.ReminderModelView;
using NTC.ModelViews.Administration;
using NTC.ModelViews.Notifications;
using NTC.ModelViews.UserInfoModelView;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using NTC.API.Controllers.Shared;
using NTC.Contract.Services.Interface;
using NTC.Core.Base;
using NTC.ModelViews.AuthModelView;
using NTC.ModelViews.UserModelView;
namespace NTC.API.Controllers.V1;
[ApiController, Route("api/v1/auth"), EnableRateLimiting("auth")]
public sealed class AuthenticationController(IAuthService auth, IUserService users) : BaseApiController
{
    [AllowAnonymous, HttpPost("login")] [ProducesResponseType(typeof(BaseResponse<AuthResponseModelView>), 200)]
    public async Task<IActionResult> Login(LoginModelView request)
    { if (string.IsNullOrWhiteSpace(request.Email)) throw DomainErrors.Invalid("Email is required."); return Success(await auth.LoginAsync(request)); }
    [AllowAnonymous, HttpPost("register")] [ProducesResponseType(typeof(NTC.Core.Base.BaseResponse<bool>), 200)]
        public async Task<IActionResult> Register(RegisterModelView request) { await auth.RegisterAsync(request); return Success(true); }
    [AllowAnonymous, HttpPost("google")] [ProducesResponseType(typeof(BaseResponse<AuthResponseModelView>), 200)]
    public async Task<IActionResult> Google(GoogleLoginRequest request) => Success(await auth.LoginWithGoogle(request.IdToken));
    [AllowAnonymous, HttpPost("email-code")] [ProducesResponseType(typeof(NTC.Core.Base.BaseResponse<string>), 200)]
        public async Task<IActionResult> Code(EmailRequest request)
    { await auth.SendEmailConfirmationAsync(request.Email); return Success("If eligible, a confirmation email has been sent."); }
    [AllowAnonymous, HttpPost("forgot-password")] [ProducesResponseType(typeof(NTC.Core.Base.BaseResponse<string>), 200)]
        public async Task<IActionResult> Forgot(EmailRequest request)
    { await auth.SendForgotPasswordLinkAsync(request.Email); return Success("If eligible, a recovery email has been sent."); }
    [AllowAnonymous, HttpPost("verify-email")] [ProducesResponseType(typeof(NTC.Core.Base.BaseResponse<bool>), 200)]
        public async Task<IActionResult> VerifyEmail(ConfirmEmailRequest request)
    { await auth.ConfirmEmailAsync(request.Email, request.Code); return Success(true); }
    [AllowAnonymous, HttpPost("reset-password")] [ProducesResponseType(typeof(NTC.Core.Base.BaseResponse<bool>), 200)]
        public async Task<IActionResult> Reset(SetPasswordRequest request)
    { await users.SetPasswordAsync(request.UserId, request.Token, request.NewPassword); return Success(true); }
    [AllowAnonymous, HttpGet("confirm-email-change")] [ProducesResponseType(typeof(NTC.Core.Base.BaseResponse<bool>), 200)]
        public async Task<IActionResult> Confirm(Guid userId, string token, string newEmail)
    { await users.ConfirmChangeEmailAsync(userId, token, newEmail); return Success(true); }
    [AllowAnonymous, HttpPost("refresh")] [ProducesResponseType(typeof(BaseResponse<AuthResponseModelView>), 200)]
    public async Task<IActionResult> Refresh(RefreshRequest request) => Success(await auth.RefreshAsync(request.RefreshToken));
    [HttpPost("logout")] [ProducesResponseType(typeof(NTC.Core.Base.BaseResponse<bool>), 200)]
        public async Task<IActionResult> Logout(RefreshRequest request) { await auth.LogoutAsync(request.RefreshToken); return Success(true); }
    [HttpPost("revoke-all")] [ProducesResponseType(typeof(NTC.Core.Base.BaseResponse<bool>), 200)]
        public async Task<IActionResult> Revoke() { await auth.RevokeAllAsync(); return Success(true); }
}
