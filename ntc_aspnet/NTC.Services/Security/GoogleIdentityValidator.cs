using Google.Apis.Auth;
using Microsoft.Extensions.Configuration;
using NTC.Contract.Services.Interface;
using NTC.Core.Base;
namespace NTC.Services.Security;
public sealed class GoogleIdentityValidator(IConfiguration config) : IGoogleIdentityValidator
{
    public async Task<GoogleIdentity> ValidateAsync(string idToken)
    {
        if (config.GetValue<bool?>("Authentication:Google:Enabled") == false || string.IsNullOrWhiteSpace(config["Authentication:Google:ClientId"]))
            throw new BaseException.ErrorException(503, "GOOGLE_DISABLED", "Google sign-in is not configured.");
        if (string.IsNullOrWhiteSpace(idToken) || idToken.Length > 16_384) throw DomainErrors.Invalid("Invalid Google token.");
        try
        {
            var payload = await GoogleJsonWebSignature.ValidateAsync(idToken, new GoogleJsonWebSignature.ValidationSettings
            { Audience = [config["Authentication:Google:ClientId"]!] });
            if (!payload.EmailVerified || string.IsNullOrEmpty(payload.Email) || string.IsNullOrEmpty(payload.Subject)) throw DomainErrors.Unauthorized();
            return new(payload.Subject, payload.Email, payload.GivenName, payload.FamilyName, payload.Picture);
        }
        catch (InvalidJwtException) { throw DomainErrors.Unauthorized(); }
    }
}
