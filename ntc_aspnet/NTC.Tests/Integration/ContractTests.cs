using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Collections.Concurrent;
using NTC.Repositories.Context;
using NTC.Tests.Infrastructure;
namespace NTC.Tests.Integration;
public sealed class ContractTests
{
    [Fact]
    public async Task Request_logs_do_not_include_recovery_tokens_even_with_framework_information_enabled()
    {
        using var f = new ApiFactory();
        await f.InitializeAsync();
        var logs = new CapturedLogs();
        using var host = f.WithWebHostBuilder(builder =>
        {
            builder.ConfigureAppConfiguration((_, config) => config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Logging:LogLevel:Default"] = "Information",
                ["Logging:LogLevel:Microsoft.AspNetCore"] = "Information"
            }));
            builder.ConfigureLogging(logging => logging.AddProvider(logs));
        });
        using var client = host.CreateClient();
        const string proof = "synthetic-proof-that-must-never-appear-in-request-logs";
        await client.GetAsync($"/api/v1/auth/confirm-email-change?userId={Guid.NewGuid()}&token={proof}&newEmail=fixture%40example.test");
        Assert.Contains(logs.Messages, message => message.StartsWith("HTTP ", StringComparison.Ordinal));
        Assert.DoesNotContain(logs.Messages, message => message.Contains(proof, StringComparison.Ordinal));
    }

    private sealed class CapturedLogs : ILoggerProvider
    {
        public ConcurrentQueue<string> Messages { get; } = new();
        public ILogger CreateLogger(string categoryName) => new CapturedLogger(Messages);
        public void Dispose() { }
        private sealed class CapturedLogger(ConcurrentQueue<string> messages) : ILogger
        {
            public IDisposable? BeginScope<TState>(TState state) where TState : notnull => null;
            public bool IsEnabled(LogLevel logLevel) => true;
            public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
                => messages.Enqueue(formatter(state, exception));
        }
    }

    [Fact]
    public async Task Health_swagger_correlation_errors_and_cors_are_consistent()
    {
        using var f=new ApiFactory();await f.InitializeAsync();using var c=f.CreateClient();
        Assert.True((await c.GetAsync("/health/live")).IsSuccessStatusCode);Assert.True((await c.GetAsync("/health/ready")).IsSuccessStatusCode);
        c.DefaultRequestHeaders.Add("X-Correlation-ID","regression-123");var response=await c.GetAsync("/api/v1/notes");
        Assert.Equal("regression-123",response.Headers.GetValues("X-Correlation-ID").Single());Assert.Equal("no-store",response.Headers.CacheControl!.ToString());
        var error=JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;Assert.Equal("regression-123",error.GetProperty("traceId").GetString());
        var swagger=await c.GetAsync("/swagger/v1/swagger.json");Assert.True(swagger.IsSuccessStatusCode);
        var spec=await swagger.Content.ReadAsStringAsync();Assert.Contains("/api/v1/notes",spec);Assert.Contains("/api/Note/get-all",spec);
        var artifact=Environment.GetEnvironmentVariable("NTC_ARTIFACT_DIR");
        if(!string.IsNullOrWhiteSpace(artifact)){Directory.CreateDirectory(artifact);await File.WriteAllTextAsync(Path.Combine(artifact,"openapi.json"),spec);}
        using var preflight=new HttpRequestMessage(HttpMethod.Options,"/api/v1/notes");preflight.Headers.Add("Origin","https://client.example.test");preflight.Headers.Add("Access-Control-Request-Method","POST");
        Assert.Equal("https://client.example.test",(await c.SendAsync(preflight)).Headers.GetValues("Access-Control-Allow-Origin").Single());
    }
    [Fact]
    public async Task Patch_preserves_omitted_fields_and_explicit_conversion_is_required_for_rich_content()
    {
        using var f=new ApiFactory();await f.InitializeAsync();var(c,_)=await f.LoginAsync();using var client=c;
        var note=await ApiFactory.Data(await c.PostAsJsonAsync("/api/v1/notes",new{title="Keep title",content="text",isPinned=true,backgroundColor="#abcdef"}));var id=note.GetProperty("id").GetGuid();
        var edited=await ApiFactory.Data(await c.PatchAsJsonAsync($"/api/v1/notes/{id}",new{content="changed",version=note.GetProperty("version").GetGuid()}));
        Assert.Equal("Keep title",edited.GetProperty("title").GetString());Assert.True(edited.GetProperty("isPinned").GetBoolean());Assert.Equal("#abcdef",edited.GetProperty("backgroundColor").GetString());
        var rich=await ApiFactory.Data(await c.PatchAsJsonAsync($"/api/v1/notes/{id}",new{documentJson="{\"type\":\"doc\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Rich\"}]}]}",version=edited.GetProperty("version").GetGuid()}));
        Assert.Equal(HttpStatusCode.BadRequest,(await c.PatchAsJsonAsync($"/api/v1/notes/{id}",new{content="flat",version=rich.GetProperty("version").GetGuid()})).StatusCode);
        var flat=await ApiFactory.Data(await c.PatchAsJsonAsync($"/api/v1/notes/{id}",new{convertToPlainText=true,content="flat",version=rich.GetProperty("version").GetGuid()}));Assert.Equal("flat",flat.GetProperty("content").GetString());
        Assert.Equal(JsonValueKind.Null,flat.GetProperty("documentJson").ValueKind);
    }
    [Fact]
    public async Task Adding_a_label_changes_the_note_version_and_prevents_stale_autosave_from_dropping_it()
    {
        using var f=new ApiFactory();await f.InitializeAsync();var(c,_)=await f.LoginAsync();using var client=c;
        var note=await ApiFactory.Note(c);var id=note.GetProperty("id").GetGuid();var label=await ApiFactory.Data(await c.PostAsJsonAsync("/api/v1/tags",new{name="Label"}));
        Assert.True((await c.PutAsync($"/api/v1/notes/{id}/tags/{label.GetProperty("id").GetGuid()}",null)).IsSuccessStatusCode);
        Assert.Equal(HttpStatusCode.Conflict,(await c.PatchAsJsonAsync($"/api/v1/notes/{id}",new{content="stale",tagIds=Array.Empty<Guid>(),version=note.GetProperty("version").GetGuid()})).StatusCode);
    }
    [Fact]
    public async Task An_unconfirmed_existing_account_can_confirm_its_mailbox_without_recreating_the_account()
    {
        using var f=new ApiFactory();await f.InitializeAsync();using(var scope=f.Services.CreateScope()){var db=scope.ServiceProvider.GetRequiredService<DatabaseContext>();(await db.Users.SingleAsync(x=>x.Id==f.A)).EmailConfirmed=false;await db.SaveChangesAsync();}
        using var c=f.CreateClient();Assert.True((await c.PostAsJsonAsync("/api/v1/auth/email-code",new{email="a@example.test"})).IsSuccessStatusCode);
        var code=System.Text.RegularExpressions.Regex.Match(f.Email.Messages.Last().Body,@"\b[0-9]{6}\b").Value;
        Assert.True((await c.PostAsJsonAsync("/api/v1/auth/verify-email",new{email="a@example.test",code})).IsSuccessStatusCode);
        Assert.True((await c.PostAsJsonAsync("/api/v1/auth/login",new{email="a@example.test",password=ApiFactory.Password})).IsSuccessStatusCode);
    }
    [Fact]
    public async Task Label_and_reminder_limits_are_enforced_without_cross_owner_side_effects()
    {
        using var f=new ApiFactory();await f.InitializeAsync();var(c,_)=await f.LoginAsync();using var client=c;
        var note=await ApiFactory.Note(c);var id=note.GetProperty("id").GetGuid();
        for(var i=0;i<5;i++)Assert.True((await c.PostAsJsonAsync($"/api/v1/notes/{id}/reminders",new{reminderAt=f.Clock.GetUtcNow().AddHours(i+1)})).IsSuccessStatusCode);
        Assert.Equal(HttpStatusCode.BadRequest,(await c.PostAsJsonAsync($"/api/v1/notes/{id}/reminders",new{reminderAt=f.Clock.GetUtcNow().AddHours(7)})).StatusCode);
        var ids=new List<Guid>();for(var i=0;i<21;i++)ids.Add((await ApiFactory.Data(await c.PostAsJsonAsync("/api/v1/tags",new{name="Duplicate"}))).GetProperty("id").GetGuid());
        Assert.Equal(HttpStatusCode.BadRequest,(await c.PatchAsJsonAsync($"/api/v1/notes/{id}",new{tagIds=ids,version=note.GetProperty("version").GetGuid()})).StatusCode);
    }
}
