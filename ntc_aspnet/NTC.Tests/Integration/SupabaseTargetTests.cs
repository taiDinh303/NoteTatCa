using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using NTC.API.Operations;
using NTC.Repositories.Context;

namespace NTC.Tests.Integration;

public sealed class SupabaseTargetTests
{
    [Theory]
    [InlineData("aws-0-ap-northeast-1.pooler.supabase.com", "VerifyFull", 5432, true)]
    [InlineData("127.0.0.1", "VerifyFull", 5432, false)]
    [InlineData("aws-0-ap-northeast-1.pooler.supabase.com", "Require", 5432, false)]
    [InlineData("aws-0-ap-northeast-1.pooler.supabase.com", "VerifyFull", 6543, false)]
    public void Operator_target_guard_accepts_only_the_configured_session_target_and_verified_tls(string host, string ssl, int port, bool valid)
    {
        // Model/connection-string validation only: never opens any database connection.
        var connection = new Npgsql.NpgsqlConnectionStringBuilder
        {
            Host=host, Port=port, Username="postgres.nxqupzwqawujtgeuvvcj", Database="postgres",
            Password="synthetic;quoted\"password!#", SslMode=Enum.Parse<Npgsql.SslMode>(ssl)
        };
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string,string?>
        {
            ["Supabase:ProjectRef"]="nxqupzwqawujtgeuvvcj",
            ["Supabase:SessionPoolerHost"]="aws-0-ap-northeast-1.pooler.supabase.com",
            ["ConnectionStrings:MyCnn"]=connection.ConnectionString
        }).Build();
        using var database = new PostgreSqlDatabaseContext(new DbContextOptionsBuilder<PostgreSqlDatabaseContext>().UseNpgsql(connection.ConnectionString).Options);
        if (valid) SupabaseSetup.ValidateTarget(config,database);
        else Assert.Throws<InvalidOperationException>(()=>SupabaseSetup.ValidateTarget(config,database));
        Assert.Equal("synthetic;quoted\"password!#",new Npgsql.NpgsqlConnectionStringBuilder(config.GetConnectionString("MyCnn")).Password);
    }
}
