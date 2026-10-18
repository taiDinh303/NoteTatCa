using Npgsql;
using NTC.API.Configuration;

namespace NTC.Tests.Integration;

public sealed class PostgresConnectionTests
{
    [Theory]
    [InlineData("require", SslMode.Require)]
    [InlineData("verify-full", SslMode.VerifyFull)]
    [InlineData("verify-ca", SslMode.VerifyCA)]
    public void Accepts_standard_Postgres_uri_tls_options_and_encoded_passwords(string mode, SslMode expected)
    {
        var uri = $"postgresql://postgres.sampleproject:synthetic%40p%3Ba%23ss%3Aword@pooler.example.test:5432/postgres?sslmode={mode}";
        var result = new NpgsqlConnectionStringBuilder(DatabaseConfiguration.NormalizePostgres(uri));
        Assert.Equal(expected, result.SslMode);
        Assert.Equal("synthetic@p;a#ss:word", result.Password);
        Assert.Equal("postgres.sampleproject", result.Username);
    }
    [Fact]
    public void Invalid_tls_option_is_rejected_without_echoing_the_connection_secret()
    {
        var error = Assert.Throws<InvalidOperationException>(() => DatabaseConfiguration.NormalizePostgres(
            "postgresql://postgres:synthetic-secret@db.example.test/postgres?sslmode=999"));
        Assert.DoesNotContain("synthetic-secret", error.Message);
    }
}
