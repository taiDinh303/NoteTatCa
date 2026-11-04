using System.Net;
using System.Net.Http.Json;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.DependencyInjection;
using NTC.Contract.Repositories.Entities;
using NTC.Tests.Infrastructure;

namespace NTC.Tests.Integration;

public sealed class AdminPasswordResetTests
{
    [Fact]
    public async Task Admin_sends_owner_a_reset_link_without_changing_access_until_it_is_used()
    {
        using var f = new ApiFactory(); await f.InitializeAsync();
        var (owner, _) = await f.LoginAsync(); using var ownerClient = owner;
        var note = await ApiFactory.Note(owner);
        var (admin, _) = await f.LoginAsync("admin@example.test"); using var adminClient = admin;
        var result = await ApiFactory.Data(await admin.PostAsync($"/api/v1/admin/users/{f.A}/password-reset", null));
        Assert.True(result.GetBoolean()); // Never returns the recovery token or link to the administrator.
        var mail = Assert.Single(f.Email.Messages);
        Assert.Equal("a@example.test", mail.To); Assert.Equal("Reset your password", mail.Subject);
        Assert.True((await owner.GetAsync("/api/v1/notes")).IsSuccessStatusCode);

        var link = Regex.Matches(mail.Body, "href=['\"]([^'\"]+)['\"]")
            .Select(x => WebUtility.HtmlDecode(x.Groups[1].Value)).First(x => x.Contains("/auth/set-password"));
        var uri = new Uri(link); Assert.Equal("client.example.test", uri.Host);
        var query = QueryHelpers.ParseQuery(uri.Query);
        Assert.Equal(f.A.ToString(), query["userId"].ToString());
        using var anonymous = f.CreateClient();
        var token = query["token"].ToString();
        Assert.Equal(HttpStatusCode.BadRequest, (await anonymous.PostAsJsonAsync("/api/v1/auth/reset-password",
            new { userId = f.B, token, newPassword = "New-synthetic-password-123!" })).StatusCode);
        var body = new { userId = f.A, token, newPassword = "New-synthetic-password-123!" };
        Assert.True((await anonymous.PostAsJsonAsync("/api/v1/auth/reset-password", body)).IsSuccessStatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await owner.GetAsync("/api/v1/notes")).StatusCode);
        Assert.False((await anonymous.PostAsJsonAsync("/api/v1/auth/reset-password", body)).IsSuccessStatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.PostAsJsonAsync("/api/v1/auth/login",
            new { email = "a@example.test", password = ApiFactory.Password })).StatusCode);
        var session = await ApiFactory.Data(await anonymous.PostAsJsonAsync("/api/v1/auth/login",
            new { email = "a@example.test", password = body.newPassword }));
        anonymous.DefaultRequestHeaders.Authorization = new("Bearer", session.GetProperty("token").GetString());
        var preserved = await ApiFactory.Data(await anonymous.GetAsync($"/api/v1/notes/{note.GetProperty("id").GetGuid()}"));
        Assert.Equal(note.GetProperty("content").GetString(), preserved.GetProperty("content").GetString());
    }

    [Fact]
    public async Task Anonymous_and_ordinary_users_cannot_request_administrative_password_recovery()
    {
        using var f = new ApiFactory(); await f.InitializeAsync(); using var anonymous = f.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.PostAsync($"/api/v1/admin/users/{f.A}/password-reset", null)).StatusCode);
        var (user, _) = await f.LoginAsync(); using var owner = user;
        Assert.Equal(HttpStatusCode.Forbidden, (await user.PostAsync($"/api/v1/admin/users/{f.B}/password-reset", null)).StatusCode);
        Assert.Empty(f.Email.Messages);
    }

    [Theory]
    [InlineData("locked")]
    [InlineData("deactivated")]
    [InlineData("unverified")]
    [InlineData("missing")]
    public async Task Ineligible_accounts_do_not_receive_recovery_mail(string state)
    {
        using var f = new ApiFactory(); await f.InitializeAsync();
        using (var scope = f.Services.CreateScope())
        {
            var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var user = (await users.FindByIdAsync(f.A.ToString()))!;
            user.IsLocked = state == "locked";
            if (state == "deactivated") user.DeletedTime = f.Clock.GetUtcNow();
            if (state == "unverified") user.EmailConfirmed = false;
            Assert.True((await users.UpdateAsync(user)).Succeeded);
        }
        var (admin, _) = await f.LoginAsync("admin@example.test"); using var client = admin;
        var target = state == "missing" ? Guid.NewGuid() : f.A;
        Assert.Equal(state == "missing" ? HttpStatusCode.NotFound : HttpStatusCode.BadRequest,
            (await admin.PostAsync($"/api/v1/admin/users/{target}/password-reset", null)).StatusCode);
        Assert.Empty(f.Email.Messages);
    }

    [Fact]
    public async Task Email_failure_does_not_change_the_password_or_revoke_sessions_and_can_be_retried()
    {
        using var f = new ApiFactory(); await f.InitializeAsync();
        var (owner, _) = await f.LoginAsync(); using var ownerClient = owner;
        var (admin, _) = await f.LoginAsync("admin@example.test"); using var client = admin;
        f.Email.Fail = true;
        Assert.Equal(HttpStatusCode.InternalServerError, (await admin.PostAsync($"/api/v1/admin/users/{f.A}/password-reset", null)).StatusCode);
        Assert.Empty(f.Email.Messages); Assert.True((await owner.GetAsync("/api/v1/notes")).IsSuccessStatusCode);
        f.Email.Fail = false;
        Assert.True((await admin.PostAsync($"/api/v1/admin/users/{f.A}/password-reset", null)).IsSuccessStatusCode);
        Assert.Single(f.Email.Messages);
    }

    [Fact]
    public async Task Recovery_requests_use_the_existing_authentication_rate_limit()
    {
        using var f = new ApiFactory { AuthLimit = 2 }; await f.InitializeAsync();
        var (admin, _) = await f.LoginAsync("admin@example.test"); using var client = admin;
        Assert.True((await admin.PostAsync($"/api/v1/admin/users/{f.A}/password-reset", null)).IsSuccessStatusCode);
        Assert.Equal(HttpStatusCode.TooManyRequests, (await admin.PostAsync($"/api/v1/admin/users/{f.A}/password-reset", null)).StatusCode);
        Assert.Single(f.Email.Messages);
    }
}
