using System.Net.Http.Json;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using NTC.Contract.Repositories.Entities;
using NTC.Repositories.Context;
using NTC.Tests.Infrastructure;

namespace NTC.FrontendFixture;

// Loopback-only browser-test bridge to the existing synthetic API fixture.
// Uses no owner database connection, real SMTP sender or external Google call.
public static class FixtureProgram
{
    public static async Task Main(string[] args)
    {
        var root = new DirectoryInfo(AppContext.BaseDirectory);
        while (root is not null && !Directory.Exists(Path.Combine(root.FullName, "ntc_aspnet", "NTC.API"))) root = root.Parent;
        if (root is null) throw new InvalidOperationException("Repository root was not found.");
        Environment.SetEnvironmentVariable("ASPNETCORE_TEST_CONTENTROOT_NTC_API", Path.Combine(root.FullName, "ntc_aspnet", "NTC.API"));
        using var factory = new ApiFactory();
        await factory.InitializeAsync();
        await SeedAsync(factory);
        using var client = factory.CreateClient();
        // ApiFactory owns a single in-memory SQLite connection. Serialize access in
        // this test bridge only; production SQL Server/PostgreSQL use pooled connections.
        using var databaseGate = new SemaphoreSlim(1, 1);
        var builder = WebApplication.CreateBuilder(new WebApplicationOptions { Args = args, EnvironmentName = "Testing" });
        builder.WebHost.UseUrls("http://127.0.0.1:5199");
        builder.Logging.ClearProviders();
        var app = builder.Build();
        app.MapGet("/__fixture/health", () => Results.Ok(new { status = "synthetic fixture ready" }));
        app.MapGet("/__fixture/mail", (string email) => Results.Json(factory.Email.Messages.Where(x => x.To == email).ToArray()));
        app.MapPost("/__fixture/reset", async () =>
        {
            await databaseGate.WaitAsync();
            try
            {
                using (var scope = factory.Services.CreateScope())
                    await scope.ServiceProvider.GetRequiredService<DatabaseContext>().Database.EnsureDeletedAsync();
                factory.Email.Messages.Clear(); factory.Email.Fail = false; factory.Email.Timeout = false;
                factory.Clock.Advance(DateTimeOffset.UtcNow - factory.Clock.GetUtcNow());
                await factory.InitializeAsync(); await SeedAsync(factory);
                return Results.Ok(new { ready = true });
            }
            finally { databaseGate.Release(); }
        });
        app.MapPost("/__fixture/seed-notes", async (int count) =>
        {
            if (count is < 1 or > 5000) return Results.BadRequest();
            await databaseGate.WaitAsync();
            try
            {
                using var scope = factory.Services.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<DatabaseContext>();
                var start = await db.Notes.CountAsync(x => x.UserId == factory.A);
                for (var i = 0; i < count; i++)
                    db.Notes.Add(new Note
                    {
                        UserId = factory.A, Title = $"Synthetic scale note {start + i + 1}",
                        Content = $"Measurement data {i}. " + new string('x', 400),
                        SortOrder = start + i + 1,
                        BackgroundColor = i % 5 == 0 ? "#fff4d4" : null
                    });
                await db.SaveChangesAsync();
                return Results.Ok(new { count });
            }
            finally { databaseGate.Release(); }
        });
        app.MapPost("/__fixture/dispatch", async () =>
        {
            await databaseGate.WaitAsync();
            try
            {
                using var scope = factory.Services.CreateScope();
                var job = scope.ServiceProvider.GetRequiredService<NTC.Contract.Services.Interface.IBackgroundMaintenanceService>();
                return Results.Ok(new { count = await job.DispatchRemindersAsync() });
            }
            finally { databaseGate.Release(); }
        });
        app.MapPost("/__fixture/advance", (int minutes) => { factory.Clock.Advance(TimeSpan.FromMinutes(minutes)); return Results.Ok(); });
        app.MapFallback(async context =>
        {
            if (!context.Request.Path.StartsWithSegments("/api") && !context.Request.Path.StartsWithSegments("/health")) { context.Response.StatusCode = 404; return; }
            await databaseGate.WaitAsync(context.RequestAborted);
            try
            {
                using var message = new HttpRequestMessage(new HttpMethod(context.Request.Method), context.Request.Path + context.Request.QueryString);
                if (context.Request.ContentLength > 0 || context.Request.Headers.ContainsKey("Transfer-Encoding"))
                {
                    using var reader = new StreamReader(context.Request.Body, Encoding.UTF8);
                    message.Content = new StringContent(await reader.ReadToEndAsync(), Encoding.UTF8, "application/json");
                }
                foreach (var header in context.Request.Headers)
                    if (header.Key is not ("Host" or "Content-Length" or "Content-Type" or "Connection"))
                        message.Headers.TryAddWithoutValidation(header.Key, header.Value.ToArray());
                using var response = await client.SendAsync(message, context.RequestAborted);
                context.Response.StatusCode = (int)response.StatusCode;
                context.Response.ContentType = response.Content.Headers.ContentType?.ToString() ?? "application/json";
                foreach (var header in response.Headers)
                    if (header.Key is not ("Transfer-Encoding" or "Connection")) context.Response.Headers[header.Key] = header.Value.ToArray();
                await response.Content.CopyToAsync(context.Response.Body, context.RequestAborted);
            }
            finally { databaseGate.Release(); }
        });
        Console.WriteLine("Synthetic NoteTatCa browser fixture: http://127.0.0.1:5199");
        await app.RunAsync();
    }
    private static async Task SeedAsync(ApiFactory factory)
    {
        // Exercise historical mixed-role accounts without touching a live database.
        using (var scope = factory.Services.CreateScope())
        {
            var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var administrator = await users.FindByIdAsync(factory.Admin.ToString());
            if (!(await users.AddToRoleAsync(administrator!, "User")).Succeeded)
                throw new InvalidOperationException("Synthetic administrator setup failed.");
        }
        var (client, _) = await factory.LoginAsync(); using var authenticated = client;
        var labels = new List<Guid>();
        foreach (var label in new[] { ("Personal", "#8eaa95"), ("Ideas", "#be9bd2"), ("Work", "#8eabc1") })
            labels.Add((await ApiFactory.Data(await client.PostAsJsonAsync("/api/v1/tags", new { name = label.Item1, color = label.Item2 }))).GetProperty("id").GetGuid());
        var examples = new[]
        {
            ("Little things, lately", "More morning walks.\nLess reaching for my phone.\nA good book on the bedside table.\nMaking time for the things that feel like me.", "🌿", "#e7efdf", true, 0),
            ("An idea worth exploring", "What if the best ideas aren’t the loudest ones?\n\nA quiet place for thoughts before they’re ready for the world.\nStart small. Make it meaningful.", "💡", "#fff4d4", true, 1),
            ("For the weekend", "Find a new coffee place\nVisit the little bookshop\nTake the long way home\nLeave a little room for nothing", "☕", "", false, 0),
            ("Project notes", "Keep it simple.\nMake the important things easy to find.\nCreate a little breathing room.\n\nSmall details make a big difference.", "💻", "#deedf8", false, 2),
            ("Places to go someday", "Kyoto in the autumn.\nA cabin with a view of the mountains.\nThat quiet stretch of coast I keep thinking about.", "✈️", "", false, 1),
            ("A little reminder", "You don’t have to have it all figured out.\nJust take the next small step.\n\nGood things take a little time.", "✨", "#e8e4fc", false, 0)
        };
        foreach (var item in examples)
            await ApiFactory.Data(await client.PostAsJsonAsync("/api/v1/notes", new { title = item.Item1, content = item.Item2, iconEmoji = item.Item3, backgroundColor = item.Item4, isPinned = item.Item5, tagIds = new[] { labels[item.Item6] } }));
    }
}
