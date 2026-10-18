using Microsoft.EntityFrameworkCore;
using Npgsql;
using NTC.Repositories.Context;
namespace NTC.API.Configuration;
public static class DatabaseConfiguration
{
    public static string NormalizePostgres(string connection)
    {
        if (!connection.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) && !connection.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase)) return connection;
        var uri = new Uri(connection); var split = uri.UserInfo.Split(':', 2);
        var builder = new NpgsqlConnectionStringBuilder { Host = uri.Host, Port = uri.IsDefaultPort ? 5432 : uri.Port,
            Database = Uri.UnescapeDataString(uri.AbsolutePath.TrimStart('/')), Username = Uri.UnescapeDataString(split[0]),
            Password = split.Length > 1 ? Uri.UnescapeDataString(split[1]) : "", SslMode = SslMode.Require };
        var query = Microsoft.AspNetCore.WebUtilities.QueryHelpers.ParseQuery(uri.Query);
        foreach (var item in query)
            if (item.Key.Equals("sslmode", StringComparison.OrdinalIgnoreCase))
            {
                // PostgreSQL URI uses verify-full/verify-ca; Npgsql enums use VerifyFull/VerifyCA.
                if (!Enum.TryParse<SslMode>(item.Value.ToString().Replace("-", ""), true, out var mode)
                    || !Enum.IsDefined(mode)) throw new InvalidOperationException("Unsupported PostgreSQL sslmode.");
                builder.SslMode = mode;
            }
            else if (item.Key.Equals("application_name", StringComparison.OrdinalIgnoreCase)) builder.ApplicationName = item.Value.ToString();
            else throw new InvalidOperationException("Unsupported PostgreSQL URI option. Use a reviewed keyword connection string.");
        return builder.ConnectionString;
    }
    public static void AddDatabase(this IServiceCollection services, IConfiguration config)
    {
        var provider = config["Database:Provider"] ?? "SqlServer";
        if (provider.Equals("PostgreSQL", StringComparison.OrdinalIgnoreCase))
        {
            services.AddDbContext<PostgreSqlDatabaseContext>((sp, options) => options.UseNpgsql(NormalizePostgres(RequiredConnection(sp)),
                postgres => postgres.MigrationsHistoryTable("__EFMigrationsHistory", "ntc")));
            services.AddScoped<DatabaseContext>(sp => sp.GetRequiredService<PostgreSqlDatabaseContext>());
        }
        else if (provider.Equals("SqlServer", StringComparison.OrdinalIgnoreCase))
            services.AddDbContext<DatabaseContext>((sp, options) => options.UseSqlServer(RequiredConnection(sp)));
        else throw new InvalidOperationException("Database:Provider must be SqlServer or PostgreSQL.");
    }
    private static string RequiredConnection(IServiceProvider sp)
    {
        var value = sp.GetRequiredService<IConfiguration>().GetConnectionString("MyCnn");
        return string.IsNullOrWhiteSpace(value) ? throw new InvalidOperationException("Database connection is not configured.") : value;
    }
}
