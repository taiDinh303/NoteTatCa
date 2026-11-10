using System.Net;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using NTC.Contract.Repositories.Entities.Tasks;
using NTC.Repositories.Context;
using NTC.Tests.Infrastructure;

namespace NTC.Tests.Integration;

public sealed class AdminReminderDeliveryTests
{
    [Fact]
    public async Task Console_is_admin_only_metadata_only_and_read_only_even_for_hidden_notes()
    {
        using var f = new ApiFactory(); await f.InitializeAsync();
        var (owner, _) = await f.LoginAsync(); using var ownerClient = owner;
        var note = await ApiFactory.Note(owner, "private-delivery-content", "private-delivery-title");
        var noteId = note.GetProperty("id").GetGuid();
        using (var scope = f.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<DatabaseContext>();
            (await db.Notes.SingleAsync(x => x.Id == noteId)).IsHidden = true;
            var reminder = new Reminder { NoteId = noteId, ReminderAt = f.Clock.GetUtcNow(), TimeZoneId = "UTC" };
            db.Reminders.Add(reminder);
            db.ReminderDeliveries.Add(new ReminderDelivery { NoteId = noteId, UserId = f.A, ReminderId = reminder.Id,
                OccurrenceAt = f.Clock.GetUtcNow(), NextAttemptAt = f.Clock.GetUtcNow(), Attempts = 1,
                LastErrorCode = "secret-provider-response-a@example.test" });
            await db.SaveChangesAsync();
        }
        using var anonymous = f.CreateClient();
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.GetAsync("/api/v1/admin/reminder-deliveries")).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await owner.GetAsync("/api/v1/admin/reminder-deliveries")).StatusCode);
        var (admin, _) = await f.LoginAsync("admin@example.test"); using var adminClient = admin;
        var data = await ApiFactory.Data(await admin.GetAsync("/api/v1/admin/reminder-deliveries"));
        var item = Assert.Single(data.GetProperty("items").EnumerateArray());
        Assert.Equal(f.A, item.GetProperty("userId").GetGuid());
        Assert.Equal("retrying", item.GetProperty("status").GetString());
        Assert.Equal("UNKNOWN_ERROR", item.GetProperty("errorCode").GetString());
        Assert.Equal(new[] { "abandonedAt", "attempts", "errorCode", "id", "lastAttemptAt", "leaseUntil", "nextAttemptAt", "occurrenceAt", "sentAt", "status", "userId" },
            item.EnumerateObject().Select(x => x.Name).Order().ToArray());
        Assert.DoesNotContain("private-delivery", data.GetRawText()); Assert.DoesNotContain("example.test", data.GetRawText());
        Assert.Equal(HttpStatusCode.Forbidden, (await admin.GetAsync($"/api/v1/notes/{noteId}")).StatusCode);
        using var check = f.Services.CreateScope(); var checkDb = check.ServiceProvider.GetRequiredService<DatabaseContext>();
        var unchanged = await checkDb.ReminderDeliveries.IgnoreQueryFilters().SingleAsync();
        Assert.Equal(1, unchanged.Attempts); Assert.Null(unchanged.SentAt); Assert.Empty(f.Email.Messages);
    }

    [Fact]
    public async Task Filters_pagination_and_lease_expiry_use_one_clock_and_do_not_mutate_deliveries()
    {
        using var f = new ApiFactory(); await f.InitializeAsync();
        var (owner, _) = await f.LoginAsync(); using var ownerClient = owner;
        var id = (await ApiFactory.Note(owner)).GetProperty("id").GetGuid(); var now = f.Clock.GetUtcNow();
        using (var scope = f.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<DatabaseContext>();
            var reminder = new Reminder { NoteId = id, ReminderAt = now, TimeZoneId = "UTC" };
            db.Reminders.Add(reminder);
            for (var index = 0; index < 5; index++) db.ReminderDeliveries.Add(new ReminderDelivery
            {
                NoteId = id, UserId = f.A, ReminderId = reminder.Id, OccurrenceAt = now.AddMinutes(index), NextAttemptAt = now,
                Attempts = index == 0 ? 0 : 1, LeaseUntil = index == 2 ? now.AddMinutes(1) : null,
                LeaseId = index == 2 ? Guid.NewGuid() : null,
                SentAt = index == 3 ? now : null, Abandoned = index == 4, LastErrorCode = index == 1 ? "EMAIL_TIMEOUT" : null
            });
            await db.SaveChangesAsync();
        }
        var (admin, _) = await f.LoginAsync("admin@example.test"); using var client = admin;
        foreach (var status in new[] { "pending", "retrying", "leased", "sent", "abandoned" })
        {
            var page = await ApiFactory.Data(await admin.GetAsync($"/api/v1/admin/reminder-deliveries?status={status}"));
            var row = Assert.Single(page.GetProperty("items").EnumerateArray()); Assert.Equal(status, row.GetProperty("status").GetString());
        }
        var first = await ApiFactory.Data(await admin.GetAsync("/api/v1/admin/reminder-deliveries?pageSize=2"));
        var second = await ApiFactory.Data(await admin.GetAsync("/api/v1/admin/reminder-deliveries?pageSize=2&pageNumber=2"));
        Assert.Equal(5, first.GetProperty("totalItems").GetInt32()); Assert.Equal(2, second.GetProperty("items").GetArrayLength());
        Assert.DoesNotContain(first.GetProperty("items")[0].GetProperty("id").GetGuid(), second.GetProperty("items").EnumerateArray().Select(x => x.GetProperty("id").GetGuid()));
        var other = await ApiFactory.Data(await admin.GetAsync($"/api/v1/admin/reminder-deliveries?userId={f.B}")); Assert.Equal(0, other.GetProperty("totalItems").GetInt32());
        var range = await ApiFactory.Data(await admin.GetAsync("/api/v1/admin/reminder-deliveries?from=" + Uri.EscapeDataString(now.AddMinutes(1).ToString("O")) + "&to=" + Uri.EscapeDataString(now.AddMinutes(3).ToString("O"))));
        Assert.Equal(2, range.GetProperty("totalItems").GetInt32());
        f.Clock.Advance(TimeSpan.FromMinutes(2));
        var leased = await ApiFactory.Data(await admin.GetAsync("/api/v1/admin/reminder-deliveries?status=leased")); Assert.Equal(0, leased.GetProperty("totalItems").GetInt32());
        var retries = await ApiFactory.Data(await admin.GetAsync("/api/v1/admin/reminder-deliveries?status=retrying")); Assert.Equal(2, retries.GetProperty("totalItems").GetInt32());
    }

    [Theory]
    [InlineData("status=unknown")]
    [InlineData("pageNumber=0")]
    [InlineData("pageSize=101")]
    [InlineData("pageNumber=2147483647&pageSize=100")]
    [InlineData("userId=invalid")]
    [InlineData("from=2026-11-10T00:00:00Z&to=2026-11-09T00:00:00Z")]
    public async Task Invalid_filters_return_bad_request(string query)
    {
        using var f = new ApiFactory(); await f.InitializeAsync();
        var (admin, _) = await f.LoginAsync("admin@example.test"); using var client = admin;
        Assert.Equal(HttpStatusCode.BadRequest, (await admin.GetAsync("/api/v1/admin/reminder-deliveries?" + query)).StatusCode);
    }
}
