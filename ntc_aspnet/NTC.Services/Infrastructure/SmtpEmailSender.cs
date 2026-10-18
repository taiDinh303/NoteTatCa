using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Configuration;
using NTC.Contract.Services.Interface;
namespace NTC.Services.Infrastructure;
public sealed class SmtpEmailSender(IConfiguration config) : IEmailSender
{
    public async Task SendEmailAsync(string to, string subject, string htmlBody)
    {
        var smtp = config.GetSection("SmtpSettings");
        if (string.IsNullOrWhiteSpace(smtp["Host"]) || string.IsNullOrWhiteSpace(smtp["FromEmail"]))
            throw new InvalidOperationException("SMTP is not configured.");
        using var client = new SmtpClient(smtp["Host"]!, smtp.GetValue<int?>("Port") ?? 587)
        { Credentials = new NetworkCredential(smtp["FromEmail"], smtp["Password"]), EnableSsl = smtp.GetValue<bool?>("EnableSsl") ?? true };
        using var mail = new MailMessage(smtp["FromEmail"]!, to, subject, htmlBody) { IsBodyHtml = true };
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(30));
        await client.SendMailAsync(mail, timeout.Token);
    }
}
