using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using NTC.Contract.Repositories.Entities;
using NTC.Contract.Repositories.Entities.Tasks;
using NTC.Repositories.Context;
using NTC.Tests.Infrastructure;

namespace NTC.Tests.Integration;

public sealed class AnnouncementTests
{
    private const string AdminPath = "/api/v1/admin/announcements";
    private const string Feed = "/api/v1/notifications/feed";
    private static async Task<JsonElement> Draft(HttpClient admin, bool all = true, Guid[]? ids = null) =>
        await ApiFactory.Data(await admin.PostAsJsonAsync(AdminPath, new { title = "System notice", body = "<script>plain text</script>\nSecond line", allActiveUsers = all, userIds = ids ?? [], requestId = Guid.NewGuid() }));
    private static Guid Id(JsonElement detail) => detail.GetProperty("announcement").GetProperty("id").GetGuid();
    private static Guid Version(JsonElement detail) => detail.GetProperty("announcement").GetProperty("version").GetGuid();

    [Fact]
    public async Task All_recipients_snapshot_read_revoke_and_retry_preserve_notes_and_legacy_inbox()
    {
        using var f = new ApiFactory(); await f.InitializeAsync();
        var (admin, _) = await f.LoginAsync("admin@example.test"); using var adminClient = admin;
        var (a, _) = await f.LoginAsync(); using var aClient = a;
        var (b, _) = await f.LoginAsync("b@example.test"); using var bClient = b;
        var note = await ApiFactory.Note(a); var draft = await Draft(admin); var id = Id(draft);
        Assert.Equal(0, (await ApiFactory.Data(await a.GetAsync(Feed))).GetProperty("totalItems").GetInt32());
        var preview = await ApiFactory.Data(await admin.PostAsJsonAsync($"{AdminPath}/{id}/preview", new { expectedVersion = Version(draft) }));
        Assert.Equal(2, preview.GetProperty("recipientCount").GetInt32());
        var send = new { expectedVersion = Version(draft), requestId = Guid.NewGuid() };
        var published = await ApiFactory.Data(await admin.PostAsJsonAsync($"{AdminPath}/{id}/publish", send));
        var retry = await ApiFactory.Data(await admin.PostAsJsonAsync($"{AdminPath}/{id}/publish", send));
        Assert.Equal(Version(published), Version(retry));
        using (var scope = f.Services.CreateScope())
        {
            var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var late = new ApplicationUser { Id = Guid.NewGuid(), Email = "late@example.test", UserName = "late@example.test", EmailConfirmed = true };
            Assert.True((await users.CreateAsync(late, ApiFactory.Password)).Succeeded); Assert.True((await users.AddToRoleAsync(late, "User")).Succeeded);
            var db = scope.ServiceProvider.GetRequiredService<DatabaseContext>();
            Assert.Equal(2, await db.Set<AnnouncementReceipt>().CountAsync()); Assert.Single(await db.Notes.ToListAsync());
        }
        var (lateClient, _) = await f.LoginAsync("late@example.test"); using var lateOwned = lateClient;
        Assert.Equal(0, (await ApiFactory.Data(await lateClient.GetAsync(Feed))).GetProperty("totalItems").GetInt32());
        var feed = await ApiFactory.Data(await a.GetAsync(Feed)); var receipt = Assert.Single(feed.GetProperty("items").EnumerateArray());
        Assert.Equal("announcement", receipt.GetProperty("kind").GetString()); Assert.Equal(JsonValueKind.Null, receipt.GetProperty("noteId").ValueKind);
        Assert.Equal("<script>plain text</script>\nSecond line", receipt.GetProperty("body").GetString());
        Assert.Equal(1, (await ApiFactory.Data(await a.GetAsync(Feed + "/unread-count"))).GetInt32());
        var receiptId = receipt.GetProperty("id").GetGuid();
        Assert.Equal(HttpStatusCode.NotFound, (await b.PatchAsync($"{Feed}/{receiptId}/read", null)).StatusCode);
        Assert.True((await a.PatchAsync($"{Feed}/{receiptId}/read", null)).IsSuccessStatusCode);
        Assert.Equal(0, (await ApiFactory.Data(await a.GetAsync(Feed + "/unread-count"))).GetInt32());
        Assert.Equal(1, (await ApiFactory.Data(await b.PatchAsync(Feed + "/read-all", null))).GetInt32());
        Assert.Equal(0, (await ApiFactory.Data(await b.PatchAsync(Feed + "/read-all", null))).GetInt32());
        Assert.Equal(0, (await ApiFactory.Data(await a.GetAsync("/api/v1/notifications"))).GetProperty("totalItems").GetInt32());
        Assert.True((await a.GetAsync($"/api/v1/notes/{note.GetProperty("id").GetGuid()}")).IsSuccessStatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PatchAsJsonAsync($"{AdminPath}/{id}", new { title = "Edit sent", body = "changed", allActiveUsers = true, expectedVersion = Version(published) })).StatusCode);
        var revoked = await ApiFactory.Data(await admin.PostAsJsonAsync($"{AdminPath}/{id}/revoke", new { expectedVersion = Version(published) }));
        Assert.Equal(0, (await ApiFactory.Data(await a.GetAsync(Feed))).GetProperty("totalItems").GetInt32());
        Assert.Equal(HttpStatusCode.NotFound, (await a.PatchAsync($"{Feed}/{receiptId}/read", null)).StatusCode);
        Assert.Equal(3, revoked.GetProperty("events").GetArrayLength()); Assert.Empty(f.Email.Messages);
        Assert.True((await admin.PostAsJsonAsync($"{AdminPath}/{id}/publish", send)).IsSuccessStatusCode); // Retry never republishes revoked content.
        Assert.Equal(0, (await ApiFactory.Data(await a.GetAsync(Feed))).GetProperty("totalItems").GetInt32());
    }

    [Fact]
    public async Task Selected_users_and_current_eligibility_validation_are_transactional()
    {
        using var f = new ApiFactory(); await f.InitializeAsync(); var (admin, _) = await f.LoginAsync("admin@example.test"); using var c = admin;
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsJsonAsync(AdminPath, new { title = "Invalid", body = "body", allActiveUsers = false, userIds = new[] { f.Admin }, requestId = Guid.NewGuid() })).StatusCode);
        var draft = await Draft(admin, false, [f.A]); var id = Id(draft);
        using (var scope = f.Services.CreateScope())
        {
            var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>(); var user = (await users.FindByIdAsync(f.A.ToString()))!;
            user.IsLocked = true; Assert.True((await users.UpdateAsync(user)).Succeeded);
        }
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsJsonAsync($"{AdminPath}/{id}/publish", new { expectedVersion = Version(draft), requestId = Guid.NewGuid() })).StatusCode);
        var updated = await ApiFactory.Data(await admin.PatchAsJsonAsync($"{AdminPath}/{id}", new { title = "Only B", body = "Body", allActiveUsers = false, userIds = new[] { f.B }, expectedVersion = Version(draft) }));
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PostAsJsonAsync($"{AdminPath}/{id}/preview", new { expectedVersion = Version(draft) })).StatusCode);
        await ApiFactory.Data(await admin.PostAsJsonAsync($"{AdminPath}/{id}/publish", new { expectedVersion = Version(updated), requestId = Guid.NewGuid() }));
        using var check = f.Services.CreateScope(); var db = check.ServiceProvider.GetRequiredService<DatabaseContext>();
        Assert.Equal(f.B, (await db.Set<AnnouncementReceipt>().SingleAsync()).UserId);
        Assert.Single(await db.Set<Announcement>().ToListAsync()); // Invalid create was rolled back.
    }

    [Fact]
    public async Task Feed_merges_reminders_and_announcements_with_pagination_and_shared_read_all()
    {
        using var f = new ApiFactory(); await f.InitializeAsync(); var (a, _) = await f.LoginAsync(); using var aClient = a;
        var note = await ApiFactory.Note(a); var noteId = note.GetProperty("id").GetGuid();
        using (var scope = f.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<DatabaseContext>(); var reminder = new Reminder { NoteId = noteId, ReminderAt = f.Clock.GetUtcNow(), TimeZoneId = "UTC" };
            db.Reminders.Add(reminder); db.Notifications.Add(new() { NoteId = noteId, ReminderId = reminder.Id, UserId = f.A, OccurrenceAt = f.Clock.GetUtcNow().AddMinutes(-1) }); await db.SaveChangesAsync();
        }
        var (admin, _) = await f.LoginAsync("admin@example.test"); using var adminClient = admin; var draft = await Draft(admin);
        await ApiFactory.Data(await admin.PostAsJsonAsync($"{AdminPath}/{Id(draft)}/publish", new { expectedVersion = Version(draft), requestId = Guid.NewGuid() }));
        var first = await ApiFactory.Data(await a.GetAsync(Feed + "?pageSize=1")); var second = await ApiFactory.Data(await a.GetAsync(Feed + "?pageSize=1&pageNumber=2"));
        Assert.Equal(2, first.GetProperty("totalItems").GetInt32()); Assert.Equal("announcement", first.GetProperty("items")[0].GetProperty("kind").GetString());
        Assert.Equal("reminder", second.GetProperty("items")[0].GetProperty("kind").GetString());
        Assert.Equal(2, (await ApiFactory.Data(await a.PatchAsync(Feed + "/read-all", null))).GetInt32());
        Assert.Equal(0, (await ApiFactory.Data(await a.GetAsync(Feed + "?unreadOnly=true"))).GetProperty("totalItems").GetInt32());
        Assert.Equal(0, (await ApiFactory.Data(await a.GetAsync("/api/v1/notifications/unread-count"))).GetInt32());
    }

    [Fact]
    public async Task Recipient_only_edit_advances_version_and_rejects_stale_publish()
    {
        using var f = new ApiFactory(); await f.InitializeAsync(); var (admin, _) = await f.LoginAsync("admin@example.test"); using var c = admin;
        var draft = await Draft(admin, false, [f.A]); var row = draft.GetProperty("announcement");
        var updated = await ApiFactory.Data(await admin.PatchAsJsonAsync($"{AdminPath}/{Id(draft)}", new {
            title = row.GetProperty("title").GetString(), body = row.GetProperty("body").GetString(), allActiveUsers = false,
            userIds = new[] { f.B }, expectedVersion = Version(draft) }));
        Assert.NotEqual(Version(draft), Version(updated));
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PostAsJsonAsync($"{AdminPath}/{Id(draft)}/publish", new { expectedVersion = Version(draft), requestId = Guid.NewGuid() })).StatusCode);
        var sent = await ApiFactory.Data(await admin.PostAsJsonAsync($"{AdminPath}/{Id(draft)}/publish", new { expectedVersion = Version(updated), requestId = Guid.NewGuid() }));
        Assert.Equal(f.B, Assert.Single(sent.GetProperty("recipientIds").EnumerateArray()).GetGuid());
    }

    [Fact]
    public async Task Draft_creation_is_idempotent_and_audit_history_is_append_only()
    {
        using var f = new ApiFactory(); await f.InitializeAsync(); var (admin, _) = await f.LoginAsync("admin@example.test"); using var c = admin;
        var requestId = Guid.NewGuid(); var body = new { title = "Notice", body = "Text", allActiveUsers = true, requestId };
        var first = await ApiFactory.Data(await admin.PostAsJsonAsync(AdminPath, body));
        var second = await ApiFactory.Data(await admin.PostAsJsonAsync(AdminPath, body));
        Assert.Equal(Id(first), Id(second));
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PostAsJsonAsync(AdminPath, new { title = "Changed", body = "Text", allActiveUsers = true, requestId })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsJsonAsync(AdminPath, new { title = "Invalid target", body = "Text", allActiveUsers = false, userIds = new[] { Guid.NewGuid() }, requestId = Guid.NewGuid() })).StatusCode);
        var recipients = await ApiFactory.Data(await admin.GetAsync(AdminPath + "/recipients")); Assert.Equal(2, recipients.GetProperty("totalItems").GetInt32());
        using var scope = f.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<DatabaseContext>();
        Assert.Single(await db.Set<Announcement>().ToListAsync());
        var audit = await db.Set<AnnouncementEvent>().SingleAsync(); audit.Action = "Changed";
        await Assert.ThrowsAsync<NTC.Core.Base.BaseException.ErrorException>(() => db.SaveChangesAsync());
    }

    [Fact]
    public async Task Concurrent_publish_never_creates_duplicate_receipts_and_retry_converges()
    {
        using var f = new ApiFactory(); await f.InitializeAsync(); var (admin, _) = await f.LoginAsync("admin@example.test"); using var c = admin;
        var draft = await Draft(admin); var id = Id(draft); var body = new { expectedVersion = Version(draft), requestId = Guid.NewGuid() };
        var results = await Task.WhenAll(admin.PostAsJsonAsync($"{AdminPath}/{id}/publish", body), admin.PostAsJsonAsync($"{AdminPath}/{id}/publish", body));
        Assert.Contains(results, x => x.IsSuccessStatusCode);
        Assert.All(results, x => Assert.True(x.IsSuccessStatusCode || x.StatusCode == HttpStatusCode.Conflict, x.StatusCode.ToString()));
        Assert.True((await admin.PostAsJsonAsync($"{AdminPath}/{id}/publish", body)).IsSuccessStatusCode);
        using var scope = f.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<DatabaseContext>();
        Assert.Equal(2, await db.Set<AnnouncementReceipt>().CountAsync());
        Assert.Single(await db.Set<AnnouncementEvent>().Where(x => x.Action == "Published").ToListAsync());
    }

    [Fact]
    public async Task Locked_deactivated_and_admin_role_customers_are_excluded_and_hidden_reminders_stay_private()
    {
        using var f = new ApiFactory(); await f.InitializeAsync(); var (a, _) = await f.LoginAsync(); using var aClient = a;
        var note = await ApiFactory.Note(a); var noteId = note.GetProperty("id").GetGuid();
        var (admin, _) = await f.LoginAsync("admin@example.test"); using var adminClient = admin;
        var draft = await Draft(admin);
        using (var scope = f.Services.CreateScope()) {
            var db = scope.ServiceProvider.GetRequiredService<DatabaseContext>(); var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var aUser = (await users.FindByIdAsync(f.A.ToString()))!; aUser.DeletedTime = f.Clock.GetUtcNow(); Assert.True((await users.UpdateAsync(aUser)).Succeeded);
            var bUser = (await users.FindByIdAsync(f.B.ToString()))!; bUser.IsLocked = true; Assert.True((await users.UpdateAsync(bUser)).Succeeded);
            Assert.True((await users.AddToRoleAsync((await users.FindByIdAsync(f.Admin.ToString()))!, "User")).Succeeded);
            (await db.Notes.SingleAsync(x => x.Id == noteId)).IsHidden = true;
            var reminder = new Reminder { NoteId = noteId, ReminderAt = f.Clock.GetUtcNow(), TimeZoneId = "UTC" }; db.Reminders.Add(reminder);
            db.Notifications.Add(new() { NoteId = noteId, UserId = f.A, ReminderId = reminder.Id, OccurrenceAt = f.Clock.GetUtcNow() }); await db.SaveChangesAsync();
        }
        // Role changes revoke the old admin session: sign in using current membership.
        var (currentAdmin, _) = await f.LoginAsync("admin@example.test"); using var currentAdminClient = currentAdmin;
        Assert.Equal(0, (await ApiFactory.Data(await currentAdmin.GetAsync(AdminPath + "/recipients"))).GetProperty("totalItems").GetInt32());
        Assert.Equal(HttpStatusCode.BadRequest, (await currentAdmin.PostAsJsonAsync($"{AdminPath}/{Id(draft)}/publish", new { expectedVersion = Version(draft), requestId = Guid.NewGuid() })).StatusCode);
        using var check = f.Services.CreateScope(); var checkDb = check.ServiceProvider.GetRequiredService<DatabaseContext>();
        Assert.Empty(await checkDb.Set<AnnouncementReceipt>().ToListAsync()); Assert.Empty(await checkDb.Notifications.ToListAsync());
    }

    [Fact]
    public async Task Authorization_validation_and_request_reuse_are_enforced()
    {
        using var f = new ApiFactory(); await f.InitializeAsync(); using var anonymous = f.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync(AdminPath)).StatusCode);
        var (user, _) = await f.LoginAsync(); using var userClient = user;
        Assert.Equal(HttpStatusCode.Forbidden, (await user.GetAsync(AdminPath)).StatusCode);
        var (admin, _) = await f.LoginAsync("admin@example.test"); using var client = admin;
        Assert.Equal(HttpStatusCode.Forbidden, (await admin.GetAsync(Feed)).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsJsonAsync(AdminPath, new { title = " ", body = "body", allActiveUsers = true })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.PostAsJsonAsync(AdminPath, new { title = "x", body = "body", allActiveUsers = false, userIds = new[] { f.A, f.A } })).StatusCode);
        var d1 = await Draft(admin); var d2 = await Draft(admin); var requestId = Guid.NewGuid();
        await ApiFactory.Data(await admin.PostAsJsonAsync($"{AdminPath}/{Id(d1)}/publish", new { expectedVersion = Version(d1), requestId }));
        Assert.Equal(HttpStatusCode.Conflict, (await admin.PostAsJsonAsync($"{AdminPath}/{Id(d2)}/publish", new { expectedVersion = Version(d2), requestId })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await user.GetAsync(Feed + "?pageNumber=0")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.GetAsync(AdminPath + "?pageSize=101")).StatusCode);
    }
}
