using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;
namespace NTC.Repositories.Context;
// Schema generation never reads the owner's appsettings or connects to a live database.
public sealed class SqlServerDesignFactory : IDesignTimeDbContextFactory<DatabaseContext>
{
    public DatabaseContext CreateDbContext(string[] args) => new(new DbContextOptionsBuilder<DatabaseContext>()
        .UseSqlServer("Server=(localdb)\\MSSQLLocalDB;Database=NTC_DesignOnly;Trusted_Connection=True;TrustServerCertificate=True").Options);
}
public sealed class PostgreSqlDesignFactory : IDesignTimeDbContextFactory<PostgreSqlDatabaseContext>
{
    public PostgreSqlDatabaseContext CreateDbContext(string[] args) => new(new DbContextOptionsBuilder<PostgreSqlDatabaseContext>()
        .UseNpgsql("Host=127.0.0.1;Database=ntc_design_only;Username=design_only;Password=not-a-real-credential",
            postgres => postgres.MigrationsHistoryTable("__EFMigrationsHistory", "ntc")).Options);
}
