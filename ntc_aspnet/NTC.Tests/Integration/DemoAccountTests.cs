using System.Net.Http.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using NTC.API.Operations;
using NTC.Contract.Repositories.Entities;
using NTC.Repositories.Context;
using NTC.Tests.Infrastructure;

namespace NTC.Tests.Integration;

public sealed class DemoAccountTests
{
    private const string Password = "Synthetic-demo-password-123!";
    private static DemoAccountSeeder Seeder(IServiceProvider services, bool enabled = true,
        string environment = "Testing", string password = Password) => new(
        services.GetRequiredService<DatabaseContext>(), services.GetRequiredService<UserManager<ApplicationUser>>(),
        services.GetRequiredService<RoleManager<ApplicationRole>>(), new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        { ["DemoAccounts:Enabled"] = enabled.ToString(), ["DemoAccounts:Password"] = password }).Build(), new TestEnvironment(environment),
        services.GetRequiredService<TimeProvider>());

    [Fact]
    public async Task Provisions_five_verified_identity_accounts_and_real_http_login_owner_boundaries()
    {
        using var factory = new ApiFactory(); await factory.InitializeAsync();
        using (var scope = factory.Services.CreateScope()) Assert.Equal(5, await Seeder(scope.ServiceProvider).SeedAsync());
        using var client = factory.CreateClient();
        foreach (var email in DemoAccountSeeder.Emails)
        {
            var session = await ApiFactory.Data(await client.PostAsJsonAsync("/api/v1/auth/login", new { email, password = Password }));
            var roles = session.GetProperty("roles").EnumerateArray().Select(x => x.GetString()).ToArray();
            Assert.Equal(email.StartsWith("admin@"), roles.Contains("Admin"));
            Assert.Contains("User", roles);
        }
        using var a = factory.CreateClient(); using var b = factory.CreateClient();
        async Task SignIn(HttpClient target, string email)
        {
            var session = await ApiFactory.Data(await target.PostAsJsonAsync("/api/v1/auth/login", new { email, password = Password }));
            target.DefaultRequestHeaders.Authorization = new("Bearer", session.GetProperty("token").GetString());
        }
        await SignIn(a, DemoAccountSeeder.Emails[1]); await SignIn(b, DemoAccountSeeder.Emails[0]);
        var note = await ApiFactory.Note(a);
        Assert.Equal(System.Net.HttpStatusCode.NotFound, (await b.GetAsync("/api/v1/notes/" + note.GetProperty("id").GetGuid())).StatusCode);
        Assert.Empty(factory.Email.Messages);
    }

    [Fact]
    public async Task Sample_content_is_private_valid_and_never_recreated_after_owner_edits_or_deletes_it()
    {
        using var factory = new ApiFactory(); await factory.InitializeAsync();
        using var scope = factory.Services.CreateScope(); var services = scope.ServiceProvider;
        await Seeder(services).SeedAsync();
        var db = services.GetRequiredService<DatabaseContext>();
        var owner = (await services.GetRequiredService<UserManager<ApplicationUser>>().FindByEmailAsync(DemoAccountSeeder.Emails[1]))!.Id;
        var notes = await db.Notes.Where(x => x.UserId == owner).ToListAsync();
        Assert.Equal(5, notes.Count); Assert.Single(notes, x => x.DeletedTime != null);
        Assert.Single(notes, x => x.IsPinned && x.PinnedAt != null);
        Assert.Contains(notes, x => x.Title == "");
        foreach (var note in notes)
            Assert.Equal(note.Content, NTC.Services.Notes.ContentRules.PlainText(note.DocumentJson, note.Content));
        Assert.Equal(15, await db.Tags.CountAsync());
        Assert.Equal(25, await db.NoteTags.CountAsync());
        Assert.All(await db.NoteTags.Include(x => x.Note).Include(x => x.Tag).ToListAsync(),
            link => { Assert.Equal(link.UserId, link.Note.UserId); Assert.Equal(link.UserId, link.Tag.UserId); });
        var edited = notes.Single(x => x.IsPinned); edited.Title = "My own title";
        var deleted = notes.Single(x => x.DeletedTime != null);
        db.NoteTags.RemoveRange(await db.NoteTags.Where(x => x.NoteId == deleted.Id).ToListAsync());
        db.Notes.Remove(deleted); await db.SaveChangesAsync();
        Assert.Equal(0, await Seeder(services).SeedAsync());
        Assert.Equal(4, await db.Notes.CountAsync(x => x.UserId == owner));
        Assert.Equal("My own title", (await db.Notes.FindAsync(edited.Id))!.Title);
        Assert.Empty(factory.Email.Messages);
    }

    [Fact]
    public async Task Rerunning_is_idempotent_and_preserves_password_hash_security_stamp_and_audit()
    {
        using var factory = new ApiFactory(); await factory.InitializeAsync();
        using var scope = factory.Services.CreateScope(); var services = scope.ServiceProvider;
        Assert.Equal(5, await Seeder(services).SeedAsync());
        var db = services.GetRequiredService<DatabaseContext>();
        var first = await db.Users.AsNoTracking().SingleAsync(x => x.Email == DemoAccountSeeder.Emails[0]);
        var count = await db.AdministrativeAuditEvents.CountAsync();
        Assert.Equal(0, await Seeder(services).SeedAsync());
        var next = await db.Users.AsNoTracking().SingleAsync(x => x.Id == first.Id);
        Assert.Equal(first.PasswordHash, next.PasswordHash); Assert.Equal(first.SecurityStamp, next.SecurityStamp);
        Assert.Equal(count, await db.AdministrativeAuditEvents.CountAsync());
    }

    [Fact]
    public async Task Existing_real_account_collision_is_not_adopted_verified_or_promoted()
    {
        using var factory = new ApiFactory(); await factory.InitializeAsync();
        using var scope = factory.Services.CreateScope(); var services = scope.ServiceProvider;
        var users = services.GetRequiredService<UserManager<ApplicationUser>>();
        var real = new ApplicationUser {Id=Guid.NewGuid(), UserName=DemoAccountSeeder.Emails[4], Email=DemoAccountSeeder.Emails[4]};
        Assert.True((await users.CreateAsync(real, Password)).Succeeded);
        await Assert.ThrowsAsync<InvalidOperationException>(() => Seeder(services).SeedAsync());
        Assert.False(real.EmailConfirmed); Assert.Empty(await users.GetRolesAsync(real));
        Assert.Null(await users.FindByEmailAsync(DemoAccountSeeder.Emails[0]));
    }

    [Theory]
    [InlineData(false, "Testing")]
    [InlineData(true, "Production")]
    public async Task Requires_explicit_flag_and_nonproduction_environment(bool enabled, string environment)
    {
        using var factory = new ApiFactory(); await factory.InitializeAsync(); using var scope = factory.Services.CreateScope();
        await Assert.ThrowsAsync<InvalidOperationException>(() => Seeder(scope.ServiceProvider, enabled, environment).SeedAsync());
        Assert.Equal(3, await scope.ServiceProvider.GetRequiredService<DatabaseContext>().Users.CountAsync());
    }

    [Fact]
    public async Task A_different_password_does_not_reset_already_provisioned_accounts()
    {
        using var factory = new ApiFactory(); await factory.InitializeAsync(); using var scope = factory.Services.CreateScope();
        await Seeder(scope.ServiceProvider).SeedAsync();
        await Assert.ThrowsAsync<InvalidOperationException>(() => Seeder(scope.ServiceProvider, password: "Another-synthetic-password-123!").SeedAsync());
        var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        Assert.True(await users.CheckPasswordAsync((await users.FindByEmailAsync(DemoAccountSeeder.Emails[0]))!, Password));
    }
    private sealed class TestEnvironment(string name) : IHostEnvironment
    {
        public string EnvironmentName {get;set;} = name;
        public string ApplicationName {get;set;} = "NTC.Tests";
        public string ContentRootPath {get;set;} = Directory.GetCurrentDirectory();
        public IFileProvider ContentRootFileProvider {get;set;} = new NullFileProvider();
    }
}
