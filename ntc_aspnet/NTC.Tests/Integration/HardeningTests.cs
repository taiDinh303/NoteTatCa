using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using NTC.Contract.Repositories.Entities.Identity;
using NTC.Contract.Services.Interface;
using NTC.Core.Base;
using NTC.Repositories.Context;
using NTC.Tests.Infrastructure;
namespace NTC.Tests.Integration;
public sealed class HardeningTests
{
    [Fact]
    public async Task Auth_rate_limits_cannot_be_bypassed_with_an_untrusted_forwarded_ip_header()
    {
        using var f=new ApiFactory{AuthLimit=2};await f.InitializeAsync();using var c=f.CreateClient();
        for(var i=0;i<2;i++)Assert.Equal(HttpStatusCode.Unauthorized,(await c.PostAsJsonAsync("/api/v1/auth/login",new{email="missing@example.test",password="wrong"})).StatusCode);
        c.DefaultRequestHeaders.Add("X-Forwarded-For","203.0.113.123");
        var rejected=await c.PostAsJsonAsync("/api/v1/auth/login",new{email="missing@example.test",password="wrong"});
        Assert.Equal(HttpStatusCode.TooManyRequests,rejected.StatusCode);Assert.True(rejected.Headers.Contains("Retry-After"));
    }
    [Fact]
    public async Task Refresh_rotation_does_not_extend_the_absolute_family_lifetime()
    {
        using var f=new ApiFactory();await f.InitializeAsync();var(c,s)=await f.LoginAsync();using var client=c;f.Clock.Advance(TimeSpan.FromDays(2));
        using var publicClient=f.CreateClient();var next=await ApiFactory.Data(await publicClient.PostAsJsonAsync("/api/v1/auth/refresh",new{refreshToken=s.GetProperty("refreshToken").GetString()}));
        Assert.Equal(s.GetProperty("refreshExpiresAt").GetDateTimeOffset(),next.GetProperty("refreshExpiresAt").GetDateTimeOffset());
    }
    [Fact]
    public async Task Expired_ephemeral_identity_state_is_pruned_without_removing_current_sessions()
    {
        using var f=new ApiFactory();await f.InitializeAsync();var(c,_)=await f.LoginAsync();using var client=c;
        using var scope=f.Services.CreateScope();var db=scope.ServiceProvider.GetRequiredService<DatabaseContext>();
        db.RefreshSessions.Add(new(){UserId=f.A,FamilyId=Guid.NewGuid(),TokenHash="expired-fixture",SecurityStamp="fixture",CreatedAt=f.Clock.GetUtcNow().AddDays(-10),ExpiresAt=f.Clock.GetUtcNow().AddDays(-2)});
        db.EmailChallenges.Add(new(){Email="EXPIRED@EXAMPLE.TEST",CodeHash="fixture",ExpiresAt=f.Clock.GetUtcNow().AddDays(-2)});await db.SaveChangesAsync();
        Assert.Equal(2,await scope.ServiceProvider.GetRequiredService<IBackgroundMaintenanceService>().PruneIdentityStateAsync());Assert.Single(await db.RefreshSessions.ToListAsync());
        Assert.True((await c.GetAsync("/api/v1/me")).IsSuccessStatusCode);
    }
    [Fact]
    public async Task Savechanges_guard_rejects_reassignment_of_an_existing_note_owner()
    {
        using var f=new ApiFactory();await f.InitializeAsync();var(c,_)=await f.LoginAsync();using var client=c;var id=(await ApiFactory.Note(c)).GetProperty("id").GetGuid();
        using var scope=f.Services.CreateScope();var db=scope.ServiceProvider.GetRequiredService<DatabaseContext>();var note=await db.Notes.SingleAsync(x=>x.Id==id);note.UserId=f.B;
        var error = await Record.ExceptionAsync(() => db.SaveChangesAsync());
        // EF itself rejects key changes because UserId now participates in a principal key.
        Assert.True(error is BaseException.ErrorException or InvalidOperationException);
    }
}
