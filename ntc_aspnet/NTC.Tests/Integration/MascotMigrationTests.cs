using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using NTC.Repositories.Context;
namespace NTC.Tests.Integration;
public sealed class MascotMigrationTests
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public void Mascot_migration_only_adds_its_owned_queue_and_unique_quota(bool postgres)
    {
        using DatabaseContext db = postgres ? new PostgreSqlDesignFactory().CreateDbContext([]) : new SqlServerDesignFactory().CreateDbContext([]);
        var migrations = db.Database.GetMigrations().ToArray();
        var target = Array.FindIndex(migrations, m => m.EndsWith("_AddMascotGenerations"));
        Assert.True(target > 0);
        var script = db.GetService<IMigrator>().GenerateScript(migrations[target - 1], migrations[target]);
        Assert.Contains("MascotGeneration", script); Assert.Contains("UserId_QuotaDay", script); Assert.Contains("UserId_RequestId", script);
        Assert.Contains("UNIQUE", script); Assert.DoesNotContain("DROP TABLE", script); Assert.DoesNotContain("ALTER TABLE", script);
        Assert.False(db.Database.HasPendingModelChanges());
    }
}
