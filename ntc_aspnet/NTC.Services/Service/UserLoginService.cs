using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using NTC.Contract.Repositories.Entities;
using NTC.Contract.Repositories.IUOW;
using NTC.Contract.Services.Interface;
using NTC.Core.Base;
using NTC.Core.Security;
using NTC.Services.Security;
using NTC.Services.Shared;
namespace NTC.Services.Service;
public sealed class UserLoginService(IUnitOfWork work, ICurrentUser actor, TimeProvider clock,
    UserManager<ApplicationUser> users, IGoogleIdentityValidator google) : BaseService(work, actor, clock), IUserLoginService
{
    public async Task<bool> IsConnectedAsync(Guid userId, string provider)
    { RequireSelf(userId); return await Repository<ApplicationUserLogin>().Entities.AnyAsync(x => x.UserId == userId && x.LoginProvider == provider); }
    public async Task<IReadOnlyList<ApplicationUserLogin>> GetAllByUserAsync(Guid userId)
    { RequireSelf(userId); return await Repository<ApplicationUserLogin>().Entities.AsNoTracking().Where(x => x.UserId == userId).ToListAsync(); }
    public async Task ConnectAsync(Guid userId, string provider, string providerKey, string? displayName = null)
    {
        RequireSelf(userId); if (provider != "Google") throw DomainErrors.Invalid("Only Google linking is supported.");
        var identity = await google.ValidateAsync(providerKey); // Legacy parameter must now contain an ID token, never a raw subject.
        await InTransactionAsync(async () =>
        {
            var user = await users.FindByIdAsync(userId.ToString()) ?? throw DomainErrors.NotFound("Account");
            if (!string.Equals(user.Email, identity.Email, StringComparison.OrdinalIgnoreCase)) throw DomainErrors.Invalid("Google email must match the account email.");
            var owner = await users.FindByLoginAsync("Google", identity.Subject);
            if (owner != null && owner.Id != userId) throw DomainErrors.Conflict("This Google account is already linked.");
            if (owner?.Id == userId) return true;
            if ((await users.GetLoginsAsync(user)).Any(x => x.LoginProvider == "Google"))
                throw DomainErrors.Conflict("Unlink the current Google account before linking another one.");
            SessionSecurity.RequireSuccess(await users.AddLoginAsync(user, new("Google", identity.Subject, "Google")));
            await SessionSecurity.RevokeAllAsync(UnitOfWork, users, user, UtcNow); return true;
        });
    }
    public async Task DisconnectAsync(Guid userId, string provider)
    {
        RequireSelf(userId);
        await InTransactionAsync(async () =>
        {
            var user = await users.FindByIdAsync(userId.ToString()) ?? throw DomainErrors.NotFound("Account");
            var logins = await users.GetLoginsAsync(user); var login = logins.FirstOrDefault(x => x.LoginProvider == provider) ?? throw DomainErrors.NotFound("Login provider");
            if (!await users.HasPasswordAsync(user) && logins.Count <= 1) throw DomainErrors.Conflict("Set a password before removing your last sign-in method.");
            SessionSecurity.RequireSuccess(await users.RemoveLoginAsync(user, provider, login.ProviderKey));
            await SessionSecurity.RevokeAllAsync(UnitOfWork, users, user, UtcNow); return true;
        });
    }
}
