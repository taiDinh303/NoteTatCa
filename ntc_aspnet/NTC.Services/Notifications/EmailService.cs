using System.Text;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Configuration;
using NTC.Contract.Repositories.Entities;
using NTC.Contract.Services.Interface;
using NTC.Services.Infrastructure;

namespace NTC.Services.Notifications;

public sealed class EmailService : IEmailService
{
    private readonly IEmailSender _sender;
    private readonly EmailTemplateRenderer _renderer;
    private readonly string _clientUrl;
    public EmailService(IEmailSender sender, EmailTemplateRenderer renderer, IConfiguration config)
    {
        _sender = sender; _renderer = renderer;
        if (!Uri.TryCreate(config["AppSettings:ClientUrl"], UriKind.Absolute, out var url)
            || url.Scheme is not ("http" or "https") || url.UserInfo.Length != 0 || url.Query.Length != 0 || url.Fragment.Length != 0)
            throw new InvalidOperationException("ClientUrl must be an absolute HTTP(S) application URL without credentials, query or fragment.");
        _clientUrl = url.AbsoluteUri.TrimEnd('/');
    }
    private string Link(string path, ApplicationUser user, string token, string? newEmail = null)
    {
        var query = new Dictionary<string, string?> { ["userId"] = user.Id.ToString(),
            ["token"] = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(token)) };
        if (newEmail != null) query["newEmail"] = newEmail;
        return QueryHelpers.AddQueryString(_clientUrl + path, query);
    }
    public Task SendVerificationCodeAsync(string email, string code) =>
        _sender.SendEmailAsync(email, "Your NoteTatCa confirmation code", _renderer.RenderVerificationCode(code));
    public Task SendChangeEmailConfirmationAsync(ApplicationUser user, string token, string newEmail) =>
        _sender.SendEmailAsync(newEmail, "Confirm new email", _renderer.RenderChangeEmail(user.UserName ?? "there", Link("/auth/confirm-change-email", user, token, newEmail), newEmail));
    public Task SendSetPasswordLinkAsync(ApplicationUser user, string token) =>
        _sender.SendEmailAsync(user.Email!, "Set password for your account", _renderer.RenderSetPasswordLink(user.UserName ?? "there", Link("/auth/set-password", user, token)));
    public Task SendForgotPasswordLinkAsync(ApplicationUser user, string token) =>
        _sender.SendEmailAsync(user.Email!, "Reset your password", _renderer.RenderForgotPassword(user.UserName ?? "there", Link("/auth/set-password", user, token)));
}
