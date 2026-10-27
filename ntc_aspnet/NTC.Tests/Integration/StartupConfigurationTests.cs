using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using NTC.API.Configuration;

namespace NTC.Tests.Integration;

public sealed class StartupConfigurationTests
{
    [Fact]
    public void Mascot_ai_is_opt_in_and_requires_a_backend_key_without_echoing_it()
    {
        var values = Valid(); Check(values);
        values["MascotAi:Enabled"] = "true";
        Assert.Contains("MASCOTAI__OPENAIAPIKEY", Assert.Throws<InvalidOperationException>(() => Check(values)).Message);
        values["MascotAi:OpenAiApiKey"] = "synthetic-private-key"; Check(values);
        values["MascotAi:Model"] = "unsupported";
        var error = Assert.Throws<InvalidOperationException>(() => Check(values));
        Assert.Contains("MASCOTAI__MODEL", error.Message); Assert.DoesNotContain("synthetic-private-key", error.Message);
    }
    [Fact]
    public void Brevo_requires_key_and_verified_sender_configuration_without_disclosing_secrets()
    {
        var values = Valid(); values["Email:Provider"] = "Brevo";
        var error = Assert.Throws<InvalidOperationException>(() => Check(values));
        Assert.Contains("EMAIL__BREVO__APIKEY", error.Message);
        Assert.Contains("EMAIL__FROMEMAIL", error.Message);
        values["Email:Brevo:ApiKey"] = "synthetic-secret";
        values["Email:FromEmail"] = "sender@example.test";
        Check(values);
        values["Email:Provider"] = "typo";
        Assert.Contains("EMAIL__PROVIDER", Assert.Throws<InvalidOperationException>(() => Check(values)).Message);
    }
    private static Dictionary<string, string?> Valid() => new()
    {
        ["Database:Provider"]="PostgreSQL",
        ["ConnectionStrings:MyCnn"]="Host=127.0.0.1;Port=65431;Database=synthetic;Username=synthetic;Password=synthetic;SSL Mode=Disable",
        ["JwtSettings:Key"]="Synthetic-configuration-signing-key-123456789",
        ["JwtSettings:Issuer"]="Synthetic.API", ["JwtSettings:Audience"]="Synthetic.Web",
        ["AppSettings:ClientUrl"]="https://client.example.test", ["Cors:AllowedOrigins:0"]="https://client.example.test"
    };
    private static void Check(Dictionary<string,string?> values, string environment="Production") =>
        StartupConfiguration.Validate(new ConfigurationBuilder().AddInMemoryCollection(values).Build(), new TestEnvironment(environment),
            DatabaseConfiguration.NormalizePostgres);

    [Theory]
    [InlineData("PostgreSQL", "Host=127.0.0.1;Port=65431;Database=synthetic;Username=synthetic;Password=synthetic;SSL Mode=Disable")]
    [InlineData("SqlServer", "Server=127.0.0.1,65431;Database=synthetic;User ID=synthetic;Password=synthetic;Encrypt=true")]
    public void Validates_both_providers_without_opening_a_database(string provider,string connection)
    { var values=Valid(); values["Database:Provider"]=provider; values["ConnectionStrings:MyCnn"]=connection; Check(values); }

    [Fact]
    public void Aggregates_actionable_key_names_without_echoing_credentials()
    {
        var values=Valid(); const string secret="private-credential-not-for-logs";
        values["ConnectionStrings:MyCnn"]="Host=127.0.0.1;UnknownSecret="+secret;
        values["JwtSettings:Key"]=secret; values["AppSettings:ClientUrl"]=""; values["Cors:AllowedOrigins:0"]="*";
        var error=Assert.Throws<InvalidOperationException>(()=>Check(values));
        Assert.Contains("CONFIGURATION_INVALID",error.Message); Assert.Contains("CONNECTIONSTRINGS__MYCNN",error.Message);
        Assert.Contains("JWTSETTINGS__KEY",error.Message); Assert.Contains("APPSETTINGS__CLIENTURL",error.Message);
        Assert.Contains("CORS__ALLOWEDORIGINS__0",error.Message); Assert.DoesNotContain(secret,error.Message);
    }

    [Theory]
    [InlineData("AppSettings:ClientUrl","https://YOUR-PROJECT.vercel.app")]
    [InlineData("AppSettings:ClientUrl","https://name:secret@example.test")]
    [InlineData("Cors:AllowedOrigins:0","https://client.example.test/path")]
    [InlineData("Cors:AllowedOrigins:0","https://client.example.test?query=1")]
    [InlineData("Seed:Enabled","true")]
    [InlineData("DatabaseInitialization:Enabled","true")]
    [InlineData("DemoAccounts:Enabled","true")]
    [InlineData("BackgroundJobs:Enabled","not-a-boolean")]
    [InlineData("Storage:Provider","typo-provider")]
    public void Production_rejects_invalid_urls_and_unsafe_operation_flags(string key,string value)
    { var values=Valid(); values[key]=value; Assert.Throws<InvalidOperationException>(()=>Check(values)); }

    [Fact]
    public void Development_allows_local_http_and_testing_uses_fixture_configuration()
    {
        var values=Valid(); values["AppSettings:ClientUrl"]="http://localhost:5173"; values["Cors:AllowedOrigins:0"]="http://localhost:5173";
        Check(values,"Development"); Check([],"Testing");
    }

    [Fact]
    public void Supabase_production_requires_verify_full_and_existing_custom_ca_file()
    {
        var values=Valid(); values["ConnectionStrings:MyCnn"]="Host=example.pooler.supabase.com;Database=synthetic;Username=synthetic;Password=synthetic;SSL Mode=Require";
        Assert.Contains("VerifyFull",Assert.Throws<InvalidOperationException>(()=>Check(values)).Message);
        values["ConnectionStrings:MyCnn"]=values["ConnectionStrings:MyCnn"]!.Replace("Require","VerifyFull"); Check(values);
        values["ConnectionStrings:MyCnn"]+=";Root Certificate="+Path.Combine(Path.GetTempPath(),Guid.NewGuid()+".crt");
        Assert.Contains("Root Certificate",Assert.Throws<InvalidOperationException>(()=>Check(values)).Message);
    }

    [Fact]
    public void Optional_storage_preserves_legacy_secret_alias_when_canonical_value_is_empty()
    {
        var values=Valid(); values["Storage:Provider"]="Supabase"; values["Supabase:Url"]="https://storage.example.test";
        values["Supabase:ServiceKey"]="";
        Assert.Contains("SUPABASE__SERVICEKEY",Assert.Throws<InvalidOperationException>(()=>Check(values)).Message);
        values["Supabase:Service_Key"]="synthetic-storage-key"; Check(values);
    }

    [Fact]
    public void Reserved_storage_without_an_enabled_provider_does_not_require_a_secret()
    {
        var values = Valid();
        values["Supabase:Url"] = "https://reserved.example.test";
        values["Supabase:Service_Key"] = "";
        values["BackgroundJobs:Enabled"] = "true";
        Check(values);
    }

    private sealed class TestEnvironment(string name):IHostEnvironment
    {
        public string EnvironmentName{get;set;}=name;
        public string ApplicationName{get;set;}="ConfigurationTests";
        public string ContentRootPath{get;set;}=Path.GetTempPath();
        public IFileProvider ContentRootFileProvider{get;set;}=new NullFileProvider();
    }
}
