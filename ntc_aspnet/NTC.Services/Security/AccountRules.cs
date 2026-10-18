using System.Net.Mail;
using NTC.Core.Base;

namespace NTC.Services.Security;

public static class AccountRules
{
    public static string Email(string? value)
    {
        var email = value?.Trim() ?? string.Empty;
        if (email.Length > 256 || !MailAddress.TryCreate(email, out var address) || address.Address != email)
            throw DomainErrors.Invalid("A valid email address is required.");
        return email;
    }
    public static void NewPassword(string? value)
    {
        if (value is null || value.Length is < 8 or > 1024)
            throw DomainErrors.Invalid("Passwords must contain 8 to 1,024 characters.");
    }
}
