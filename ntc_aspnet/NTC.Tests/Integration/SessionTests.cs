using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.DependencyInjection;
using NTC.Contract.Services.Interface;
using NTC.Tests.Infrastructure;
namespace NTC.Tests.Integration;
public sealed class SessionTests
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Password_reset_accepts_both_legacy_raw_and_email_link_encoded_identity_tokens(bool outerEncoded)
    {
        using var f=new ApiFactory();await f.InitializeAsync();string token;
        using(var scope=f.Services.CreateScope())
        {
            var users=scope.ServiceProvider.GetRequiredService<Microsoft.AspNetCore.Identity.UserManager<NTC.Contract.Repositories.Entities.ApplicationUser>>();
            var user=await users.FindByIdAsync(f.A.ToString());token=await users.GeneratePasswordResetTokenAsync(user!);
        }
        if(outerEncoded)token=Microsoft.AspNetCore.WebUtilities.WebEncoders.Base64UrlEncode(System.Text.Encoding.UTF8.GetBytes(token));
        using var c=f.CreateClient();Assert.True((await c.PostAsJsonAsync("/api/v1/auth/reset-password",new{userId=f.A,token,newPassword="Reset-synthetic-password-123!"})).IsSuccessStatusCode);
        Assert.True((await c.PostAsJsonAsync("/api/v1/auth/login",new{email="a@example.test",password="Reset-synthetic-password-123!"})).IsSuccessStatusCode);
        Assert.False((await c.PostAsJsonAsync("/api/v1/auth/reset-password",new{userId=f.A,token,newPassword="Another-synthetic-password-123!"})).IsSuccessStatusCode);
    }
    [Fact]
    public async Task Refresh_rotates_and_reuse_revokes_the_replacement_session()
    {
        using var f=new ApiFactory();await f.InitializeAsync();var(c,session)=await f.LoginAsync();using var client=c;using var publicClient=f.CreateClient();
        var old=session.GetProperty("refreshToken").GetString();
        var next=await ApiFactory.Data(await publicClient.PostAsJsonAsync("/api/v1/auth/refresh",new{refreshToken=old}));
        Assert.NotEqual(old,next.GetProperty("refreshToken").GetString());
        Assert.Equal(HttpStatusCode.Unauthorized,(await c.GetAsync("/api/v1/notes")).StatusCode);
        c.DefaultRequestHeaders.Authorization=new("Bearer",next.GetProperty("token").GetString());Assert.True((await c.GetAsync("/api/v1/notes")).IsSuccessStatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized,(await publicClient.PostAsJsonAsync("/api/v1/auth/refresh",new{refreshToken=old})).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized,(await c.GetAsync("/api/v1/notes")).StatusCode);
    }
    [Fact]
    public async Task Logout_and_revoke_all_invalidate_current_access_tokens()
    {
        using var f=new ApiFactory();await f.InitializeAsync();var(c,s)=await f.LoginAsync();using var client=c;
        Assert.True((await c.PostAsJsonAsync("/api/v1/auth/logout",new{refreshToken=s.GetProperty("refreshToken").GetString()})).IsSuccessStatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized,(await c.GetAsync("/api/v1/me")).StatusCode);
        var(d,_)=await f.LoginAsync();using var second=d;Assert.True((await d.PostAsync("/api/v1/auth/revoke-all",null)).IsSuccessStatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized,(await d.GetAsync("/api/v1/me")).StatusCode);
    }
    [Fact]
    public async Task Registration_consumes_a_verified_otp_and_email_login_works()
    {
        using var f=new ApiFactory();await f.InitializeAsync();using var c=f.CreateClient();const string email="new@example.test";
        Assert.True((await c.PostAsJsonAsync("/api/v1/auth/email-code",new{email})).IsSuccessStatusCode);
        var code=Regex.Match(f.Email.Messages.Last().Body,@"\b[0-9]{6}\b").Value;Assert.Equal(6,code.Length);
        var body=new{email,password=ApiFactory.Password,confirmPassword=ApiFactory.Password,confirmationCode=code};
        Assert.True((await c.PostAsJsonAsync("/api/v1/auth/register",body)).IsSuccessStatusCode);
        var session=await ApiFactory.Data(await c.PostAsJsonAsync("/api/v1/auth/login",new{email,password=ApiFactory.Password}));Assert.NotEmpty(session.GetProperty("token").GetString()!);
        Assert.False((await c.PostAsJsonAsync("/api/v1/auth/register",body)).IsSuccessStatusCode);
    }
    [Fact]
    public async Task Otp_attempt_limits_expiration_and_resend_throttle_are_persistent()
    {
        using var f=new ApiFactory();await f.InitializeAsync();using var scope=f.Services.CreateScope();var otp=scope.ServiceProvider.GetRequiredService<IOtpService>();
        await otp.StoreAsync("otp@example.test","123456",f.Clock.GetUtcNow().AddMinutes(10).UtcDateTime);
        await Assert.ThrowsAsync<NTC.Core.Base.BaseException.ErrorException>(()=>otp.StoreAsync("otp@example.test","111111",f.Clock.GetUtcNow().AddMinutes(10).UtcDateTime));
        for(var i=0;i<5;i++)Assert.False(await otp.ValidateAsync("otp@example.test","999999"));
        Assert.False(await otp.ValidateAsync("otp@example.test","123456"));f.Clock.Advance(TimeSpan.FromMinutes(11));
        Assert.False(await otp.ValidateAsync("otp@example.test","123456"));
    }
    [Fact]
    public async Task Google_cannot_automatically_claim_an_existing_email_and_requires_proof_for_linking()
    {
        using var f=new ApiFactory();await f.InitializeAsync();using var publicClient=f.CreateClient();
        Assert.Equal(HttpStatusCode.Conflict,(await publicClient.PostAsJsonAsync("/api/v1/auth/google",new{idToken="verified|a@example.test|subject-a"})).StatusCode);
        var(a,_)=await f.LoginAsync();using var ca=a;
        Assert.Equal(HttpStatusCode.Unauthorized,(await a.PostAsync($"/api/userlogin/connect?userId={f.A}&provider=Google&providerKey=raw-subject",null)).StatusCode);
        Assert.True((await a.PostAsJsonAsync("/api/v1/me/google-link",new{idToken="verified|a@example.test|subject-a"})).IsSuccessStatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized,(await a.GetAsync("/api/v1/me")).StatusCode);
        Assert.True((await publicClient.PostAsJsonAsync("/api/v1/auth/google",new{idToken="verified|a@example.test|subject-a"})).IsSuccessStatusCode);
    }
    [Fact]
    public async Task Password_change_invalidates_all_existing_sessions_and_recovery_does_not_enumerate_accounts()
    {
        using var f=new ApiFactory();await f.InitializeAsync();var(a,_)=await f.LoginAsync();using var ca=a;
        Assert.True((await a.PostAsJsonAsync("/api/v1/me/change-password",new{currentPassword=ApiFactory.Password,newPassword="Different-synthetic-pass-123!"})).IsSuccessStatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized,(await a.GetAsync("/api/v1/notes")).StatusCode);
        using var c=f.CreateClient();var exists=await c.PostAsJsonAsync("/api/v1/auth/forgot-password",new{email="a@example.test"});
        var missing=await c.PostAsJsonAsync("/api/v1/auth/forgot-password",new{email="missing@example.test"});
        Assert.Equal(exists.StatusCode,missing.StatusCode);
        Assert.Equal((await ApiFactory.Data(exists)).GetString(),(await ApiFactory.Data(missing)).GetString());
    }
    [Fact]
    public async Task Multiple_failed_passwords_lock_out_the_account()
    {
        using var f=new ApiFactory();await f.InitializeAsync();using var c=f.CreateClient();
        for(var i=0;i<5;i++)Assert.Equal(HttpStatusCode.Unauthorized,(await c.PostAsJsonAsync("/api/v1/auth/login",new{email="a@example.test",password="wrong"})).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden,(await c.PostAsJsonAsync("/api/v1/auth/login",new{email="a@example.test",password=ApiFactory.Password})).StatusCode);
    }
}
