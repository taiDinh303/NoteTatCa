using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.DataProtection;
using NTC.API;
using NTC.API.Middleware;
using NTC.Contract.Repositories.Entities;
using NTC.Repositories.Context;
using Microsoft.EntityFrameworkCore;
using NTC.Contract.Repositories.Entities.Identity;

var builder = WebApplication.CreateBuilder(args);
NTC.API.Configuration.StartupConfiguration.Validate(builder.Configuration, builder.Environment,
    NTC.API.Configuration.DatabaseConfiguration.NormalizePostgres);
// The framework's informational request logs include the raw query string.
// Recovery links contain proof tokens; our telemetry logs only endpoint metadata.
builder.Logging.AddFilter("Microsoft.AspNetCore.Hosting.Diagnostics", LogLevel.Warning);
builder.Services.AddConfig(builder.Configuration);
var keysDirectory = builder.Configuration["DataProtection:KeysDirectory"];
if (!string.IsNullOrWhiteSpace(keysDirectory))
    builder.Services.AddDataProtection().SetApplicationName("NoteTatCa").PersistKeysToFileSystem(new DirectoryInfo(keysDirectory));
builder.WebHost.ConfigureKestrel(options => options.Limits.MaxRequestBodySize = 8 * 1024 * 1024);
var app = builder.Build();
NTC.API.Configuration.StartupConfiguration.ReportWarnings(app.Configuration, app.Environment, app.Logger);
app.Services.GetService<Microsoft.Extensions.Options.IStartupValidator>()?.Validate();
if (args.Contains("--check-config", StringComparer.Ordinal))
{
    Console.WriteLine("CONFIGURATION_OK: configuration validated; no database, migration, seed or email operation was performed.");
    return;
}
var supabaseOperation = args.Contains("--check-supabase", StringComparer.Ordinal)
    || args.Contains("--initialize-supabase", StringComparer.Ordinal);
if (supabaseOperation || args.Contains("--seed-test-accounts", StringComparer.Ordinal))
{
    using var scope = app.Services.CreateScope();
    var database = scope.ServiceProvider.GetRequiredService<DatabaseContext>();
    NTC.API.Operations.SupabaseSetup.ValidateTarget(builder.Configuration, database);
    if (args.Contains("--initialize-supabase", StringComparer.Ordinal))
        await NTC.API.Operations.SupabaseSetup.InitializeAsync(database);
    if (supabaseOperation) await NTC.API.Operations.SupabaseSetup.CheckAsync(database);
    if (args.Contains("--seed-test-accounts", StringComparer.Ordinal))
    {
        if ((await database.Database.GetPendingMigrationsAsync()).Any())
            throw new InvalidOperationException("Initialize the schema before provisioning test accounts.");
        var count = await scope.ServiceProvider.GetRequiredService<NTC.API.Operations.DemoAccountSeeder>().SeedAsync();
        Console.WriteLine($"Demo accounts created: {count}; total configured accounts:5. No passwords were logged.");
    }
    return;
}
if (args.Contains("--bootstrap-roles", StringComparer.Ordinal))
{
    using var scope = app.Services.CreateScope();
    var manager = scope.ServiceProvider.GetRequiredService<RoleManager<ApplicationRole>>();
    foreach (var name in new[] { "User", "Admin" })
        if (!await manager.RoleExistsAsync(name))
        {
            var result = await manager.CreateAsync(new() { Name = name });
            if (!result.Succeeded) throw new InvalidOperationException("Role initialization failed.");
        }
    return;
}
if (args.Contains("--grant-admin", StringComparer.Ordinal))
{
    using var scope = app.Services.CreateScope();
    var email = builder.Configuration["Bootstrap:AdminEmail"];
    if (string.IsNullOrWhiteSpace(email)) throw new InvalidOperationException("Set Bootstrap__AdminEmail for this explicit operation.");
    var manager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
    var database = scope.ServiceProvider.GetRequiredService<DatabaseContext>();
    await using var transaction = await database.Database.BeginTransactionAsync();
    var user = await manager.FindByEmailAsync(email) ?? throw new InvalidOperationException("Register and verify the account first.");
    if (!user.EmailConfirmed || user.IsLocked || user.DeletedTime != null) throw new InvalidOperationException("A verified active account is required.");
    if (await manager.IsInRoleAsync(user, "Admin")) return;
    NTC.Services.Security.SessionSecurity.RequireSuccess(await manager.AddToRoleAsync(user, "Admin"));
    NTC.Services.Security.SessionSecurity.RequireSuccess(await manager.UpdateSecurityStampAsync(user));
    database.AdministrativeAuditEvents.Add(new() { TargetUserId = user.Id, Action = AdministrativeAction.BootstrapAdministratorGranted });
    await database.SaveChangesAsync();
    await transaction.CommitAsync();
    return;
}
app.UseMiddleware<RequestTelemetryMiddleware>(); app.UseMiddleware<ExceptionMiddleware>();
app.UseStatusCodePages(async context =>
{
    if (context.HttpContext.Request.Path.StartsWithSegments("/api"))
        await context.HttpContext.Response.WriteAsJsonAsync(new { statusCode = context.HttpContext.Response.StatusCode,
            code = context.HttpContext.Response.StatusCode == 404 ? "NOT_FOUND" : "HTTP_ERROR", message = "The request could not be completed.",
            data = (object?)null, traceId = context.HttpContext.TraceIdentifier });
});
if (app.Environment.IsDevelopment() || app.Environment.IsEnvironment("Testing") || builder.Configuration.GetValue<bool>("Swagger:Enabled"))
{ app.UseSwagger(); app.UseSwaggerUI(); }
app.UseRouting(); app.UseCors("Clients"); app.UseAuthentication(); app.UseAuthorization(); app.UseRateLimiter();
app.MapGet("/health/live", () => Results.Ok(new { status = "live" })).AllowAnonymous();
app.MapGet("/health/ready", async (DatabaseContext db, CancellationToken token) =>
{
    try { return await db.Database.CanConnectAsync(token) ? Results.Ok(new { status = "ready" }) : Results.StatusCode(503); }
    catch (Exception) { return Results.StatusCode(503); }
}).AllowAnonymous();
app.MapControllers(); app.Run();
public partial class Program { }
