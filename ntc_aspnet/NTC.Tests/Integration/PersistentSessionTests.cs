using Microsoft.Extensions.DependencyInjection;
using System.Net;
using System.Net.Http.Json;
using NTC.Tests.Infrastructure;
namespace NTC.Tests.Integration;
public sealed class PersistentSessionTests
{
    [Fact]
    public async Task Session_survives_years_without_extending_access_token_lifetime_and_still_detects_replay()
    {
        using var f = new ApiFactory(); await f.InitializeAsync();
        var (client, session) = await f.LoginAsync(); using var signedIn = client; using var publicClient = f.CreateClient();
        Assert.Equal(9999, session.GetProperty("refreshExpiresAt").GetDateTimeOffset().Year);
        var accessExpiry = session.GetProperty("expiredAt").GetDateTimeOffset();
        Assert.InRange(accessExpiry - f.Clock.GetUtcNow(), TimeSpan.FromMinutes(14), TimeSpan.FromMinutes(16));
        var token = session.GetProperty("refreshToken").GetString();
        f.Clock.Advance(TimeSpan.FromDays(3650));
        var next = await ApiFactory.Data(await publicClient.PostAsJsonAsync("/api/v1/auth/refresh", new { refreshToken = token }));
        Assert.Equal(9999, next.GetProperty("refreshExpiresAt").GetDateTimeOffset().Year);
        var replacement = next.GetProperty("refreshToken").GetString();
        Assert.NotEqual(token, replacement);
        Assert.Equal(HttpStatusCode.Unauthorized, (await publicClient.PostAsJsonAsync("/api/v1/auth/refresh", new { refreshToken = token })).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await publicClient.PostAsJsonAsync("/api/v1/auth/refresh", new { refreshToken = replacement })).StatusCode);
    }

    [Fact]
    public async Task Maintenance_prunes_old_rotations_without_deleting_the_active_persistent_session()
    {
        using var f = new ApiFactory(); await f.InitializeAsync();
        var (client, session) = await f.LoginAsync(); using var signedIn = client; using var publicClient = f.CreateClient();
        var next = await ApiFactory.Data(await publicClient.PostAsJsonAsync("/api/v1/auth/refresh", new { refreshToken = session.GetProperty("refreshToken").GetString() }));
        f.Clock.Advance(TimeSpan.FromDays(31));
        using var scope = f.Services.CreateScope();
        var job = Microsoft.Extensions.DependencyInjection.ServiceProviderServiceExtensions.GetRequiredService<NTC.Contract.Services.Interface.IBackgroundMaintenanceService>(scope.ServiceProvider);
        Assert.Equal(1, await job.PruneIdentityStateAsync());
        Assert.True((await publicClient.PostAsJsonAsync("/api/v1/auth/refresh", new { refreshToken = next.GetProperty("refreshToken").GetString() })).IsSuccessStatusCode);
    }
}
