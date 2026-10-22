using System.Net.Http.Json;
using Microsoft.Extensions.Configuration;
using NTC.Contract.Services.Interface;

namespace NTC.Services.Infrastructure;

/// <summary>Transactional email over HTTPS; never logs provider bodies or credentials.</summary>
public sealed class BrevoEmailSender(HttpClient client, IConfiguration config) : IEmailSender
{
    public async Task SendEmailAsync(string to, string subject, string htmlBody)
    {
        var key = config["Email:Brevo:ApiKey"];
        var from = config["Email:FromEmail"];
        if (string.IsNullOrWhiteSpace(key) || string.IsNullOrWhiteSpace(from))
            throw new InvalidOperationException("Brevo email is not configured.");
        using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.brevo.com/v3/smtp/email");
        request.Headers.Add("api-key", key);
        request.Content = JsonContent.Create(new
        {
            sender = new { email = from, name = config["Email:FromName"] ?? "NoteTatCa" },
            to = new[] { new { email = to } },
            subject,
            htmlContent = htmlBody
        });
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(30));
        // No automatic retry: a timed-out send may already have been accepted.
        using var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, timeout.Token);
        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException($"Email provider rejected the request (HTTP {(int)response.StatusCode}).");
    }
}
