using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using NTC.Contract.Repositories.Entities;
using NTC.Contract.Repositories.Entities.Identity;
using NTC.Contract.Repositories.IUOW;
using NTC.Core.Base;
namespace NTC.Services.Security;
public static class SessionSecurity
{
    public static void RequireSuccess(IdentityResult result)
    {
        if (result.Errors.Any(x => x.Code == "ConcurrencyFailure")) throw DomainErrors.Conflict();
        if (!result.Succeeded) throw DomainErrors.Invalid(string.Join(" ", result.Errors.Select(x => x.Description)));
    }
    public static async Task RevokeAllAsync(IUnitOfWork work, UserManager<ApplicationUser> manager, ApplicationUser user, DateTimeOffset now)
    {
        RequireSuccess(await manager.UpdateSecurityStampAsync(user));
        foreach (var session in await work.GetRepository<RefreshSession>().Entities.Where(x => x.UserId == user.Id && x.RevokedAt == null).ToListAsync()) session.RevokedAt = now;
        await work.SaveAsync();
    }
}
