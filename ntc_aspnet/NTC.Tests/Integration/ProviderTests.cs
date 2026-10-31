using Microsoft.AspNetCore.Identity;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using NTC.Contract.Repositories.Entities;
using NTC.Repositories.Context;
using NTC.Tests.Infrastructure;
namespace NTC.Tests.Integration;

public sealed class ProviderTests
{
    [Fact]
    public void Models_and_migration_histories_are_separate_for_sql_server_and_postgres()
    {
        using var sql=new SqlServerDesignFactory().CreateDbContext([]);using var pg=new PostgreSqlDesignFactory().CreateDbContext([]);
        var sqlScript=sql.Database.GenerateCreateScript();var pgScript=pg.Database.GenerateCreateScript();
        Assert.Contains("[Notes]",sqlScript);Assert.Contains("uuid",pgScript);Assert.Contains("ntc",pgScript);
        Assert.Equal(new[] {
            "20260731153548_InitialCreate", "20261017044024_CompleteNoteBackend",
            "20261017122802_EnforceEntityIntegrity", "20261017160312_SupportAccountReactivation",
            "20261026181013_AddNoteRevisions", "20261027152708_AddMascotGenerations"
        }, sql.Database.GetMigrations());
        Assert.Equal(new[] {
            "20261017044034_InitialPostgreSql", "20261017122809_EnforceEntityIntegrity",
            "20261017160333_SupportAccountReactivation", "20261027030859_AddNoteRevisions",
            "20261027152721_AddMascotGenerations"
        }, pg.Database.GetMigrations());
        Assert.DoesNotContain("uniqueidentifier",pgScript,StringComparison.OrdinalIgnoreCase);
        Assert.False(sql.Database.HasPendingModelChanges());Assert.False(pg.Database.HasPendingModelChanges());
    }
    [LocalDbFact]
    public async Task Sql_server_additive_migration_preserves_legacy_account_password_note_and_time()
    {
        var dbName="NTC_Test_"+Guid.NewGuid().ToString("N");
        var options=new DbContextOptionsBuilder<DatabaseContext>().UseSqlServer($"Server=(localdb)\\MSSQLLocalDB;Database={dbName};Trusted_Connection=True;TrustServerCertificate=True").Options;
        await using var db=new DatabaseContext(options);
        try
        {
            await db.GetService<IMigrator>().MigrateAsync("20260731153548_InitialCreate");
            var userId=Guid.NewGuid();var noteId=Guid.NewGuid();var tagId=Guid.NewGuid();var time=DateTimeOffset.Parse("2026-08-01T09:30:00+07:00");
            var hash=new PasswordHasher<ApplicationUser>().HashPassword(new(),"Synthetic-legacy-password-123!");
            await db.Database.ExecuteSqlRawAsync("""
                INSERT INTO AspNetUsers (Id,UserName,NormalizedUserName,Email,NormalizedEmail,EmailConfirmed,PasswordHash,SecurityStamp,ConcurrencyStamp,PhoneNumberConfirmed,TwoFactorEnabled,LockoutEnabled,AccessFailedCount,CreatedTime,LastUpdatedTime)
                VALUES (@id,'legacy@example.test','LEGACY@EXAMPLE.TEST','legacy@example.test','LEGACY@EXAMPLE.TEST',1,@hash,'stamp','concurrency',0,0,1,0,@time,@time);
                INSERT INTO Notes (Id,UserId,Title,Content,IsPinned,Priority,SortOrder,CreatedTime,LastUpdatedTime)
                VALUES (@note,@id,'Legacy note','<b>Keep this as plain text</b>',0,1,1000,@time,@time);
                INSERT INTO Tags (Id,UserId,Name,CreatedTime,LastUpdatedTime) VALUES (@tag,@id,'Legacy label',@time,@time);
                INSERT INTO NoteTags (NoteId,TagId) VALUES (@note,@tag);
                """,new SqlParameter("@id",userId),new SqlParameter("@note",noteId),new SqlParameter("@tag",tagId),new SqlParameter("@hash",hash),new SqlParameter("@time",time));
            await db.Database.MigrateAsync();
            var user=await db.Users.SingleAsync(x=>x.Id==userId);var note=await db.Notes.SingleAsync(x=>x.Id==noteId);
            Assert.Equal(PasswordVerificationResult.Success,new PasswordHasher<ApplicationUser>().VerifyHashedPassword(user,user.PasswordHash!,"Synthetic-legacy-password-123!"));
            Assert.Equal("<b>Keep this as plain text</b>",note.Content);Assert.Null(note.DocumentJson);Assert.Equal(1,note.DocumentSchemaVersion);Assert.Equal(time.UtcDateTime,note.CreatedTime.UtcDateTime);
            Assert.Equal("Asia/Ho_Chi_Minh",user.TimeZoneId);Assert.False(user.IsLocked);
            Assert.NotEqual(Guid.Empty,note.Version); // v1 rejects an empty expected version.
            Assert.Equal(userId,(await db.NoteTags.SingleAsync()).UserId);
            Assert.Equal("Legacy label",(await db.Tags.SingleAsync()).Name);
            var before=note.Version;note.Content="Updated";await db.SaveChangesAsync();Assert.NotEqual(before,note.Version);
            Assert.Empty(await db.Database.GetPendingMigrationsAsync());
        }
        finally
        {
            Assert.Matches("^NTC_Test_[0-9a-f]{32}$",dbName);
            await db.Database.EnsureDeletedAsync();
        }
    }
}
