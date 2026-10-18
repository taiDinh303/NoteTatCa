namespace NTC.Tests.Infrastructure;
public sealed class LocalDbFactAttribute : FactAttribute
{
    public LocalDbFactAttribute()
    { if (!OperatingSystem.IsWindows()) Skip="SQL Server LocalDB requires Windows; exercised locally separately from PostgreSQL CI."; }
}
public sealed class PostgresFactAttribute : FactAttribute
{
    public PostgresFactAttribute()
    { if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("NTC_TEST_POSTGRES"))) Skip="Set NTC_TEST_POSTGRES to the isolated loopback PostgreSQL fixture; never uses appsettings."; }
}
