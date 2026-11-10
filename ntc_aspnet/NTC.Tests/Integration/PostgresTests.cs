using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql;
using NTC.Contract.Repositories.Entities;
using NTC.Repositories.Context;
using NTC.Tests.Infrastructure;
using NTC.Core.Security;
using NTC.Contract.Repositories.Entities.Tasks;
using NTC.Repositories.UOW;
using NTC.Services.Service;
namespace NTC.Tests.Integration;
public sealed class PostgresTests
{
    [PostgresFact]
    public async Task Postgres_baseline_migrates_and_round_trips_unicode_identity_note_and_utc_time()
    {
        var adminConfig=new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("NTC_TEST_POSTGRES"));
        Assert.Contains(adminConfig.Host,new[]{"localhost","127.0.0.1","::1"});Assert.Equal("postgres",adminConfig.Database);
        var name="ntc_test_"+Guid.NewGuid().ToString("N");Assert.Matches("^ntc_test_[0-9a-f]{32}$",name);
        await using var admin=new NpgsqlConnection(adminConfig.ConnectionString);await admin.OpenAsync();
        await using(var command=new NpgsqlCommand($"CREATE DATABASE \"{name}\"",admin))await command.ExecuteNonQueryAsync();
        try
        {
            var test=new NpgsqlConnectionStringBuilder(adminConfig.ConnectionString){Database=name};
            await using var db=new PostgreSqlDatabaseContext(new DbContextOptionsBuilder<PostgreSqlDatabaseContext>().UseNpgsql(test.ConnectionString,
                postgres=>postgres.MigrationsHistoryTable("__EFMigrationsHistory","ntc")).Options);
            await db.GetService<IMigrator>().MigrateAsync("20261017044034_InitialPostgreSql");
            var user=new ApplicationUser {Id=Guid.NewGuid(),UserName="fixture@example.test",Email="fixture@example.test",EmailConfirmed=true};
            db.Users.Add(user);var note=new Note {UserId=user.Id,Title="Unicode 📝",Content="Giữ nguyên nội dung",SortOrder=1000};
            var tag=new Tag {UserId=user.Id,Name="Legacy label"};db.Add(tag);await db.SaveChangesAsync();
            // Seed the historical schema explicitly; the current EF Note also maps IsHidden, which does not exist yet.
            var now=DateTimeOffset.UtcNow;
            await db.Database.ExecuteSqlInterpolatedAsync($"""
                INSERT INTO ntc."Notes" ("Id","UserId","Title","Content","DocumentSchemaVersion","IsPinned","Priority","SortOrder","CreatedTime","LastUpdatedTime","Version")
                VALUES ({note.Id},{user.Id},{note.Title},{note.Content},1,false,1,1000,{now},{now},{note.Version})
                """);
            await db.Database.ExecuteSqlInterpolatedAsync($"INSERT INTO ntc.\"NoteTags\" (\"NoteId\",\"TagId\") VALUES ({note.Id},{tag.Id})");
            await db.Database.MigrateAsync();
            var id=note.Id;db.ChangeTracker.Clear();var saved=await db.Notes.SingleAsync(x=>x.Id==id);
            Assert.False(saved.IsHidden);Assert.Equal("Giữ nguyên nội dung",saved.Content);Assert.Equal(TimeSpan.Zero,saved.CreatedTime.Offset);Assert.Equal("ntc",db.Model.GetDefaultSchema());
            Assert.Empty(await db.Database.GetPendingMigrationsAsync());
            Assert.Equal(user.Id,(await db.NoteTags.SingleAsync()).UserId);
            var announcement = new Announcement { AuthorId = user.Id, Title = "System notice", Body = "Plain <script> text", AllActiveUsers = true,
                CreateRequestId = Guid.NewGuid(), CreateRequestHash = new string('A', 64), PublishedAt = now,
                PublishedBy = user.Id, PublishRequestId = Guid.NewGuid(), PublishedVersion = Guid.NewGuid(), RecipientCount = 1 };
            announcement.Receipts.Add(new() { UserId = user.Id, AnnouncementId = announcement.Id });
            db.Add(announcement); await db.SaveChangesAsync();
            using (var work = new UnitOfWork(db)) {
                var service = new AnnouncementService(work, new RecipientActor(user.Id), TimeProvider.System);
                var feed = await service.FeedAsync(1, 20, false);
                Assert.Equal("announcement", Assert.Single(feed.Items).Kind); Assert.Equal(1, await service.CountUnreadAsync());
                await service.ReadAsync(Assert.Single(feed.Items).Id); Assert.Equal(0, await service.CountUnreadAsync());
                announcement.RevokedAt = DateTimeOffset.UtcNow; announcement.RevokedBy = user.Id; await db.SaveChangesAsync();
                Assert.Empty((await service.FeedAsync(1, 20, false)).Items);
            }
            saved.IsHidden=true;await db.SaveChangesAsync();db.ChangeTracker.Clear();
            Assert.Empty(await db.Notes.AsNoTracking().ToListAsync());Assert.Empty(await db.NoteTags.AsNoTracking().ToListAsync());
            var access=new NoteAccess {HiddenNotesUnlocked=true};
            await using var opened=new PostgreSqlDatabaseContext(new DbContextOptionsBuilder<PostgreSqlDatabaseContext>().UseNpgsql(test.ConnectionString).Options,noteAccess:access);
            Assert.Single(await opened.Notes.AsNoTracking().ToListAsync());Assert.Single(await opened.NoteTags.AsNoTracking().ToListAsync());
            access.HiddenNotesUnlocked=false;Assert.Empty(await opened.Notes.AsNoTracking().ToListAsync());
        }
        finally
        {
            Assert.Matches("^ntc_test_[0-9a-f]{32}$",name);
            await using var drop=new NpgsqlCommand($"DROP DATABASE \"{name}\" WITH (FORCE)",admin);await drop.ExecuteNonQueryAsync();
        }
    }
    private sealed class RecipientActor(Guid id) : ICurrentUser
    {
        public bool IsAuthenticated => true;
        public Guid? UserId => id;
        public Guid? SessionId => null;
        public string Name => "Synthetic recipient";
        public bool IsInRole(string role) => role == "User";
    }
}
