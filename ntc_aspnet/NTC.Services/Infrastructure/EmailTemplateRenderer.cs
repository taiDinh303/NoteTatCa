using System.Text.Encodings.Web;

namespace NTC.Services.Infrastructure;

public sealed class EmailTemplateRenderer
{
    private static string Safe(string? value) => HtmlEncoder.Default.Encode(value ?? string.Empty);
    public string RenderVerificationCode(string code) =>
        $"<p>Hello,</p><p>Your NoteTatCa confirmation code is:</p><h2>{Safe(code)}</h2><p>The code expires in 10 minutes.</p>";
    public string RenderChangeEmail(string username, string link, string newEmail) =>
        $"<p>Hello {Safe(username)},</p><p>You requested to change your email to <strong>{Safe(newEmail)}</strong>.</p><p><a href='{Safe(link)}'>Confirm new email</a></p>";
    public string RenderSetPasswordLink(string username, string link) =>
        $"<p>Hello {Safe(username)},</p><p>Use this link to set a password for your NoteTatCa account.</p><p><a href='{Safe(link)}'>Set password</a></p>";
    public string RenderForgotPassword(string username, string link) =>
        $"<p>Hello {Safe(username)},</p><p>We received a request to reset your password.</p><p><a href='{Safe(link)}'>Reset password</a></p><p>If you did not request this, ignore this email.</p>";
}
