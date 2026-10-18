using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using NTC.Contract.Repositories.Entities;
using NTC.Contract.Repositories.Entities.Identity;
using NTC.Repositories.Context;

namespace NTC.API.Operations;

/// <summary>Explicit operator provisioning; never called by startup or an HTTP endpoint.</summary>
public sealed class DemoAccountSeeder(DatabaseContext database, UserManager<ApplicationUser> users,
    RoleManager<ApplicationRole> roles, IConfiguration configuration, IHostEnvironment environment, TimeProvider clock)
{
    public const string Marker = "ntc-explicit-demo-seed-v1";
    public static readonly string[] Emails = ["admin@ntc.example.test", "user01@ntc.example.test",
        "user02@ntc.example.test", "user03@ntc.example.test", "user04@ntc.example.test"];

    public async Task<int> SeedAsync()
    {
        if ((!environment.IsDevelopment() && !environment.IsEnvironment("Testing"))
            || !configuration.GetValue<bool>("DemoAccounts:Enabled"))
            throw new InvalidOperationException("Demo provisioning requires Development/Testing and DemoAccounts:Enabled=true.");
        var password = configuration["DemoAccounts:Password"];
        if (string.IsNullOrWhiteSpace(password) || password.Length < 16 || password.Length > 128)
            throw new InvalidOperationException("Set a private demo password between 16 and 128 characters.");

        await using var transaction = await database.Database.BeginTransactionAsync();
        if (database.Database.IsNpgsql())
            await database.Database.ExecuteSqlRawAsync("SELECT pg_advisory_xact_lock(7904380171)");
        // Validate all collisions before changing anything. Never adopt or reset a real account.
        var existing = new Dictionary<string, ApplicationUser>();
        foreach (var email in Emails)
        {
            var user = await users.FindByEmailAsync(email);
            if (user is null) continue;
            var claims = await users.GetClaimsAsync(user);
            if (!claims.Any(x => x.Type == "ntc:demo-seed" && x.Value == Marker) || user.DeletedTime != null || user.IsLocked || !user.EmailConfirmed
                || !await users.CheckPasswordAsync(user, password))
                throw new InvalidOperationException("A demo email already exists with different credentials/state; no account was changed.");
            existing.Add(email, user);
        }
        foreach (var name in new[] { "User", "Admin" })
        {
            var role = await roles.FindByNameAsync(name);
            if (role?.DeletedTime != null) throw new InvalidOperationException("A required role is deactivated; no role was restored.");
            if (role is null) Require(await roles.CreateAsync(new() { Name = name }));
        }
        var created = 0;
        foreach (var email in Emails)
        {
            if (existing.TryGetValue(email, out var seeded))
            {
                await SeedNotesAsync(seeded);
                continue;
            }
            var admin = email == Emails[0];
            var user = new ApplicationUser { Id = Guid.NewGuid(), UserName = email, Email = email,
                EmailConfirmed = true, CreatedBy = Marker, TimeZoneId = "Asia/Ho_Chi_Minh" };
            Require(await users.CreateAsync(user, password));
            Require(await users.AddClaimAsync(user, new Claim("ntc:demo-seed", Marker)));
            Require(await users.AddToRoleAsync(user, "User"));
            if (admin) Require(await users.AddToRoleAsync(user, "Admin"));
            database.UserInfos.Add(new() { Id = user.Id, GivenName = admin ? "Demo Admin" : "Demo User",
                FamilyName = admin ? null : email.Substring(4, 2), Locale = "en", CreatedBy = Marker });
            database.AdministrativeAuditEvents.Add(new() { TargetUserId = user.Id, Action = AdministrativeAction.AccountCreated });
            if (admin) database.AdministrativeAuditEvents.Add(new() { TargetUserId = user.Id,
                Action = AdministrativeAction.BootstrapAdministratorGranted });
            await SeedNotesAsync(user);
            created++;
        }
        await database.SaveChangesAsync();
        await transaction.CommitAsync();
        return created;
    }

    private async Task SeedNotesAsync(ApplicationUser user)
    {
        const string contentMarker = "ntc-demo-notes-v1";
        if ((await users.GetClaimsAsync(user)).Any(x => x.Type == "ntc:demo-content" && x.Value == contentMarker)) return;
        DemoNotes.Add(database, user.Id, clock.GetUtcNow());
        // Remember completion even if the owner later edits or deletes the sample notes.
        Require(await users.AddClaimAsync(user, new Claim("ntc:demo-content", contentMarker)));
    }
    private static void Require(IdentityResult result)
    {
        if (!result.Succeeded) throw new InvalidOperationException("Demo provisioning failed: " + string.Join(", ", result.Errors.Select(x => x.Code)));
    }
}
