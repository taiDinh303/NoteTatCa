using System.Text;
using Npgsql;
using Microsoft.Data.SqlClient;

namespace NTC.API.Configuration;

/// <summary>Validates deployment inputs without opening connections or exposing values.</summary>
public static class StartupConfiguration
{
    public static void Validate(IConfiguration config, IHostEnvironment environment, Func<string, string> normalizePostgres)
    {
        // Integration fixtures supply their own persistence/authentication in Testing.
        if (environment.IsEnvironment("Testing")) return;
        var errors = new List<string>();
        var production = environment.IsProduction();
        var provider = config["Database:Provider"] ?? "SqlServer";
        if (!provider.Equals("SqlServer", StringComparison.OrdinalIgnoreCase)
            && !provider.Equals("PostgreSQL", StringComparison.OrdinalIgnoreCase))
            errors.Add("DATABASE__PROVIDER must be SqlServer or PostgreSQL.");
        var storageProvider = config["Storage:Provider"];
        if (storageProvider is not null && !new[] { "Local", "Supabase", "Auto" }.Contains(storageProvider, StringComparer.OrdinalIgnoreCase))
            errors.Add("STORAGE__PROVIDER must be Local, Supabase or Auto.");
        var connection = config.GetConnectionString("MyCnn");
        if (string.IsNullOrWhiteSpace(connection) || IsPlaceholder(connection))
            errors.Add("CONNECTIONSTRINGS__MYCNN is required in User Secrets or the hosting secret store.");
        else if (provider.Equals("PostgreSQL", StringComparison.OrdinalIgnoreCase))
        {
            try
            {
                var postgres = new NpgsqlConnectionStringBuilder(normalizePostgres(connection));
                if (string.IsNullOrWhiteSpace(postgres.Host) || string.IsNullOrWhiteSpace(postgres.Database))
                    errors.Add("CONNECTIONSTRINGS__MYCNN must specify Host and Database.");
                var host = postgres.Host ?? string.Empty;
                var supabase = host.EndsWith(".supabase.co", StringComparison.OrdinalIgnoreCase)
                    || host.EndsWith(".supabase.com", StringComparison.OrdinalIgnoreCase);
                if (production && supabase && postgres.SslMode != SslMode.VerifyFull)
                    errors.Add("CONNECTIONSTRINGS__MYCNN must use SSL Mode=VerifyFull for Supabase in Production.");
                if (postgres.RootCertificate is { Length: > 0 } certificate && !File.Exists(certificate))
                    errors.Add("CONNECTIONSTRINGS__MYCNN Root Certificate file does not exist on this host.");
            }
            catch (Exception error) when (error is ArgumentException or FormatException or InvalidOperationException)
            { errors.Add("CONNECTIONSTRINGS__MYCNN is not a supported PostgreSQL connection string; use reviewed keyword syntax."); }
        }
        else if (provider.Equals("SqlServer", StringComparison.OrdinalIgnoreCase))
        {
            try
            {
                var sql = new SqlConnectionStringBuilder(connection);
                if (string.IsNullOrWhiteSpace(sql.DataSource) || string.IsNullOrWhiteSpace(sql.InitialCatalog))
                    errors.Add("CONNECTIONSTRINGS__MYCNN must specify Server and Database.");
            }
            catch (ArgumentException) { errors.Add("CONNECTIONSTRINGS__MYCNN is not a supported SQL Server connection string."); }
        }
        var key = config["JwtSettings:Key"];
        if (string.IsNullOrWhiteSpace(key) || Encoding.UTF8.GetByteCount(key) < 32 || (production && IsPlaceholder(key)))
            errors.Add("JWTSETTINGS__KEY must be a private signing key of at least 32 UTF-8 bytes; Production cannot use a placeholder.");
        foreach (var field in new[] { "Issuer", "Audience" })
            if (string.IsNullOrWhiteSpace(config[$"JwtSettings:{field}"]) || IsPlaceholder(config[$"JwtSettings:{field}"]!))
                errors.Add($"JWTSETTINGS__{field.ToUpperInvariant()} is required in the safe application defaults.");
        foreach (var flag in new[] { "BackgroundJobs:Enabled", "Swagger:Enabled", "Authentication:Google:Enabled" })
            ReadFlag(config, flag, errors);
        if (production)
        {
            if (!IsHttpsUrl(config["AppSettings:ClientUrl"], originOnly: false))
                errors.Add("APPSETTINGS__CLIENTURL must be an absolute HTTPS frontend URL without placeholders, credentials, query or fragment.");
            var origins = config.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
            if (origins.Length == 0 || origins.Any(origin => !IsHttpsUrl(origin, originOnly: true)))
                errors.Add("CORS__ALLOWEDORIGINS__0 must specify exact HTTPS origins; wildcards and paths are not allowed.");
            foreach (var flag in new[] { "DatabaseInitialization:Enabled", "Seed:Enabled", "DemoAccounts:Enabled" })
                if (ReadFlag(config, flag, errors)) errors.Add($"{flag.Replace(":", "__").ToUpperInvariant()} must be false in Production; provisioning is an explicit operation.");
            if (config["Storage:Provider"]?.Equals("Supabase", StringComparison.OrdinalIgnoreCase) == true)
            {
                if (!IsHttpsUrl(config["Supabase:Url"], originOnly: true)) errors.Add("SUPABASE__URL must be the HTTPS Storage project URL.");
                if (string.IsNullOrWhiteSpace(config["Supabase:ServiceKey"]) && string.IsNullOrWhiteSpace(config["Supabase:Service_Key"]))
                    errors.Add("SUPABASE__SERVICEKEY is required for the Supabase Storage provider (legacy SERVICE_KEY remains supported).");
            }
        }
        if (errors.Count != 0)
            throw new InvalidOperationException("CONFIGURATION_INVALID: fix the following keys before starting:\n - " + string.Join("\n - ", errors));
    }

    public static void ReportWarnings(IConfiguration config, IHostEnvironment environment, ILogger logger)
    {
        if (environment.IsProduction() && string.IsNullOrWhiteSpace(config["DataProtection:KeysDirectory"]))
            logger.LogWarning("CONFIGURATION_WARNING: DataProtection__KeysDirectory is not configured. Identity recovery tokens may not survive container replacement; configure durable protected key storage before enabling recovery flows.");
    }

    private static bool ReadFlag(IConfiguration config, string key, List<string> errors)
    {
        var value = config[key];
        if (value is null) return false;
        if (bool.TryParse(value, out var enabled)) return enabled;
        errors.Add($"{key.Replace(":", "__").ToUpperInvariant()} must be true or false.");
        return false;
    }

    private static bool IsHttpsUrl(string? value, bool originOnly) => !string.IsNullOrWhiteSpace(value)
        && !IsPlaceholder(value) && Uri.TryCreate(value, UriKind.Absolute, out var uri)
        && uri.Scheme == Uri.UriSchemeHttps && !string.IsNullOrWhiteSpace(uri.Host)
        && uri.UserInfo.Length == 0 && uri.Query.Length == 0 && uri.Fragment.Length == 0
        && (!originOnly || uri.AbsolutePath == "/");

    private static bool IsPlaceholder(string value) => new[] { "CHANGE_ME", "CHANGE-ME", "YOUR_", "YOUR-", "[YOUR", "LOCAL-DEVELOPMENT" }
        .Any(marker => value.Contains(marker, StringComparison.OrdinalIgnoreCase));
}
