using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using NTC.Contract.Repositories.Entities.Identity;
using NTC.Contract.Repositories.IUOW;
using NTC.Contract.Services.Interface;
using NTC.Core.Base;
namespace NTC.Services.Infrastructure;
public sealed class OtpService(IUnitOfWork work, TimeProvider clock, IConfiguration config) : IOtpService
{
    public string GenerateConfirmationCode() => RandomNumberGenerator.GetInt32(100_000, 1_000_000).ToString(System.Globalization.CultureInfo.InvariantCulture);
    private string Hash(string email, string code) => Convert.ToHexString(HMACSHA256.HashData(
        Encoding.UTF8.GetBytes(config["Jwtsettings:Key"] ?? throw new InvalidOperationException("JWT key is required.")), Encoding.UTF8.GetBytes(email + ":" + code)));
    private static string Normalize(string email)
    {
        email = email.Trim().ToUpperInvariant();
        if (email.Length > 256 || !System.Net.Mail.MailAddress.TryCreate(email, out var address) || address.Address != email)
            throw DomainErrors.Invalid("A valid email address is required.");
        return email;
    }
    public async Task StoreAsync(string email, string code, DateTime expiration)
    {
        email = Normalize(email); var now = clock.GetUtcNow();
        var challenge = await work.GetRepository<EmailChallenge>().Entities.FirstOrDefaultAsync(x => x.Email == email);
        if (challenge != null && challenge.LastSentAt > now.AddSeconds(-60))
            throw new BaseException.ErrorException(429, "RATE_LIMITED", "Wait before requesting another code.");
        if (challenge == null) { challenge = new EmailChallenge { Email = email }; await work.GetRepository<EmailChallenge>().InsertAsync(challenge); }
        challenge.CodeHash = Hash(email, code); challenge.Attempts = 0; challenge.LastSentAt = now;
        challenge.ExpiresAt = new DateTimeOffset(DateTime.SpecifyKind(expiration, DateTimeKind.Utc));
        await work.SaveAsync();
    }
    public async Task<bool> ValidateAsync(string email, string code)
    {
        email = Normalize(email); var now = clock.GetUtcNow();
        var challenge = await work.GetRepository<EmailChallenge>().Entities.FirstOrDefaultAsync(x => x.Email == email);
        if (challenge == null || challenge.ExpiresAt <= now || challenge.Attempts >= 5) return false;
        challenge.Attempts++;
        var valid = CryptographicOperations.FixedTimeEquals(Encoding.ASCII.GetBytes(challenge.CodeHash), Encoding.ASCII.GetBytes(Hash(email, code ?? "")));
        if (valid) await work.GetRepository<EmailChallenge>().DeleteAsync(challenge);
        await work.SaveAsync(); return valid;
    }
}
