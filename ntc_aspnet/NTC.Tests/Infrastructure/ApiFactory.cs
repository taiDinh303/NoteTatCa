using System.Collections.Concurrent;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using NTC.Contract.Repositories.Entities;
using NTC.Contract.Services.Interface;
using NTC.Core.Base;
using NTC.Repositories.Context;

namespace NTC.Tests.Infrastructure;

public sealed class TestClock : TimeProvider
{
    private long _ticks = DateTimeOffset.UtcNow.UtcTicks;
    public override DateTimeOffset GetUtcNow() => new(Interlocked.Read(ref _ticks), TimeSpan.Zero);
    public void Advance(TimeSpan time) => Interlocked.Add(ref _ticks, time.Ticks);
}
public sealed record CapturedEmail(string To, string Subject, string Body);
public sealed class TestEmailSender : IEmailSender
{
    public ConcurrentQueue<CapturedEmail> Messages { get; } = new();
    public bool Fail { get; set; }
    public bool Timeout { get; set; }
    public Task SendEmailAsync(string to, string subject, string htmlBody)
    {
        if (Timeout) throw new OperationCanceledException("Synthetic SMTP timeout.");
        if (Fail) throw new InvalidOperationException("Synthetic email failure.");
        Messages.Enqueue(new(to, subject, htmlBody)); return Task.CompletedTask;
    }
}
public sealed class TestGoogleValidator : IGoogleIdentityValidator
{
    public Task<GoogleIdentity> ValidateAsync(string token)
    {
        var parts = token.Split('|');
        if (parts.Length != 3 || parts[0] != "verified") throw DomainErrors.Unauthorized();
        return Task.FromResult(new GoogleIdentity(parts[2], parts[1], "Google User", null, null));
    }
}
public sealed class ApiFactory : WebApplicationFactory<Program>
{
    public const string Password = "Synthetic-password-123!";
    private readonly SqliteConnection _connection = new("Data Source=:memory:");
    public TestClock Clock { get; } = new();
    public TestEmailSender Email { get; } = new();
    public int AuthLimit { get; set; } = 1000;
    public Action<IServiceCollection>? ConfigureExtra { get; set; }
    public Guid A { get; private set; }
    public Guid B { get; private set; }
    public Guid Admin { get; private set; }
    public ApiFactory() => _connection.Open();
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureAppConfiguration((_, c) => c.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Jwtsettings:Key"] = "synthetic-tests-signing-key-with-at-least-32-bytes",
            ["Jwtsettings:Issuer"] = "ntc-test", ["Jwtsettings:Audience"] = "ntc-test",
            ["Jwtsettings:ExpirationMinutes"] = "15", ["AppSettings:ClientUrl"] = "https://client.example.test",
            ["BackgroundJobs:Enabled"] = "false", ["RateLimiting:AuthRequestsPerMinute"] = AuthLimit.ToString(System.Globalization.CultureInfo.InvariantCulture),
            ["Authentication:Google:Enabled"] = "false", ["Cors:AllowedOrigins:0"] = "https://client.example.test"
        }));
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DatabaseContext>(); services.RemoveAll<DbContextOptions<DatabaseContext>>();
            services.AddDbContext<DatabaseContext>(o => o.UseSqlite(_connection));
            services.RemoveAll<TimeProvider>(); services.AddSingleton<TimeProvider>(Clock);
            services.RemoveAll<IEmailSender>(); services.AddSingleton<IEmailSender>(Email);
            services.RemoveAll<IGoogleIdentityValidator>(); services.AddSingleton<IGoogleIdentityValidator, TestGoogleValidator>();
            services.AddDataProtection().UseEphemeralDataProtectionProvider();
            foreach (var descriptor in services.Where(x => x.ServiceType == typeof(Microsoft.Extensions.Hosting.IHostedService)
                && x.ImplementationType == typeof(NTC.API.Jobs.MaintenanceWorker)).ToArray()) services.Remove(descriptor);
            ConfigureExtra?.Invoke(services);
        });
    }
    public async Task InitializeAsync()
    {
        using var scope = Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<DatabaseContext>(); await db.Database.EnsureCreatedAsync();
        var roles = scope.ServiceProvider.GetRequiredService<RoleManager<ApplicationRole>>();
        foreach (var role in new[] { "User", "Admin" }) Assert.True((await roles.CreateAsync(new() { Name = role })).Succeeded);
        var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        foreach (var item in new[] { ("a@example.test", "User"), ("b@example.test", "User"), ("admin@example.test", "Admin") })
        {
            var user = new ApplicationUser { Id = Guid.NewGuid(), UserName = item.Item1, Email = item.Item1, EmailConfirmed = true };
            Assert.True((await users.CreateAsync(user, Password)).Succeeded); Assert.True((await users.AddToRoleAsync(user, item.Item2)).Succeeded);
            db.UserInfos.Add(new() { Id = user.Id, GivenName = "Test" });
            if (item.Item1.StartsWith("a@")) A = user.Id; else if (item.Item1.StartsWith("b@")) B = user.Id; else Admin = user.Id;
        }
        await db.SaveChangesAsync();
    }
    public async Task<(HttpClient Client, JsonElement Session)> LoginAsync(string email = "a@example.test")
    {
        var client = CreateClient();
        var response = await client.PostAsJsonAsync("/api/v1/auth/login", new { email, password = Password });
        var data = await Data(response); client.DefaultRequestHeaders.Authorization = new("Bearer", data.GetProperty("token").GetString());
        return (client, data);
    }
    public static async Task<JsonElement> Data(HttpResponseMessage response)
    {
        var text = await response.Content.ReadAsStringAsync(); Assert.True(response.IsSuccessStatusCode, $"HTTP {(int)response.StatusCode}: {text}");
        using var doc = JsonDocument.Parse(text); return doc.RootElement.GetProperty("data").Clone();
    }
    public static async Task<JsonElement> Note(HttpClient client, string content = "Private synthetic note", string? title = "Test") =>
        await Data(await client.PostAsJsonAsync("/api/v1/notes", new { title, content }));
    protected override void Dispose(bool disposing) { base.Dispose(disposing); if (disposing) _connection.Dispose(); }
}
