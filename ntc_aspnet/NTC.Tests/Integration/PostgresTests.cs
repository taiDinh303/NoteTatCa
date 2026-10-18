using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql;
using NTC.Contract.Repositories.Entities;
using NTC.Repositories.Context;
using NTC.Tests.Infrastructure;
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
            var tag=new Tag {UserId=user.Id,Name="Legacy label"};db.AddRange(note,tag);await db.SaveChangesAsync();
            await db.Database.ExecuteSqlInterpolatedAsync($"INSERT INTO ntc.\"NoteTags\" (\"NoteId\",\"TagId\") VALUES ({note.Id},{tag.Id})");
            await db.Database.MigrateAsync();
            var id=note.Id;db.ChangeTracker.Clear();var saved=await db.Notes.SingleAsync(x=>x.Id==id);
            Assert.Equal("Giữ nguyên nội dung",saved.Content);Assert.Equal(TimeSpan.Zero,saved.CreatedTime.Offset);Assert.Equal("ntc",db.Model.GetDefaultSchema());
            Assert.Empty(await db.Database.GetPendingMigrationsAsync());
            Assert.Equal(user.Id,(await db.NoteTags.SingleAsync()).UserId);
        }
        finally
        {
            Assert.Matches("^ntc_test_[0-9a-f]{32}$",name);
            await using var drop=new NpgsqlCommand($"DROP DATABASE \"{name}\" WITH (FORCE)",admin);await drop.ExecuteNonQueryAsync();
        }
    }
}
