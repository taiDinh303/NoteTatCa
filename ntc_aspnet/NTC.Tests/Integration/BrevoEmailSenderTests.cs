using System.Net;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using NTC.Services.Infrastructure;

namespace NTC.Tests.Integration;

public sealed class BrevoEmailSenderTests
{
    private static IConfiguration Configuration(string? key = "synthetic-api-key") =>
        new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Email:Brevo:ApiKey"] = key,
            ["Email:FromEmail"] = "sender@example.test",
            ["Email:FromName"] = "NoteTatCa"
        }).Build();

    [Fact]
    public async Task Sends_html_to_the_requested_recipient_over_https()
    {
        var handler = new Handler(async request =>
        {
            Assert.Equal(HttpMethod.Post, request.Method);
            Assert.Equal("https://api.brevo.com/v3/smtp/email", request.RequestUri!.AbsoluteUri);
            Assert.Equal("synthetic-api-key", Assert.Single(request.Headers.GetValues("api-key")));
            using var json = JsonDocument.Parse(await request.Content!.ReadAsStringAsync());
            var body = json.RootElement;
            Assert.Equal("sender@example.test", body.GetProperty("sender").GetProperty("email").GetString());
            Assert.Equal("NoteTatCa", body.GetProperty("sender").GetProperty("name").GetString());
            Assert.Equal("owner@example.test", body.GetProperty("to")[0].GetProperty("email").GetString());
            Assert.Equal("Verify email", body.GetProperty("subject").GetString());
            Assert.Equal("<p>synthetic OTP</p>", body.GetProperty("htmlContent").GetString());
            return new(HttpStatusCode.Created);
        });
        using var client = new HttpClient(handler);
        await new BrevoEmailSender(client, Configuration()).SendEmailAsync("owner@example.test", "Verify email", "<p>synthetic OTP</p>");
        Assert.Equal(1, handler.Calls);
    }

    [Theory]
    [InlineData(400)]
    [InlineData(401)]
    [InlineData(429)]
    [InlineData(500)]
    public async Task Provider_errors_are_redacted_and_not_automatically_retried(int status)
    {
        var handler = new Handler(_ => Task.FromResult(new HttpResponseMessage((HttpStatusCode)status)
        { Content = new StringContent("private provider error synthetic-api-key owner@example.test") }));
        using var client = new HttpClient(handler);
        var error = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            new BrevoEmailSender(client, Configuration()).SendEmailAsync("owner@example.test", "Subject", "private body"));
        Assert.Equal($"Email provider rejected the request (HTTP {status}).", error.Message);
        Assert.Equal(1, handler.Calls);
    }

    [Fact]
    public async Task Missing_key_does_not_send_a_request()
    {
        var handler = new Handler(_ => throw new InvalidOperationException("Must not send"));
        using var client = new HttpClient(handler);
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            new BrevoEmailSender(client, Configuration(null)).SendEmailAsync("owner@example.test", "Subject", "body"));
        Assert.Equal(0, handler.Calls);
    }

    private sealed class Handler(Func<HttpRequestMessage, Task<HttpResponseMessage>> send) : HttpMessageHandler
    {
        public int Calls { get; private set; }
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        { Calls++; return send(request); }
    }
}
