using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using NTC.API.Controllers.Shared;
using NTC.Contract.Services.Interface;
using NTC.Core.Base;
using NTC.Core.Security;
using NTC.ModelViews.AuthModelView;
using NTC.ModelViews.UserInfoModelView;
using NTC.ModelViews.UserModelView;

namespace NTC.API.Controllers.V1;

[ApiController, Route("api/v1/me")]
public sealed class MeController(ICurrentUser actor, IUserInfoService profiles, IUserService users, IUserLoginService logins, ISessionService sessions) : BaseApiController
{
    private Guid Id => actor.UserId ?? throw DomainErrors.Unauthorized();
    [HttpGet, ProducesResponseType(typeof(BaseResponse<MeResponse>), 200)]
    public async Task<IActionResult> Get() => Success(new MeResponse(await users.GetByIdAsync(Id), await profiles.GetCurrentAsync()));
    [HttpPatch, ProducesResponseType(typeof(BaseResponse<UserInfoResponseModelView>), 200)]
    public async Task<IActionResult> Update(PatchProfileRequest request)
    { await profiles.PatchAsync(request); return Success(await profiles.GetByIdAsync(Id)); }
    [HttpGet("profile"), ProducesResponseType(typeof(BaseResponse<UserInfoResponseModelView>), 200)]
    public async Task<IActionResult> Profile() => Success(await profiles.GetByIdAsync(Id));
    [HttpPost("profile"), ProducesResponseType(typeof(BaseResponse<UserInfoResponseModelView>), 201)]
    public async Task<IActionResult> CreateProfile(CreateProfileRequest request)
    {
        await profiles.CreateAsync(new() { UserId = Id, GivenName = request.GivenName, FamilyName = request.FamilyName, BirthDate = request.BirthDate, Gender = request.Gender });
        return CreatedResource("/api/v1/me/profile", await profiles.GetByIdAsync(Id));
    }
    [HttpPatch("account"), ProducesResponseType(typeof(BaseResponse<UserResponseModelView>), 200)]
    public async Task<IActionResult> Account(PatchAccountRequest request)
    { await users.PatchAccountAsync(request); return Success(await users.GetByIdAsync(Id)); }
    [HttpGet("sessions"), ProducesResponseType(typeof(BaseResponse<BasePaginatedList<SessionResponse>>), 200)]
    public async Task<IActionResult> Sessions(int pageNumber = 1, int pageSize = 20) => Success(await sessions.GetAsync(pageNumber, pageSize));
    [HttpDelete("sessions/{sessionId:guid}"), ProducesResponseType(typeof(BaseResponse<bool>), 200)]
    public async Task<IActionResult> RevokeSession(Guid sessionId) { await sessions.RevokeAsync(sessionId); return Success(true); }
    [EnableRateLimiting("auth"), HttpPost("change-password"), ProducesResponseType(typeof(BaseResponse<bool>), 200)]
    public async Task<IActionResult> Password(ChangePasswordModelView request)
    { await users.ChangePasswordAsync(Id, request.CurrentPassword, request.NewPassword); return Success(true); }
    [EnableRateLimiting("auth"), HttpPost("change-email"), ProducesResponseType(typeof(BaseResponse<bool>), 200)]
    public async Task<IActionResult> Email(EmailRequest request)
    { await users.SendChangeEmailAsync(new() { Id = Id, Email = request.Email }); return Success(true); }
    [EnableRateLimiting("auth"), HttpPost("password-email"), ProducesResponseType(typeof(BaseResponse<bool>), 200)]
    public async Task<IActionResult> PasswordEmail() { await users.SendSetPasswordLinkAsync(Id); return Success(true); }
    [HttpGet("logins"), ProducesResponseType(typeof(BaseResponse<IEnumerable<LinkedLoginResponse>>), 200)]
    public async Task<IActionResult> Logins() => Success((await logins.GetAllByUserAsync(Id)).Select(x => new LinkedLoginResponse(x.LoginProvider, x.ProviderDisplayName)));
    [EnableRateLimiting("auth"), HttpPost("google-link"), ProducesResponseType(typeof(BaseResponse<bool>), 200)]
    public async Task<IActionResult> Link(GoogleLoginRequest request)
    { await logins.ConnectAsync(Id, "Google", request.IdToken); return Success(true); }
    [EnableRateLimiting("auth"), HttpDelete("google-link"), ProducesResponseType(typeof(BaseResponse<bool>), 200)]
    public async Task<IActionResult> Unlink() { await logins.DisconnectAsync(Id, "Google"); return Success(true); }
}
