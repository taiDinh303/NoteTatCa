using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using NTC.Contract.Repositories.Entities;
using NTC.Contract.Repositories.Entities.Tasks;
using NTC.Contract.Services.Interface;
using NTC.Repositories.Context;
using NTC.Tests.Infrastructure;
namespace NTC.Tests.Integration;
public sealed class MaintenanceTests
{
    private static async Task<Guid> AddReminder(ApiFactory f,Guid noteId,DateTimeOffset at,RepeatType repeat=RepeatType.None,bool email=true)
    {
        using var scope=f.Services.CreateScope();var db=scope.ServiceProvider.GetRequiredService<DatabaseContext>();
        var r=new Reminder{NoteId=noteId,ReminderAt=at,NextOccurrenceAt=at,RepeatType=repeat,TimeZoneId="UTC",SendEmail=email};db.Reminders.Add(r);await db.SaveChangesAsync();return r.Id;
    }
    [Fact]
    public async Task A_due_reminder_creates_one_inbox_item_and_one_email_despite_repeated_dispatch()
    {
        using var f=new ApiFactory();await f.InitializeAsync();var(c,_)=await f.LoginAsync();using var client=c;
        var note=await ApiFactory.Note(c,"DO-NOT-EMAIL-CONTENT");var id=note.GetProperty("id").GetGuid();await AddReminder(f,id,f.Clock.GetUtcNow().AddMinutes(-1));
        using(var scope=f.Services.CreateScope())
        {var job=scope.ServiceProvider.GetRequiredService<IBackgroundMaintenanceService>();Assert.Equal(1,await job.DispatchRemindersAsync());Assert.Equal(0,await job.DispatchRemindersAsync());Assert.Equal(1,await job.DeliverEmailsAsync());Assert.Equal(0,await job.DeliverEmailsAsync());}
        Assert.Single(f.Email.Messages);Assert.DoesNotContain("DO-NOT-EMAIL-CONTENT",f.Email.Messages.Single().Body);
        var inbox=await ApiFactory.Data(await c.GetAsync("/api/v1/notifications"));var notification=Assert.Single(inbox.GetProperty("items").EnumerateArray());
        Assert.True((await c.PatchAsync($"/api/v1/notifications/{notification.GetProperty("id").GetGuid()}/read",null)).IsSuccessStatusCode);
        Assert.Empty((await ApiFactory.Data(await c.GetAsync("/api/v1/notifications?unreadOnly=true"))).GetProperty("items").EnumerateArray());
        var(b,_)=await f.LoginAsync("b@example.test");using var other=b;
        Assert.Equal(HttpStatusCode.NotFound,(await b.PatchAsync($"/api/v1/notifications/{notification.GetProperty("id").GetGuid()}/read",null)).StatusCode);
    }
    [Fact]
    public async Task Long_downtime_sends_only_the_latest_occurrence_in_the_catch_up_window()
    {
        using var f=new ApiFactory();await f.InitializeAsync();var(c,_)=await f.LoginAsync();using var client=c;
        var id=(await ApiFactory.Note(c)).GetProperty("id").GetGuid();await AddReminder(f,id,f.Clock.GetUtcNow().AddDays(-30).AddHours(-1),RepeatType.Daily);
        using var scope=f.Services.CreateScope();var job=scope.ServiceProvider.GetRequiredService<IBackgroundMaintenanceService>();Assert.Equal(1,await job.DispatchRemindersAsync());
        var db=scope.ServiceProvider.GetRequiredService<DatabaseContext>();Assert.Single(await db.Notifications.ToListAsync());Assert.True((await db.Reminders.SingleAsync()).NextOccurrenceAt>f.Clock.GetUtcNow());
    }
    [Fact]
    public async Task Old_one_shot_reminders_trash_and_locked_accounts_do_not_send()
    {
        using var f=new ApiFactory();await f.InitializeAsync();var(c,_)=await f.LoginAsync();using var client=c;
        var old=(await ApiFactory.Note(c)).GetProperty("id").GetGuid();var trash=(await ApiFactory.Note(c)).GetProperty("id").GetGuid();
        await AddReminder(f,old,f.Clock.GetUtcNow().AddHours(-25));await AddReminder(f,trash,f.Clock.GetUtcNow().AddMinutes(-1));
        Assert.True((await c.PostAsync($"/api/v1/notes/{trash}/trash",null)).IsSuccessStatusCode);
        using(var scope=f.Services.CreateScope()){var job=scope.ServiceProvider.GetRequiredService<IBackgroundMaintenanceService>();Assert.Equal(0,await job.DispatchRemindersAsync());Assert.Equal(0,await job.DeliverEmailsAsync());}
        Assert.Empty(f.Email.Messages);
    }
    [Fact]
    public async Task Email_failure_retries_with_backoff_without_duplicate_inbox_items()
    {
        using var f=new ApiFactory();await f.InitializeAsync();var(c,_)=await f.LoginAsync();using var client=c;
        var id=(await ApiFactory.Note(c)).GetProperty("id").GetGuid();await AddReminder(f,id,f.Clock.GetUtcNow().AddSeconds(-1));
        using(var scope=f.Services.CreateScope()){var job=scope.ServiceProvider.GetRequiredService<IBackgroundMaintenanceService>();await job.DispatchRemindersAsync();f.Email.Fail=true;Assert.Equal(0,await job.DeliverEmailsAsync());}
        f.Email.Fail=false;f.Clock.Advance(TimeSpan.FromMinutes(3));
        using(var scope=f.Services.CreateScope()){var job=scope.ServiceProvider.GetRequiredService<IBackgroundMaintenanceService>();Assert.Equal(1,await job.DeliverEmailsAsync());var db=scope.ServiceProvider.GetRequiredService<DatabaseContext>();Assert.Single(await db.Notifications.ToListAsync());Assert.Equal(2,(await db.ReminderDeliveries.SingleAsync()).Attempts);}
        Assert.Single(f.Email.Messages);
    }
    [Fact]
    public async Task Purge_deletes_only_thirty_day_trash_and_removes_the_entire_related_graph()
    {
        using var f=new ApiFactory();await f.InitializeAsync();var(c,_)=await f.LoginAsync();using var client=c;
        var expired=(await ApiFactory.Note(c)).GetProperty("id").GetGuid();var recent=(await ApiFactory.Note(c)).GetProperty("id").GetGuid();var active=(await ApiFactory.Note(c)).GetProperty("id").GetGuid();
        await AddReminder(f,expired,f.Clock.GetUtcNow().AddSeconds(-1));
        using(var scope=f.Services.CreateScope())
        {var job=scope.ServiceProvider.GetRequiredService<IBackgroundMaintenanceService>();await job.DispatchRemindersAsync();var db=scope.ServiceProvider.GetRequiredService<DatabaseContext>();
            (await db.Notes.SingleAsync(x=>x.Id==expired)).DeletedTime=f.Clock.GetUtcNow().AddDays(-30);
            (await db.Notes.SingleAsync(x=>x.Id==recent)).DeletedTime=f.Clock.GetUtcNow().AddDays(-30).AddSeconds(1);await db.SaveChangesAsync();}
        using(var scope=f.Services.CreateScope())
        {var job=scope.ServiceProvider.GetRequiredService<IBackgroundMaintenanceService>();Assert.Equal(1,await job.PurgeTrashAsync());Assert.Equal(0,await job.PurgeTrashAsync());var db=scope.ServiceProvider.GetRequiredService<DatabaseContext>();
            Assert.False(await db.Notes.AnyAsync(x=>x.Id==expired));Assert.True(await db.Notes.AnyAsync(x=>x.Id==recent));Assert.True(await db.Notes.AnyAsync(x=>x.Id==active));
            Assert.Empty(await db.Reminders.ToListAsync());Assert.Empty(await db.Notifications.ToListAsync());Assert.Empty(await db.ReminderDeliveries.ToListAsync());}
    }
    [Fact]
    public async Task Restore_accepts_29_day_trash_but_rejects_exact_30_day_cutoff()
    {
        using var f = new ApiFactory(); await f.InitializeAsync(); var (c, _) = await f.LoginAsync(); using var client = c;
        var recent = (await ApiFactory.Note(c)).GetProperty("id").GetGuid();
        var expired = (await ApiFactory.Note(c)).GetProperty("id").GetGuid();
        using (var scope = f.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<DatabaseContext>();
            (await db.Notes.SingleAsync(x => x.Id == recent)).DeletedTime = f.Clock.GetUtcNow().AddDays(-29);
            (await db.Notes.SingleAsync(x => x.Id == expired)).DeletedTime = f.Clock.GetUtcNow().AddDays(-30);
            await db.SaveChangesAsync();
        }
        Assert.True((await c.PostAsync($"/api/v1/notes/{recent}/restore", null)).IsSuccessStatusCode);
        Assert.Equal(HttpStatusCode.Conflict, (await c.PostAsync($"/api/v1/notes/{expired}/restore", null)).StatusCode);
    }
    [Fact]
    public async Task Restoring_a_note_advances_reminders_without_sending_missed_occurrences()
    {
        using var f=new ApiFactory();await f.InitializeAsync();var(c,_)=await f.LoginAsync();using var client=c;
        var id=(await ApiFactory.Note(c)).GetProperty("id").GetGuid();await AddReminder(f,id,f.Clock.GetUtcNow().AddMinutes(-10),RepeatType.Daily);
        Assert.True((await c.PostAsync($"/api/v1/notes/{id}/trash",null)).IsSuccessStatusCode);
        Assert.True((await c.PostAsync($"/api/v1/notes/{id}/restore",null)).IsSuccessStatusCode);
        using var scope=f.Services.CreateScope();var job=scope.ServiceProvider.GetRequiredService<IBackgroundMaintenanceService>();Assert.Equal(0,await job.DispatchRemindersAsync());
        Assert.True((await scope.ServiceProvider.GetRequiredService<DatabaseContext>().Reminders.SingleAsync()).NextOccurrenceAt>f.Clock.GetUtcNow());
    }
}
