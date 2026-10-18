using System.Data.Common;
using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using NTC.Contract.Repositories.Entities;
using NTC.Contract.Repositories.Entities.Identity;
using NTC.Contract.Repositories.Entities.Tasks;
using NTC.Contract.Services.Interface;
using NTC.Core.Base;
using NTC.Repositories.Context;
using NTC.Tests.Infrastructure;

namespace NTC.Tests.Integration;

public sealed class EntityIntegrityTests
{
    [Fact]
    public async Task Database_rejects_a_cross_owner_label_link_even_when_services_are_bypassed()
    {
        using var f = new ApiFactory(); await f.InitializeAsync();
        using var scope = f.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<DatabaseContext>();
        var note = new Note { UserId = f.A }; var tag = new Tag { UserId = f.B, Name = "Private label" };
        db.AddRange(note, tag); await db.SaveChangesAsync();
        await Assert.ThrowsAnyAsync<DbException>(() => db.Database.ExecuteSqlInterpolatedAsync(
            $"INSERT INTO NoteTags (NoteId,TagId,UserId) VALUES ({note.Id},{tag.Id},{f.A})"));
        Assert.Empty(await db.NoteTags.ToListAsync());
    }

    [Theory]
    [InlineData(false, false)]
    [InlineData(false, true)]
    [InlineData(true, false)]
    [InlineData(true, true)]
    public async Task Inbox_and_delivery_rows_must_match_both_note_owner_and_reminder_parent(bool delivery, bool wrongOwner)
    {
        using var f = new ApiFactory(); await f.InitializeAsync();
        using var scope = f.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<DatabaseContext>();
        var first = new Note { UserId = f.A }; var second = new Note { UserId = f.B };
        var reminder = new Reminder { Note = second, ReminderAt = f.Clock.GetUtcNow().AddHours(1) };
        db.AddRange(first, second, reminder); await db.SaveChangesAsync();
        var noteId = wrongOwner ? second.Id : first.Id; var owner = f.A;
        if (delivery) db.ReminderDeliveries.Add(new() { UserId = owner, NoteId = noteId, ReminderId = reminder.Id,
            OccurrenceAt = reminder.ReminderAt, NextAttemptAt = f.Clock.GetUtcNow() });
        else db.Notifications.Add(new() { UserId = owner, NoteId = noteId, ReminderId = reminder.Id, OccurrenceAt = reminder.ReminderAt });
        await Assert.ThrowsAsync<DbUpdateException>(() => db.SaveChangesAsync());
    }

    [Theory]
    [InlineData("interval")]
    [InlineData("recurrence")]
    [InlineData("ending")]
    [InlineData("gender")]
    public async Task Database_rejects_invalid_recurrence_and_profile_values(string invalid)
    {
        using var f = new ApiFactory(); await f.InitializeAsync();
        using var scope = f.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<DatabaseContext>();
        var note = new Note { UserId = f.A }; var reminder = new Reminder { Note = note, ReminderAt = f.Clock.GetUtcNow() };
        db.AddRange(note, reminder); await db.SaveChangesAsync();
        var sql = invalid switch
        {
            "interval" => "UPDATE Reminders SET RepeatInterval=0",
            "recurrence" => "UPDATE Reminders SET RepeatType=99",
            "ending" => "UPDATE Reminders SET RepeatCount=2,RepeatUntil=ReminderAt",
            _ => "UPDATE UserInfos SET Gender=99"
        };
        await Assert.ThrowsAnyAsync<DbException>(() => db.Database.ExecuteSqlRawAsync(sql));
    }

    [Fact]
    public async Task Identity_audit_stamps_use_the_server_clock_and_creation_metadata_cannot_be_rewritten()
    {
        using var f = new ApiFactory(); await f.InitializeAsync();
        var (client, _) = await f.LoginAsync(); using var http = client;
        using var scope = f.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<DatabaseContext>();
        var profile = await db.UserInfos.SingleAsync(x => x.Id == f.A);
        profile.Email = "historical-unverified@example.test"; profile.Locale = "en-US"; await db.SaveChangesAsync();
        var me = (await ApiFactory.Data(await http.GetAsync("/api/v1/me"))).GetProperty("profile");
        Assert.Equal("a@example.test", me.GetProperty("email").GetString()); Assert.Equal("en-US", me.GetProperty("locale").GetString());
        var user = await db.Users.SingleAsync(x => x.Id == f.A); var created = user.CreatedTime;
        f.Clock.Advance(TimeSpan.FromHours(1)); user.PhoneNumber = "123"; user.CreatedTime = created.AddYears(-5);
        var claim = new ApplicationUserClaim { UserId = f.A, ClaimType = "fixture", ClaimValue = "safe" };
        db.UserClaims.Add(claim); await db.SaveChangesAsync(); db.ChangeTracker.Clear();
        user = await db.Users.SingleAsync(x => x.Id == f.A);
        Assert.Equal(created, user.CreatedTime); Assert.Equal(f.Clock.GetUtcNow(), user.LastUpdatedTime);
        Assert.Equal(f.Clock.GetUtcNow(), (await db.UserClaims.SingleAsync()).CreatedTime);
        Assert.Equal(TimeSpan.Zero, user.LastUpdatedTime.Offset);
    }

    [Fact]
    public async Task Database_constraints_reject_impossible_session_and_delivery_states()
    {
        using var f = new ApiFactory(); await f.InitializeAsync();
        var (client, _) = await f.LoginAsync(); using var http = client;
        using var scope = f.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<DatabaseContext>();
        var note = new Note { UserId = f.A }; var reminder = new Reminder { Note = note, ReminderAt = f.Clock.GetUtcNow() };
        db.AddRange(note, reminder); await db.SaveChangesAsync();
        db.ReminderDeliveries.Add(new() { UserId = f.A, NoteId = note.Id, ReminderId = reminder.Id,
            OccurrenceAt = reminder.ReminderAt, NextAttemptAt = f.Clock.GetUtcNow() }); await db.SaveChangesAsync();
        foreach (var sql in new[] { "UPDATE RefreshSessions SET ExpiresAt=CreatedAt", "UPDATE RefreshSessions SET ReplacedById=Id",
            "UPDATE ReminderDeliveries SET Attempts=-1", "UPDATE ReminderDeliveries SET LeaseId=Id" })
            await Assert.ThrowsAnyAsync<DbException>(() => db.Database.ExecuteSqlRawAsync(sql));
        var delivery = await db.ReminderDeliveries.AsNoTracking().SingleAsync();
        Assert.Equal(0, delivery.Attempts); Assert.Null(delivery.LeaseId); Assert.Null(delivery.LeaseUntil);
    }

    [Fact]
    public async Task Administrative_audit_is_metadata_only_idempotent_for_noops_and_admin_scoped()
    {
        using var f = new ApiFactory(); await f.InitializeAsync();
        var (user, _) = await f.LoginAsync(); using var u = user;
        var (admin, _) = await f.LoginAsync("admin@example.test"); using var a = admin;
        await ApiFactory.Note(user, "PRIVATE-CONTENT-SENTINEL", "PRIVATE-TITLE-SENTINEL");
        Assert.Equal(HttpStatusCode.Forbidden, (await user.GetAsync("/api/v1/admin/audit-events")).StatusCode);
        for (var i = 0; i < 2; i++) Assert.True((await admin.PatchAsJsonAsync($"/api/v1/admin/users/{f.A}/lock", new { isLocked = true })).IsSuccessStatusCode);
        var events = await ApiFactory.Data(await admin.GetAsync($"/api/v1/admin/audit-events?targetUserId={f.A}"));
        var item = Assert.Single(events.GetProperty("items").EnumerateArray());
        Assert.Equal(f.Admin, item.GetProperty("actorUserId").GetGuid());
        Assert.Equal((int)AdministrativeAction.AccountLocked, item.GetProperty("action").GetInt32());
        Assert.DoesNotContain("PRIVATE-", events.GetRawText()); Assert.DoesNotContain("example.test", events.GetRawText());
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.GetAsync("/api/v1/admin/audit-events?action=99")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.GetAsync("/api/v1/admin/audit-events?pageSize=101")).StatusCode);
    }

    [Fact]
    public async Task Administrative_audit_rows_are_append_only_and_survive_custom_role_deletion()
    {
        using var f = new ApiFactory(); await f.InitializeAsync();
        var (client, _) = await f.LoginAsync("admin@example.test"); using var admin = client;
        Assert.True((await admin.PostAsJsonAsync("/api/role/create", new { name = "CustomFixture" })).IsSuccessStatusCode);
        Guid roleId;
        using (var scope = f.Services.CreateScope()) roleId = (await scope.ServiceProvider.GetRequiredService<DatabaseContext>().Roles.SingleAsync(x => x.Name == "CustomFixture")).Id;
        Assert.True((await admin.PostAsync($"/api/userrole/add-role?userId={f.A}&roleId={roleId}", null)).IsSuccessStatusCode);
        Assert.True((await admin.DeleteAsync($"/api/role/delete/{roleId}")).IsSuccessStatusCode);
        using var inspect = f.Services.CreateScope(); var db = inspect.ServiceProvider.GetRequiredService<DatabaseContext>();
        var rows = await db.AdministrativeAuditEvents.Where(x => x.RoleId == roleId).ToListAsync();
        Assert.Contains(rows, x => x.Action == AdministrativeAction.RoleCreated);
        Assert.Contains(rows, x => x.Action == AdministrativeAction.RoleGranted);
        Assert.Contains(rows, x => x.Action == AdministrativeAction.RoleDeleted);
        var entry = rows.First(); entry.Action = AdministrativeAction.RoleUpdated;
        await Assert.ThrowsAsync<BaseException.ErrorException>(() => db.SaveChangesAsync()); db.ChangeTracker.Clear();
        entry = await db.AdministrativeAuditEvents.FirstAsync(); db.Remove(entry);
        await Assert.ThrowsAsync<BaseException.ErrorException>(() => db.SaveChangesAsync());
    }

    [Fact]
    public async Task A_crash_on_the_last_email_attempt_does_not_start_an_unbounded_retry_cycle()
    {
        using var f = new ApiFactory(); await f.InitializeAsync();
        using var scope = f.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<DatabaseContext>();
        var note = new Note { UserId = f.A };
        var reminder = new Reminder { Note = note, ReminderAt = f.Clock.GetUtcNow().AddMinutes(-1) };
        db.AddRange(note, reminder); await db.SaveChangesAsync();
        var delivery = new ReminderDelivery { UserId = f.A, NoteId = note.Id, ReminderId = reminder.Id,
            OccurrenceAt = reminder.ReminderAt, Attempts = 5, LastAttemptAt = f.Clock.GetUtcNow().AddMinutes(-3),
            NextAttemptAt = f.Clock.GetUtcNow(), LeaseId = Guid.NewGuid(), LeaseUntil = f.Clock.GetUtcNow().AddMinutes(-1) };
        db.Add(delivery); await db.SaveChangesAsync();
        Assert.Equal(0, await scope.ServiceProvider.GetRequiredService<IBackgroundMaintenanceService>().DeliverEmailsAsync());
        Assert.Empty(f.Email.Messages); Assert.True(delivery.Abandoned); Assert.Equal(5, delivery.Attempts);
        Assert.Equal(f.Clock.GetUtcNow(), delivery.AbandonedAt); Assert.Equal("RETRY_LIMIT_REACHED", delivery.LastErrorCode);
        Assert.Null(delivery.LeaseId); Assert.Null(delivery.LeaseUntil);
    }

    [Fact]
    public void Provider_models_do_not_introduce_shadow_foreign_keys_or_unique_label_names()
    {
        using var sql = new SqlServerDesignFactory().CreateDbContext([]); using var pg = new PostgreSqlDesignFactory().CreateDbContext([]);
        foreach (var db in new DatabaseContext[] { sql, pg })
        {
            Assert.DoesNotContain(db.Model.GetEntityTypes().SelectMany(e => e.GetForeignKeys()).SelectMany(f => f.Properties), p => p.IsShadowProperty());
            Assert.DoesNotContain(db.Model.FindEntityType(typeof(Tag))!.GetIndexes(), x => x.IsUnique && x.Properties.Any(p => p.Name == "Name"));
            Assert.All(db.Model.FindEntityType(typeof(NoteTag))!.GetForeignKeys(), x => Assert.Contains(x.Properties, p => p.Name == "UserId"));
        }
    }
}
