using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using NTC.Contract.Repositories.Entities;
using NTC.Contract.Repositories.Entities.Identity;
using NTC.Contract.Repositories.Entities.Tasks;
using NTC.Contract.Services.Interface;
using NTC.Repositories.Context;
using NTC.Services.Infrastructure;
using NTC.Services.Notifications;
using NTC.Tests.Infrastructure;

namespace NTC.Tests.Integration;

public sealed class ServiceControllerTests
{
    private static Guid Id(JsonElement value) => value.GetProperty("id").GetGuid();
    private static Guid Version(JsonElement value) => value.GetProperty("version").GetGuid();

    [Fact]
    public async Task Tag_patch_preserves_omitted_values_clears_null_and_rejects_stale_or_foreign_edits()
    {
        using var f = new ApiFactory(); await f.InitializeAsync();
        var (a, _) = await f.LoginAsync(); using var ca = a;
        var (b, _) = await f.LoginAsync("b@example.test"); using var cb = b;
        var tag = await ApiFactory.Data(await a.PostAsJsonAsync("/api/v1/tags", new { name = "Keep", color = "#abcdef", icon = "😀" }));
        var path = $"/api/v1/tags/{Id(tag)}";
        Assert.Equal(HttpStatusCode.BadRequest, (await a.PatchAsJsonAsync(path, new { name = "Missing version" })).StatusCode);
        var changed = await ApiFactory.Data(await a.PatchAsJsonAsync(path, new { version = Version(tag), color = (string?)null }));
        Assert.Equal("Keep", changed.GetProperty("name").GetString());
        Assert.Equal("😀", changed.GetProperty("icon").GetString()); Assert.Equal(JsonValueKind.Null, changed.GetProperty("color").ValueKind);
        Assert.NotEqual(Version(tag), Version(changed));
        Assert.Equal(HttpStatusCode.Conflict, (await a.PatchAsJsonAsync(path, new { version = Version(tag), name = "Stale" })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await a.PatchAsJsonAsync(path, new { version = Version(changed), name = (string?)null })).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await b.PatchAsJsonAsync(path, new { version = Version(changed), name = "Foreign" })).StatusCode);
    }

    [Fact]
    public async Task Reminder_email_patch_preserves_schedule_cursor_and_cancels_only_pending_email()
    {
        using var f = new ApiFactory(); await f.InitializeAsync(); var (a, _) = await f.LoginAsync(); using var ca = a;
        var (b, _) = await f.LoginAsync("b@example.test"); using var cb = b;
        var note = await ApiFactory.Note(a); var at = f.Clock.GetUtcNow().AddMinutes(1);
        var reminder = await ApiFactory.Data(await a.PostAsJsonAsync($"/api/v1/notes/{Id(note)}/reminders", new { reminderAt = at, repeatType = 1, repeatCount = 10 }));
        f.Clock.Advance(TimeSpan.FromMinutes(2));
        using (var scope = f.Services.CreateScope()) Assert.Equal(1, await scope.ServiceProvider.GetRequiredService<IBackgroundMaintenanceService>().DispatchRemindersAsync());
        var path = $"/api/v1/reminders/{Id(reminder)}";
        reminder = await ApiFactory.Data(await a.GetAsync(path));
        var changed = await ApiFactory.Data(await a.PatchAsJsonAsync(path, new { version = Version(reminder), sendEmail = false }));
        Assert.Equal(reminder.GetProperty("reminderAt").GetDateTimeOffset(), changed.GetProperty("reminderAt").GetDateTimeOffset());
        Assert.Equal(reminder.GetProperty("nextOccurrenceAt").GetDateTimeOffset(), changed.GetProperty("nextOccurrenceAt").GetDateTimeOffset());
        Assert.Equal(10, changed.GetProperty("repeatCount").GetInt32()); Assert.True(changed.GetProperty("isActive").GetBoolean());
        using (var scope = f.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<DatabaseContext>();
            Assert.Equal(1, (await db.Reminders.SingleAsync()).OccurrencesProcessed);
            var pending = await db.ReminderDeliveries.SingleAsync(); Assert.True(pending.Abandoned); Assert.NotNull(pending.AbandonedAt);
            Assert.Equal(0, await scope.ServiceProvider.GetRequiredService<IBackgroundMaintenanceService>().DeliverEmailsAsync());
        }
        Assert.Equal(HttpStatusCode.Conflict, (await a.PatchAsJsonAsync(path, new { version = Version(reminder), sendEmail = true })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await a.PatchAsJsonAsync(path, new { version = Version(changed), reminderAt = (DateTimeOffset?)null })).StatusCode);
        var cleared = await ApiFactory.Data(await a.PatchAsJsonAsync(path, new { version = Version(changed), repeatCount = (int?)null }));
        Assert.Equal(JsonValueKind.Null, cleared.GetProperty("repeatCount").ValueKind);
        Assert.Equal(HttpStatusCode.NotFound, (await b.PatchAsJsonAsync(path, new { version = Version(cleared), isActive = false })).StatusCode);
    }

    [Fact]
    public async Task Reenabling_a_sixth_reminder_fails_and_trashed_note_reminders_cannot_be_edited()
    {
        using var f = new ApiFactory(); await f.InitializeAsync(); var (a, _) = await f.LoginAsync(); using var ca = a;
        var note = await ApiFactory.Note(a); var path = $"/api/v1/notes/{Id(note)}/reminders";
        var first = await ApiFactory.Data(await a.PostAsJsonAsync(path, new { reminderAt = f.Clock.GetUtcNow().AddHours(1) }));
        first = await ApiFactory.Data(await a.PatchAsJsonAsync($"/api/v1/reminders/{Id(first)}", new { version = Version(first), isActive = false }));
        for (var i = 0; i < 5; i++) await ApiFactory.Data(await a.PostAsJsonAsync(path, new { reminderAt = f.Clock.GetUtcNow().AddHours(i + 2) }));
        Assert.Equal(HttpStatusCode.BadRequest, (await a.PatchAsJsonAsync($"/api/v1/reminders/{Id(first)}", new { version = Version(first), isActive = true })).StatusCode);
        Assert.True((await a.PostAsync($"/api/v1/notes/{Id(note)}/trash", null)).IsSuccessStatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await a.PatchAsJsonAsync($"/api/v1/reminders/{Id(first)}", new { version = Version(first), sendEmail = false })).StatusCode);
    }

    [Fact]
    public async Task Profile_patch_supports_clear_and_timezone_changes_invalidate_old_versions()
    {
        using var f = new ApiFactory(); await f.InitializeAsync(); var (a, _) = await f.LoginAsync(); using var ca = a;
        var profile = await ApiFactory.Data(await a.GetAsync("/api/v1/me/profile"));
        var filled = await ApiFactory.Data(await a.PatchAsJsonAsync("/api/v1/me", new { version = Version(profile), familyName = "Family", locale = "en", address = "Home", birthDate = "2000-01-01", picture = "https://example.test/avatar.png" }));
        var cleared = await ApiFactory.Data(await a.PatchAsJsonAsync("/api/v1/me", new { version = Version(filled), familyName = (string?)null, locale = (string?)null, address = (string?)null, birthDate = (string?)null, picture = (string?)null, timeZoneId = "UTC" }));
        foreach (var field in new[] { "familyName", "locale", "address", "birthDate", "picture" }) Assert.Equal(JsonValueKind.Null, cleared.GetProperty(field).ValueKind);
        Assert.Equal("Test", cleared.GetProperty("givenName").GetString()); Assert.Equal("UTC", cleared.GetProperty("timeZoneId").GetString());
        Assert.NotEqual(Version(filled), Version(cleared));
        Assert.Equal(HttpStatusCode.Conflict, (await a.PatchAsJsonAsync("/api/v1/me", new { version = Version(filled), givenName = "Stale" })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await a.PatchAsJsonAsync("/api/v1/me", new { version = Version(cleared), givenName = (string?)null })).StatusCode);
        var account = (await ApiFactory.Data(await a.GetAsync("/api/v1/me"))).GetProperty("account"); Assert.Equal("UTC", account.GetProperty("timeZoneId").GetString());
    }

    [Fact]
    public async Task Missing_legacy_profile_can_be_created_for_self_and_account_patch_cannot_overpost_security_fields()
    {
        using var f = new ApiFactory(); await f.InitializeAsync(); var (a, _) = await f.LoginAsync(); using var ca = a;
        using (var scope = f.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<DatabaseContext>(); db.UserInfos.Remove(await db.UserInfos.SingleAsync(x => x.Id == f.A)); await db.SaveChangesAsync();
        }
        Assert.Equal(JsonValueKind.Null, (await ApiFactory.Data(await a.GetAsync("/api/v1/me"))).GetProperty("profile").ValueKind);
        var response = await a.PostAsJsonAsync("/api/v1/me/profile", new { givenName = "New", userId = f.B });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode); Assert.Equal("/api/v1/me/profile", response.Headers.Location!.OriginalString);
        var created = await ApiFactory.Data(response); Assert.Equal(f.A, created.GetProperty("userId").GetGuid());
        Assert.Equal(HttpStatusCode.Conflict, (await a.PostAsJsonAsync("/api/v1/me/profile", new { givenName = "Duplicate" })).StatusCode);
        var patched = await ApiFactory.Data(await a.PatchAsJsonAsync("/api/v1/me/account", new { phoneNumber = "0123456", email = "attacker@example.test", isLocked = true, emailConfirmed = false, role = "Admin", id = f.B }));
        Assert.Equal("a@example.test", patched.GetProperty("email").GetString()); Assert.False(patched.GetProperty("isLocked").GetBoolean()); Assert.True(patched.GetProperty("emailConfirmed").GetBoolean());
        var unchanged = await ApiFactory.Data(await a.PatchAsJsonAsync("/api/v1/me/account", new { })); Assert.Equal("0123456", unchanged.GetProperty("phoneNumber").GetString());
        var cleared = await ApiFactory.Data(await a.PatchAsJsonAsync("/api/v1/me/account", new { phoneNumber = (string?)null })); Assert.Equal(JsonValueKind.Null, cleared.GetProperty("phoneNumber").ValueKind);
        Assert.Equal(HttpStatusCode.Forbidden, (await a.GetAsync("/api/v1/admin/users")).StatusCode);
    }

    [Fact]
    public async Task Sessions_are_private_metadata_and_revoking_a_rotated_family_preserves_other_devices()
    {
        using var f = new ApiFactory(); await f.InitializeAsync(); var (a, _) = await f.LoginAsync(); using var ca = a;
        var (second, original) = await f.LoginAsync(); using var cs = second;
        var (b, _) = await f.LoginAsync("b@example.test"); using var cb = b;
        var rows = (await ApiFactory.Data(await a.GetAsync("/api/v1/me/sessions"))).GetProperty("items").EnumerateArray().ToArray();
        Assert.Equal(2, rows.Length); Assert.Single(rows, x => x.GetProperty("isCurrent").GetBoolean());
        foreach (var row in rows) Assert.Equal(new[] { "createdAt", "expiresAt", "id", "isCurrent" }, row.EnumerateObject().Select(x => x.Name).Order().ToArray());
        var oldId = Id(rows.Single(x => !x.GetProperty("isCurrent").GetBoolean()));
        using var anon = f.CreateClient();
        var rotated = await ApiFactory.Data(await anon.PostAsJsonAsync("/api/v1/auth/refresh", new { refreshToken = original.GetProperty("refreshToken").GetString() }));
        second.DefaultRequestHeaders.Authorization = new("Bearer", rotated.GetProperty("token").GetString());
        Assert.Equal(HttpStatusCode.NotFound, (await b.DeleteAsync($"/api/v1/me/sessions/{oldId}")).StatusCode);
        Assert.True((await second.GetAsync("/api/v1/me")).IsSuccessStatusCode);
        Assert.True((await a.DeleteAsync($"/api/v1/me/sessions/{oldId}")).IsSuccessStatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await second.GetAsync("/api/v1/me")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anon.PostAsJsonAsync("/api/v1/auth/refresh", new { refreshToken = rotated.GetProperty("refreshToken").GetString() })).StatusCode);
        Assert.True((await a.GetAsync("/api/v1/me")).IsSuccessStatusCode); Assert.True((await b.GetAsync("/api/v1/me")).IsSuccessStatusCode);
    }

    [Fact]
    public async Task Admin_deactivation_restore_is_audited_preserves_notes_and_does_not_restore_tokens_or_unlock()
    {
        using var f = new ApiFactory(); await f.InitializeAsync(); var (a, session) = await f.LoginAsync(); using var ca = a;
        var note = await ApiFactory.Note(a, "Owner content must never be in admin responses");
        var (admin, _) = await f.LoginAsync("admin@example.test"); using var cad = admin;
        var path = $"/api/v1/admin/users/{f.A}";
        Assert.True((await admin.PatchAsJsonAsync(path + "/lock", new { isLocked = true })).IsSuccessStatusCode);
        Assert.True((await admin.PostAsync(path + "/deactivate", null)).IsSuccessStatusCode);
        Assert.Empty((await ApiFactory.Data(await admin.GetAsync("/api/v1/admin/users?q=A%40EXAMPLE.TEST"))).GetProperty("items").EnumerateArray());
        var hidden = (await ApiFactory.Data(await admin.GetAsync("/api/v1/admin/users?includeDeactivated=true&q=A%40EXAMPLE.TEST"))).GetProperty("items").EnumerateArray().Single();
        Assert.Equal(f.A, Id(hidden)); Assert.NotEqual(JsonValueKind.Null, hidden.GetProperty("deactivatedAt").ValueKind);
        var restored = await ApiFactory.Data(await admin.PostAsync(path + "/restore", null)); Assert.True(restored.GetProperty("isLocked").GetBoolean()); Assert.Equal(JsonValueKind.Null, restored.GetProperty("deactivatedAt").ValueKind);
        Assert.DoesNotContain("Owner content", restored.GetRawText());
        using var anon = f.CreateClient(); Assert.Equal(HttpStatusCode.Forbidden, (await anon.PostAsJsonAsync("/api/v1/auth/login", new { email = "a@example.test", password = ApiFactory.Password })).StatusCode);
        Assert.True((await admin.PatchAsJsonAsync(path + "/lock", new { isLocked = false })).IsSuccessStatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await a.GetAsync("/api/v1/me")).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anon.PostAsJsonAsync("/api/v1/auth/refresh", new { refreshToken = session.GetProperty("refreshToken").GetString() })).StatusCode);
        var (fresh, _) = await f.LoginAsync(); using var cf = fresh; Assert.True((await fresh.GetAsync($"/api/v1/notes/{Id(note)}")).IsSuccessStatusCode);
        Assert.True((await admin.PostAsync(path + "/restore", null)).IsSuccessStatusCode);
        using var scope = f.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<DatabaseContext>();
        Assert.Single(await db.AdministrativeAuditEvents.Where(x => x.TargetUserId == f.A && x.Action == AdministrativeAction.AccountReactivated).ToListAsync());
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsync($"/api/v1/admin/users/{f.Admin}/deactivate", null)).StatusCode);
    }

    [Fact]
    public async Task Admin_role_routes_guard_builtins_and_membership_changes_revoke_the_target_sessions()
    {
        using var f = new ApiFactory(); await f.InitializeAsync(); var (admin, _) = await f.LoginAsync("admin@example.test"); using var cad = admin;
        var (a, _) = await f.LoginAsync(); using var ca = a; using var anon = f.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anon.GetAsync("/api/v1/admin/roles")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await a.PostAsJsonAsync("/api/v1/admin/roles", new { name = "Forbidden" })).StatusCode);
        var response = await admin.PostAsJsonAsync("/api/v1/admin/roles", new { name = "Reviewer", description = "Metadata" }); Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var role = await ApiFactory.Data(response); var path = $"/api/v1/admin/roles/{Id(role)}";
        role = await ApiFactory.Data(await admin.PatchAsJsonAsync(path, new { description = (string?)null })); Assert.Equal("Reviewer", role.GetProperty("name").GetString()); Assert.Equal(string.Empty, role.GetProperty("description").GetString());
        using (var scope = f.Services.CreateScope()) Assert.Null((await scope.ServiceProvider.GetRequiredService<DatabaseContext>().Roles.SingleAsync(x => x.Id == Id(role))).Description);
        var membership = $"/api/v1/admin/users/{f.A}/roles/{Id(role)}"; Assert.True((await admin.PutAsync(membership, null)).IsSuccessStatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await a.GetAsync("/api/v1/me")).StatusCode);
        var assigned = await ApiFactory.Data(await admin.GetAsync($"/api/v1/admin/users/{f.A}/roles")); Assert.Contains(assigned.EnumerateArray(), x => Id(x) == Id(role));
        Assert.True((await admin.DeleteAsync(membership)).IsSuccessStatusCode); Assert.True((await admin.DeleteAsync(path)).IsSuccessStatusCode);
        var roles = (await ApiFactory.Data(await admin.GetAsync("/api/v1/admin/roles"))).GetProperty("items"); var builtin = roles.EnumerateArray().Single(x => x.GetProperty("name").GetString() == "Admin");
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PatchAsJsonAsync($"/api/v1/admin/roles/{Id(builtin)}", new { name = "Renamed" })).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await admin.DeleteAsync($"/api/v1/admin/roles/{Id(builtin)}")).StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await admin.DeleteAsync($"/api/v1/admin/users/{f.Admin}/roles/{Id(builtin)}")).StatusCode);
    }

    [Fact]
    public async Task Inbox_bulk_read_counts_only_owned_notifications_of_active_notes()
    {
        using var f = new ApiFactory(); await f.InitializeAsync(); var (a, _) = await f.LoginAsync(); using var ca = a; var (b, _) = await f.LoginAsync("b@example.test"); using var cb = b;
        var active = Id(await ApiFactory.Note(a)); var trash = Id(await ApiFactory.Note(a)); var foreign = Id(await ApiFactory.Note(b));
        using (var scope = f.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<DatabaseContext>();
            foreach (var note in new[] { active, trash, foreign }) db.Reminders.Add(new() { NoteId = note, ReminderAt = f.Clock.GetUtcNow().AddSeconds(-1), NextOccurrenceAt = f.Clock.GetUtcNow().AddSeconds(-1), SendEmail = false });
            await db.SaveChangesAsync(); Assert.Equal(3, await scope.ServiceProvider.GetRequiredService<IBackgroundMaintenanceService>().DispatchRemindersAsync());
        }
        Assert.True((await a.PostAsync($"/api/v1/notes/{trash}/trash", null)).IsSuccessStatusCode);
        Assert.Equal(1, (await ApiFactory.Data(await a.GetAsync("/api/v1/notifications/unread-count"))).GetInt32());
        Assert.Equal(1, (await ApiFactory.Data(await a.PatchAsync("/api/v1/notifications/read-all", null))).GetInt32());
        Assert.Equal(0, (await ApiFactory.Data(await a.PatchAsync("/api/v1/notifications/read-all", null))).GetInt32());
        Assert.Equal(1, (await ApiFactory.Data(await b.GetAsync("/api/v1/notifications/unread-count"))).GetInt32());
        using var verify = f.Services.CreateScope(); var notifications = await verify.ServiceProvider.GetRequiredService<DatabaseContext>().Notifications.ToListAsync();
        Assert.NotNull(notifications.Single(x => x.NoteId == active).ReadAt); Assert.Null(notifications.Single(x => x.NoteId == trash).ReadAt); Assert.Null(notifications.Single(x => x.NoteId == foreign).ReadAt);
    }

    [Fact]
    public async Task Password_limits_reject_all_write_paths_before_changing_account_state()
    {
        using var f = new ApiFactory(); await f.InitializeAsync(); var (a, _) = await f.LoginAsync(); using var ca = a; var (admin, _) = await f.LoginAsync("admin@example.test"); using var cad = admin; using var anon = f.CreateClient();
        var tooLong = new string('x', 1025);
        Assert.Equal(HttpStatusCode.BadRequest, (await anon.PostAsJsonAsync("/api/v1/auth/register", new { email = "new@example.test", password = tooLong, confirmPassword = tooLong })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await anon.PostAsJsonAsync("/api/v1/auth/reset-password", new { userId = f.A, token = "synthetic", newPassword = tooLong })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await a.PostAsJsonAsync("/api/v1/me/change-password", new { currentPassword = ApiFactory.Password, newPassword = tooLong })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsJsonAsync("/api/v1/admin/users", new { email = "new@example.test", password = tooLong, role = "User" })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await a.PostAsJsonAsync("/api/v1/me/change-email", new { email = "Name <new@example.test>" })).StatusCode);
        Assert.True((await a.GetAsync("/api/v1/me")).IsSuccessStatusCode);
        using var scope = f.Services.CreateScope(); Assert.Equal(3, await scope.ServiceProvider.GetRequiredService<DatabaseContext>().Users.CountAsync());
    }

    [Fact]
    public async Task Email_templates_escape_untrusted_text_and_links_roundtrip_encoded_proof_and_mailbox()
    {
        var sender = new TestEmailSender(); var renderer = new EmailTemplateRenderer();
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?> { ["AppSettings:ClientUrl"] = "https://client.example.test/" }).Build();
        var service = new EmailService(sender, renderer, config); var user = new ApplicationUser { Id = Guid.NewGuid(), UserName = "<img src=x onerror=alert(1)>", Email = "owner@example.test" };
        const string proof = "binary+/proof==&'"; const string email = "new+tag@example.test";
        await service.SendChangeEmailConfirmationAsync(user, proof, email);
        var html = sender.Messages.Single().Body; Assert.DoesNotContain("<img", html); Assert.Contains("&lt;img", html); Assert.Contains("&amp;", html);
        var encodedLink = System.Text.RegularExpressions.Regex.Match(html, "href='([^']+)'").Groups[1].Value; var link = new Uri(WebUtility.HtmlDecode(encodedLink));
        Assert.Equal("https", link.Scheme); Assert.Equal("client.example.test", link.Host);
        var query = QueryHelpers.ParseQuery(link.Query); Assert.Equal(email, query["newEmail"].ToString()); Assert.Equal(proof, Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(query["token"]!)));
        var hostile = renderer.RenderChangeEmail("' onclick='bad", "https://client.example.test/?a='&b=<x>", "<script>bad</script>");
        Assert.DoesNotContain("<script>", hostile); Assert.DoesNotContain("href='https://client.example.test/?a='", hostile);
        await service.SendVerificationCodeAsync("owner@example.test", "<script>123456</script>");
        var verification = sender.Messages.Last();
        Assert.Equal("owner@example.test", verification.To);
        Assert.Contains("NoteTatCa", verification.Subject);
        Assert.Contains("&lt;script&gt;123456&lt;/script&gt;", verification.Body);
        Assert.DoesNotContain("<script>", verification.Body);
        Assert.Contains("10 minutes", verification.Body);
        Assert.Contains("never share your code", verification.Body);
        Assert.Contains("safely ignore", verification.Body);
    }

    [Fact]
    public async Task Smtp_timeout_is_persisted_for_retry_without_losing_the_inbox_item()
    {
        using var f = new ApiFactory(); await f.InitializeAsync(); var (a, _) = await f.LoginAsync(); using var ca = a; var note = await ApiFactory.Note(a);
        using (var scope = f.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<DatabaseContext>(); var at = f.Clock.GetUtcNow().AddSeconds(-1);
            db.Reminders.Add(new() { NoteId = Id(note), ReminderAt = at, NextOccurrenceAt = at }); await db.SaveChangesAsync();
            var job = scope.ServiceProvider.GetRequiredService<IBackgroundMaintenanceService>(); await job.DispatchRemindersAsync(); f.Email.Timeout = true; Assert.Equal(0, await job.DeliverEmailsAsync());
            var delivery = await db.ReminderDeliveries.SingleAsync(); Assert.Equal("EMAIL_TIMEOUT", delivery.LastErrorCode); Assert.Equal(1, delivery.Attempts); Assert.Null(delivery.LeaseUntil); Assert.False(delivery.Abandoned);
        }
        f.Email.Timeout = false; f.Clock.Advance(TimeSpan.FromMinutes(3));
        using var retry = f.Services.CreateScope(); Assert.Equal(1, await retry.ServiceProvider.GetRequiredService<IBackgroundMaintenanceService>().DeliverEmailsAsync());
        Assert.Single(await retry.ServiceProvider.GetRequiredService<DatabaseContext>().Notifications.ToListAsync()); Assert.Single(f.Email.Messages);
    }

    [Fact]
    public async Task Controller_surface_has_resolvable_services_explicit_schemas_access_and_legacy_trace_ids()
    {
        using var f = new ApiFactory(); await f.InitializeAsync();
        using (var scope = f.Services.CreateScope())
        {
            foreach (var contract in typeof(INoteService).Assembly.GetTypes().Where(x => x.IsInterface && x.Namespace == typeof(INoteService).Namespace))
                Assert.NotNull(scope.ServiceProvider.GetRequiredService(contract));
            var actions = scope.ServiceProvider.GetRequiredService<IActionDescriptorCollectionProvider>().ActionDescriptors.Items.OfType<ControllerActionDescriptor>().ToArray();
            Assert.NotEmpty(actions);
            var options = scope.ServiceProvider.GetRequiredService<Microsoft.Extensions.Options.IOptions<AuthorizationOptions>>().Value;
            Assert.NotNull(options.FallbackPolicy); Assert.True(options.FallbackPolicy.Requirements.OfType<Microsoft.AspNetCore.Authorization.Infrastructure.DenyAnonymousAuthorizationRequirement>().Any());
        }
        var (a, _) = await f.LoginAsync(); using var ca = a; a.DefaultRequestHeaders.Add("X-Correlation-ID", "legacy-trace-123");
        var legacy = await a.GetAsync("/api/Tag/get-all"); using var envelope = JsonDocument.Parse(await legacy.Content.ReadAsStringAsync()); Assert.Equal("legacy-trace-123", envelope.RootElement.GetProperty("traceId").GetString());
        using var anon = f.CreateClient(); using var swagger = JsonDocument.Parse(await anon.GetStringAsync("/swagger/v1/swagger.json"));
        foreach (var path in swagger.RootElement.GetProperty("paths").EnumerateObject().Where(x => x.Name.StartsWith("/api/", StringComparison.Ordinal)))
        foreach (var operation in path.Value.EnumerateObject())
        {
            var responses = operation.Value.GetProperty("responses");
            var success = Assert.Single(responses.EnumerateObject(), x => x.Name.StartsWith('2'));
            Assert.True(success.Value.GetProperty("content").EnumerateObject().All(x => x.Value.TryGetProperty("schema", out _)), path.Name);
            foreach (var error in new[] { "400", "401", "404", "409", "429", "500" }) Assert.True(responses.TryGetProperty(error, out _), path.Name + ":" + error);
            Assert.True(operation.Value.TryGetProperty("x-ntc-access", out _), path.Name);
        }
        Assert.DoesNotContain("ITraceableResponse", swagger.RootElement.GetRawText());
    }
}
