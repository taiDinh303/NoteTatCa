using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using NTC.Contract.Repositories.Entities;
using NTC.Contract.Repositories.Entities.Tasks;
using NTC.Repositories.Context;
using NTC.Tests.Infrastructure;

namespace NTC.Tests.Integration;

public sealed class EntityMigrationTests
{
    private sealed record Fixture(Note First, Note Second, Tag OtherLabel, Reminder OtherReminder);
    private static async Task<Fixture> Seed(DatabaseContext db, bool legacy = false)
    {
        var first = new ApplicationUser { Id = Guid.NewGuid(), Email = "first@example.test" };
        var second = new ApplicationUser { Id = Guid.NewGuid(), Email = "second@example.test" };
        var note = new Note { UserId = first.Id, Content = "preserve-first" };
        var other = new Note { UserId = second.Id, Content = "preserve-second" };
        var tag = new Tag { UserId = second.Id, Name = "Other label" };
        var reminder = new Reminder { Note = other, ReminderAt = DateTimeOffset.UtcNow.AddHours(1) };
        if (!legacy) { db.AddRange(first, second, note, other, tag, reminder); await db.SaveChangesAsync(); }
        else
        {
            db.AddRange(first, second, tag); await db.SaveChangesAsync();
            var now = DateTimeOffset.UtcNow;
            foreach (var old in new[] { note, other })
                await db.Database.ExecuteSqlInterpolatedAsync($"""
                    INSERT INTO Notes (Id,UserId,Title,Content,DocumentSchemaVersion,IsPinned,Priority,SortOrder,CreatedTime,LastUpdatedTime,Version)
                    VALUES ({old.Id},{old.UserId},{old.Title},{old.Content},1,0,1,1000,{now},{now},{old.Version})
                    """);
            reminder.Note = null; reminder.NoteId = other.Id;
            db.Add(reminder); await db.SaveChangesAsync();
        }
        return new(note, other, tag, reminder);
    }

    [LocalDbFact]
    public async Task Inconsistent_legacy_links_stop_the_migration_before_ddl_without_deleting_data()
    {
        foreach (var kind in new[] { "label", "notification", "delivery" })
        {
            var name = "NTC_Test_" + Guid.NewGuid().ToString("N");
            await using var db = new DatabaseContext(new DbContextOptionsBuilder<DatabaseContext>().UseSqlServer(
                $"Server=(localdb)\\MSSQLLocalDB;Database={name};Trusted_Connection=True;TrustServerCertificate=True").Options);
            try
            {
                await db.GetService<IMigrator>().MigrateAsync("20261017044024_CompleteNoteBackend");
                var fixture = await Seed(db);
                if (kind == "label") await db.Database.ExecuteSqlInterpolatedAsync(
                    $"INSERT INTO NoteTags (NoteId,TagId) VALUES ({fixture.First.Id},{fixture.OtherLabel.Id})");
                else
                {
                    var rowId = Guid.NewGuid(); var version = Guid.NewGuid(); var now = DateTimeOffset.UtcNow;
                    if (kind == "notification") await db.Database.ExecuteSqlInterpolatedAsync($"""
                        INSERT INTO Notifications (Id,UserId,NoteId,ReminderId,OccurrenceAt,CreatedTime,LastUpdatedTime,Version)
                        VALUES ({rowId},{fixture.First.UserId},{fixture.First.Id},{fixture.OtherReminder.Id},{now},{now},{now},{version})
                        """);
                    else await db.Database.ExecuteSqlInterpolatedAsync($"""
                        INSERT INTO ReminderDeliveries (Id,UserId,NoteId,ReminderId,OccurrenceAt,CreatedTime,LastUpdatedTime,Version,Attempts,NextAttemptAt,Abandoned)
                        VALUES ({rowId},{fixture.First.UserId},{fixture.First.Id},{fixture.OtherReminder.Id},{now},{now},{now},{version},0,{now},0)
                        """);
                }
                var error = await Assert.ThrowsAsync<SqlException>(() => db.Database.MigrateAsync());
                Assert.Equal(50002, error.Number); Assert.Equal(2, (await db.Database.GetAppliedMigrationsAsync()).Count());
                Assert.Equal(0, await db.Database.SqlQueryRaw<int>("SELECT COUNT(*) AS [Value] FROM sys.columns WHERE object_id=OBJECT_ID(N'NoteTags') AND name=N'UserId'").SingleAsync());
                Assert.Equal(2, await db.Database.SqlQueryRaw<int>("SELECT COUNT(*) AS [Value] FROM Notes").SingleAsync());
                Assert.Equal("preserve-first", await db.Database.SqlQuery<string>($"SELECT [Content] AS [Value] FROM Notes WHERE [Id]={fixture.First.Id}").SingleAsync());
            }
            finally { Assert.Matches("^NTC_Test_[0-9a-f]{32}$", name); await db.Database.EnsureDeletedAsync(); }
        }
    }

    [LocalDbFact]
    public async Task Sql_server_constraints_reject_cross_owner_imports_and_invalid_recurrence()
    {
        var name = "NTC_Test_" + Guid.NewGuid().ToString("N");
        await using var db = new DatabaseContext(new DbContextOptionsBuilder<DatabaseContext>().UseSqlServer(
            $"Server=(localdb)\\MSSQLLocalDB;Database={name};Trusted_Connection=True;TrustServerCertificate=True").Options);
        try
        {
            await db.Database.MigrateAsync(); var fixture = await Seed(db);
            var linkError = await Assert.ThrowsAsync<SqlException>(() => db.Database.ExecuteSqlInterpolatedAsync(
                $"INSERT INTO NoteTags (NoteId,TagId,UserId) VALUES ({fixture.First.Id},{fixture.OtherLabel.Id},{fixture.First.UserId})"));
            Assert.Equal(547, linkError.Number);
            var ruleError = await Assert.ThrowsAsync<SqlException>(() => db.Database.ExecuteSqlInterpolatedAsync(
                $"UPDATE Reminders SET RepeatInterval=0 WHERE Id={fixture.OtherReminder.Id}"));
            Assert.Equal(547, ruleError.Number); Assert.Empty(await db.NoteTags.ToListAsync());
        }
        finally { Assert.Matches("^NTC_Test_[0-9a-f]{32}$", name); await db.Database.EnsureDeletedAsync(); }
    }
}
