using Microsoft.EntityFrameworkCore;
using Npgsql;
using NTC.API.Configuration;
using NTC.Repositories.Context;

namespace NTC.API.Operations;

public static class SupabaseSetup
{
    public static void ValidateTarget(IConfiguration config, DatabaseContext database)
    {
        if (!database.Database.IsNpgsql()) throw new InvalidOperationException("Supabase setup requires PostgreSQL.");
        var reference = config["Supabase:ProjectRef"];
        var pooler = config["Supabase:SessionPoolerHost"];
        if (string.IsNullOrWhiteSpace(reference) || !System.Text.RegularExpressions.Regex.IsMatch(reference, "^[a-z]{20}$"))
            throw new InvalidOperationException("Configure the expected Supabase project reference.");
        var connection = new NpgsqlConnectionStringBuilder(DatabaseConfiguration.NormalizePostgres(config.GetConnectionString("MyCnn") ?? ""));
        var direct = connection.Host == $"db.{reference}.supabase.co" && connection.Username == "postgres";
        var session = !string.IsNullOrWhiteSpace(pooler) && pooler.EndsWith(".pooler.supabase.com", StringComparison.Ordinal)
            && connection.Host == pooler && connection.Username == $"postgres.{reference}";
        if ((!direct && !session) || connection.Port != 5432 || connection.Database != "postgres"
            || connection.SslMode != SslMode.VerifyFull)
            throw new InvalidOperationException("Target must match the expected Supabase direct/session host, user, postgres database, port5432 and VerifyFull TLS.");
    }

    public static async Task<bool> CheckAsync(DatabaseContext database)
    {
        // Connectivity only; never creates schema or applies a migration.
        await database.Database.OpenConnectionAsync();
        var pending = (await database.Database.GetPendingMigrationsAsync()).ToArray();
        Console.WriteLine($"Supabase connected with TLS. Pending EF migrations: {pending.Length}.");
        await database.Database.CloseConnectionAsync();
        return pending.Length == 0;
    }

    public static async Task InitializeAsync(DatabaseContext database)
    {
        await database.Database.OpenConnectionAsync();
        await using var command = database.Database.GetDbConnection().CreateCommand();
        command.CommandText = "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'ntc' AND table_type = 'BASE TABLE'";
        var tables = Convert.ToInt64(await command.ExecuteScalarAsync());
        var pending = (await database.Database.GetPendingMigrationsAsync()).ToArray();
        if (tables > 0 && pending.Length > 0)
            throw new InvalidOperationException("The ntc schema already contains tables with pending migrations. Review the preservation/migration plan before changing it.");
        if (pending.Length > 0) await database.Database.MigrateAsync();
        // No Data API grants: Identity notes stay behind the .NET API, outside public.
        await database.Database.ExecuteSqlRawAsync("""
            REVOKE ALL ON SCHEMA ntc FROM PUBLIC;
            REVOKE ALL ON ALL TABLES IN SCHEMA ntc FROM PUBLIC;
            DO $ntc$
            DECLARE target_role text;
            BEGIN
              FOREACH target_role IN ARRAY ARRAY['anon','authenticated'] LOOP
                IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = target_role) THEN
                  EXECUTE format('REVOKE ALL ON SCHEMA ntc FROM %I', target_role);
                  EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA ntc FROM %I', target_role);
                  EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA ntc FROM %I', target_role);
                END IF;
              END LOOP;
            END $ntc$;
            """);
        await database.Database.CloseConnectionAsync();
        Console.WriteLine("Supabase ntc schema ready; existing EF migrations preserved; no public Data API grants.");
    }
}
