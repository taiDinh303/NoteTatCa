using Microsoft.AspNetCore.Identity;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using NTC.Contract.Repositories.Entities;
using NTC.Repositories.Context;
using NTC.Tests.Infrastructure;
namespace NTC.Tests.Integration;
public sealed class MigrationSafetyTests
{
    [LocalDbFact]
    public async Task Duplicate_email_preflight_fails_without_merging_or_deleting_accounts()
    {
        var name="NTC_Test_"+Guid.NewGuid().ToString("N");
        await using var db=new DatabaseContext(new DbContextOptionsBuilder<DatabaseContext>().UseSqlServer($"Server=(localdb)\\MSSQLLocalDB;Database={name};Trusted_Connection=True;TrustServerCertificate=True").Options);
        try
        {
            await db.GetService<IMigrator>().MigrateAsync("20260731153548_InitialCreate");
            await db.Database.ExecuteSqlRawAsync("""
                INSERT INTO AspNetUsers (Id,Email,NormalizedEmail,EmailConfirmed,PhoneNumberConfirmed,TwoFactorEnabled,LockoutEnabled,AccessFailedCount,CreatedTime,LastUpdatedTime)
                VALUES (NEWID(),'duplicate@example.test','DUPLICATE@EXAMPLE.TEST',1,0,0,1,0,SYSDATETIMEOFFSET(),SYSDATETIMEOFFSET()),
                (NEWID(),'duplicate@example.test','DUPLICATE@EXAMPLE.TEST',1,0,0,1,0,SYSDATETIMEOFFSET(),SYSDATETIMEOFFSET());
                """);
            var error=await Assert.ThrowsAsync<SqlException>(()=>db.Database.MigrateAsync());Assert.Equal(50001,error.Number);
            await using var command=db.Database.GetDbConnection().CreateCommand();command.CommandText="SELECT COUNT(*) FROM AspNetUsers";
            await db.Database.OpenConnectionAsync();Assert.Equal(2,Convert.ToInt32(await command.ExecuteScalarAsync()));
            Assert.Single(await db.Database.GetAppliedMigrationsAsync());
        }
        finally{Assert.Matches("^NTC_Test_[0-9a-f]{32}$",name);await db.Database.EnsureDeletedAsync();}
    }
    [LocalDbFact]
    public async Task Sql_server_concurrency_token_rejects_a_stale_write_from_a_second_context()
    {
        var name="NTC_Test_"+Guid.NewGuid().ToString("N");var options=new DbContextOptionsBuilder<DatabaseContext>().UseSqlServer($"Server=(localdb)\\MSSQLLocalDB;Database={name};Trusted_Connection=True;TrustServerCertificate=True").Options;
        await using var first=new DatabaseContext(options);
        try
        {
            await first.Database.MigrateAsync();var user=new ApplicationUser{Id=Guid.NewGuid(),UserName="fixture",Email="fixture@example.test"};first.Users.Add(user);
            var note=new Note{UserId=user.Id,Title="Concurrent",Content="original"};first.Notes.Add(note);await first.SaveChangesAsync();
            await using var second=new DatabaseContext(options);var stale=await second.Notes.SingleAsync(x=>x.Id==note.Id);
            note.Content="winner";await first.SaveChangesAsync();stale.Content="loser";await Assert.ThrowsAsync<DbUpdateConcurrencyException>(()=>second.SaveChangesAsync());
            first.ChangeTracker.Clear();Assert.Equal("winner",(await first.Notes.SingleAsync()).Content);
        }
        finally{Assert.Matches("^NTC_Test_[0-9a-f]{32}$",name);await first.Database.EnsureDeletedAsync();}
    }
}
