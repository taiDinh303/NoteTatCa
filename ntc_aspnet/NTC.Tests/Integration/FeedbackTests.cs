using System.Net;
using System.Net.Http.Json;
using NTC.Tests.Infrastructure;
namespace NTC.Tests.Integration;
public sealed class FeedbackTests
{
    [Fact]
    public async Task Feedback_requires_login_validates_encodes_and_sends_to_fixed_recipient()
    {
        using var f = new ApiFactory(); await f.InitializeAsync();
        using var anonymous = f.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.PostAsJsonAsync("/api/v1/feedback", new { kind = "Report a problem", message = "test" })).StatusCode);
        var (admin, _) = await f.LoginAsync("admin@example.test"); using var adminClient = admin;
        Assert.Equal(HttpStatusCode.Forbidden, (await admin.PostAsJsonAsync("/api/v1/feedback", new { kind = "Ask a question", message = "admin" })).StatusCode);
        var (client, _) = await f.LoginAsync(); using var owned = client;
        foreach (var data in new[] {
            new { kind = "Other", message = "test" },
            new { kind = "Report a problem", message = "   " },
            new { kind = "Report a problem", message = new string('x', 5001) } })
            Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/v1/feedback", data)).StatusCode);
        var before = f.Email.Messages.Count;
        await ApiFactory.Data(await client.PostAsJsonAsync("/api/v1/feedback", new { kind = "Report a problem", message = "<script>private draft</script>", to = "attacker@example.test" }));
        Assert.Equal(before + 1, f.Email.Messages.Count);
        var sent = f.Email.Messages.Last();
        Assert.Equal("lmht016847@gmail.com", sent.To);
        Assert.Contains("a@example.test", sent.Body);
        Assert.Contains("&lt;script&gt;private draft&lt;/script&gt;", sent.Body);
        Assert.DoesNotContain("<script>", sent.Body);
        f.Email.Fail = true;
        Assert.Equal(HttpStatusCode.InternalServerError, (await client.PostAsJsonAsync("/api/v1/feedback", new { kind = "Ask a question", message = "synthetic failure" })).StatusCode);
        Assert.Equal(before + 1, f.Email.Messages.Count);
        Assert.Equal(HttpStatusCode.TooManyRequests, (await client.PostAsJsonAsync("/api/v1/feedback", new { kind = "Ask a question", message = "rate limit" })).StatusCode);
    }
}
