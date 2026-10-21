using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using NTC.Contract.Repositories.Entities;
using NTC.Contract.Repositories.Entities.Identity;
using NTC.Contract.Repositories.IUOW;
using NTC.Contract.Services.Interface;
using NTC.Core.Base;
using NTC.Core.Security;
using NTC.ModelViews.AuthModelView;
using NTC.Services.Security;
using NTC.Services.Shared;
namespace NTC.Services.Service;
public sealed class AuthService(IUnitOfWork work, ICurrentUser actor, TimeProvider clock,
    UserManager<ApplicationUser> users, RoleManager<ApplicationRole> roles, IConfiguration config,
    IEmailService emails, IOtpService otp, IGoogleIdentityValidator google)
    : BaseService(work, actor, clock), IAuthService
{
    private static string Hash(string token) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
    private static string NormalizeEmail(string email) => AccountRules.Email(email);
    private void RequireActive(ApplicationUser user)
    {
        if (user.IsLocked || user.DeletedTime != null || user.LockoutEnd > UtcNow)
            throw new BaseException.ErrorException(403, "ACCOUNT_LOCKED", "This account is unavailable.");
        if (!user.EmailConfirmed) throw new BaseException.ErrorException(403, "EMAIL_NOT_CONFIRMED", "Verify your email before signing in.");
    }
    private async Task AddUserRole(ApplicationUser user)
    {
        if (!await roles.RoleExistsAsync("User")) throw new BaseException.ErrorException(503, "BOOTSTRAP_REQUIRED", "Initialize application roles before registration.");
        SessionSecurity.RequireSuccess(await users.AddToRoleAsync(user, "User"));
    }
    public async Task RegisterAsync(RegisterModelView model)
    {
        model.Email = NormalizeEmail(model.Email);
        AccountRules.NewPassword(model.Password);
        if (model.Password != model.ConfirmPassword) throw DomainErrors.Invalid("Passwords must match.");
        if (await users.FindByEmailAsync(model.Email) != null) throw DomainErrors.Invalid("Unable to register with these details.");
        if (!await otp.ValidateAsync(model.Email, model.ConfirmationCode ?? "")) throw new BaseException.ErrorException(400, "INVALID_OTP", "Invalid or expired confirmation code.");
        await InTransactionAsync(async () =>
        {
            var username = string.IsNullOrWhiteSpace(model.Username) ? model.Email : model.Username.Trim();
            var user = new ApplicationUser { Id = Guid.NewGuid(), UserName = username, Email = model.Email, EmailConfirmed = true };
            SessionSecurity.RequireSuccess(await users.CreateAsync(user, model.Password)); await AddUserRole(user);
            await Repository<UserInfo>().InsertAsync(new() { Id = user.Id, GivenName = username[..Math.Min(25, username.Length)] });
            await UnitOfWork.SaveAsync(); return true;
        });
    }
    public async Task<AuthResponseModelView> LoginAsync(LoginModelView model)
    {
        var identifier = (model.Email ?? model.Username).Trim();
        if (identifier.Length > 256 || string.IsNullOrEmpty(model.Password) || model.Password.Length > 1024) throw DomainErrors.Unauthorized();
        var user = await users.FindByEmailAsync(identifier);
        if (user == null && model.Email == null) user = await users.FindByNameAsync(identifier); // Razor compatibility only.
        if (user == null) throw DomainErrors.Unauthorized();
        if (!await users.CheckPasswordAsync(user, model.Password))
        {
            if (!user.IsLocked && user.DeletedTime == null && !(user.LockoutEnd > UtcNow))
                SessionSecurity.RequireSuccess(await users.AccessFailedAsync(user));
            throw DomainErrors.Unauthorized();
        }
        RequireActive(user);
        SessionSecurity.RequireSuccess(await users.ResetAccessFailedCountAsync(user));
        return await InTransactionAsync(() => IssueSession(user));
    }
    public async Task SendEmailConfirmationAsync(string email)
    {
        email = NormalizeEmail(email);
        var existing = await users.FindByEmailAsync(email);
        if (existing?.EmailConfirmed == true || existing?.IsLocked == true || existing?.DeletedTime != null) return;
        var code = otp.GenerateConfirmationCode();
        await otp.StoreAsync(email, code, UtcNow.AddMinutes(10).UtcDateTime);
        await emails.SendVerificationCodeAsync(email, code);
    }
    public async Task ConfirmEmailAsync(string email, string code)
    {
        email = NormalizeEmail(email);
        if (!await otp.ValidateAsync(email, code)) throw new BaseException.ErrorException(400, "INVALID_OTP", "Invalid or expired confirmation code.");
        var user = await users.FindByEmailAsync(email) ?? throw DomainErrors.Invalid("Unable to confirm these details.");
        if (user.IsLocked || user.DeletedTime != null) throw DomainErrors.Forbidden();
        user.EmailConfirmed = true; SessionSecurity.RequireSuccess(await users.UpdateAsync(user));
    }
    public async Task SendForgotPasswordLinkAsync(string email)
    {
        email = NormalizeEmail(email); var user = await users.FindByEmailAsync(email);
        if (user == null || !user.EmailConfirmed || user.IsLocked || user.DeletedTime != null) return;
        var token = await users.GeneratePasswordResetTokenAsync(user); await emails.SendForgotPasswordLinkAsync(user, token);
    }
    public async Task<AuthResponseModelView> LoginWithGoogle(string idToken)
    {
        var identity = await google.ValidateAsync(idToken);
        return await InTransactionAsync(async () =>
        {
            var user = await users.FindByLoginAsync("Google", identity.Subject);
            if (user == null)
            {
                if (await users.FindByEmailAsync(identity.Email) != null)
                    throw new BaseException.ErrorException(409, "GOOGLE_LINK_REQUIRED", "Sign in to your existing account and link Google in Settings.");
                user = new ApplicationUser { Id = Guid.NewGuid(), UserName = identity.Email, Email = identity.Email, EmailConfirmed = true };
                SessionSecurity.RequireSuccess(await users.CreateAsync(user)); await AddUserRole(user);
                SessionSecurity.RequireSuccess(await users.AddLoginAsync(user, new("Google", identity.Subject, "Google")));
                await Repository<UserInfo>().InsertAsync(new() { Id = user.Id, GivenName = (identity.GivenName ?? "User")[..Math.Min(25, (identity.GivenName ?? "User").Length)],
                    FamilyName = identity.FamilyName, Picture = identity.Picture });
                await UnitOfWork.SaveAsync();
            }
            RequireActive(user); return await IssueSession(user);
        });
    }
    public async Task<bool> VerifyPassword(VerifyPasswordModelView model)
    {
        RequireSelf(model.UserId); var user = await users.FindByIdAsync(UserId.ToString()) ?? throw DomainErrors.Unauthorized();
        RequireActive(user);
        if (!await users.CheckPasswordAsync(user, model.Password)) throw DomainErrors.Unauthorized();
        return true;
    }
    private async Task<AuthResponseModelView> IssueSession(ApplicationUser user, Guid? family = null)
    {
        RequireActive(user); var now = UtcNow;
        var token = Convert.ToBase64String(RandomNumberGenerator.GetBytes(48));
        var session = new RefreshSession { UserId = user.Id, FamilyId = family ?? Guid.NewGuid(), TokenHash = Hash(token),
            SecurityStamp = user.SecurityStamp ?? "", CreatedAt = now, ExpiresAt = new DateTimeOffset(9999, 12, 31, 0, 0, 0, TimeSpan.Zero) };
        await Repository<RefreshSession>().InsertAsync(session); await UnitOfWork.SaveAsync();
        var roleNames = await users.GetRolesAsync(user); var profile = await Repository<UserInfo>().Entities.FirstOrDefaultAsync(x => x.Id == user.Id);
        var expires = now.AddMinutes(Math.Clamp(config.GetValue<int?>("Jwtsettings:ExpirationMinutes") ?? 15, 1, 60));
        var claims = new List<Claim> { new(JwtRegisteredClaimNames.Sub, user.Id.ToString()), new(ClaimTypes.Name, user.UserName ?? user.Email ?? ""),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()), new("sid", session.Id.ToString()), new("stamp", session.SecurityStamp),
            new(JwtRegisteredClaimNames.Email, user.Email ?? "") };
        claims.AddRange(roleNames.Select(x => new Claim(ClaimTypes.Role, x)));
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwtsettings:Key"]!));
        var jwt = new JwtSecurityToken(config["Jwtsettings:Issuer"], config["Jwtsettings:Audience"], claims,
            now.UtcDateTime, expires.UtcDateTime, new SigningCredentials(key, SecurityAlgorithms.HmacSha256));
        return new() { Token = new JwtSecurityTokenHandler().WriteToken(jwt), ExpiredAt = expires.UtcDateTime,
            RefreshToken = token, RefreshExpiresAt = session.ExpiresAt, UserId = user.Id, UserName = user.UserName ?? "",
            GivenName = profile?.GivenName ?? "", FamilyName = profile?.FamilyName, Picture = profile?.Picture,
            BirthDate = profile?.BirthDate, Gender = profile?.Gender ?? GenderType.RatherNotSay, TimeZoneId = user.TimeZoneId, Roles = roleNames.ToArray() };
    }
    public async Task<AuthResponseModelView> RefreshAsync(string token)
    {
        if (string.IsNullOrWhiteSpace(token) || token.Length > 512) throw DomainErrors.Unauthorized();
        var hash = Hash(token); var reused = false;
        var result = await InTransactionAsync(async () =>
        {
            var session = await Repository<RefreshSession>().Entities.FirstOrDefaultAsync(x => x.TokenHash == hash);
            if (session == null || session.ExpiresAt <= UtcNow) throw DomainErrors.Unauthorized();
            if (session.RevokedAt != null)
            {
                foreach (var sibling in await Repository<RefreshSession>().Entities.Where(x => x.FamilyId == session.FamilyId && x.RevokedAt == null).ToListAsync()) sibling.RevokedAt = UtcNow;
                await UnitOfWork.SaveAsync(); reused = true; return null;
            }
            var user = await users.FindByIdAsync(session.UserId.ToString()) ?? throw DomainErrors.Unauthorized();
            RequireActive(user); if (session.SecurityStamp != user.SecurityStamp) throw DomainErrors.Unauthorized();
            session.RevokedAt = UtcNow;
            var response = await IssueSession(user, session.FamilyId);
            var replacementHash = Hash(response.RefreshToken);
            session.ReplacedById = await Repository<RefreshSession>().Entities.Where(x => x.TokenHash == replacementHash).Select(x => x.Id).SingleAsync();
            await UnitOfWork.SaveAsync();
            return response;
        });
        if (reused || result == null) throw DomainErrors.Unauthorized();
        return result;
    }
    public async Task LogoutAsync(string token)
    {
        if (string.IsNullOrWhiteSpace(token) || token.Length > 512) return;
        var hash = Hash(token);
        var session = await Repository<RefreshSession>().Entities.FirstOrDefaultAsync(x => x.TokenHash == hash && x.UserId == UserId);
        if (session != null) { session.RevokedAt = UtcNow; await UnitOfWork.SaveAsync(); }
    }
    public async Task RevokeAllAsync()
    {
        var user = await users.FindByIdAsync(UserId.ToString()) ?? throw DomainErrors.Unauthorized();
        await SessionSecurity.RevokeAllAsync(UnitOfWork, users, user, UtcNow);
    }
}
