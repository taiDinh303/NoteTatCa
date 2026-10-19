using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using NTC.Contract.Repositories.Entities;
using NTC.Repositories.Context;
using NTC.Tests.Infrastructure;

namespace NTC.Tests.Integration;

public sealed class AdministratorSeparationTests
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Administrators_cannot_use_any_customer_controller_even_with_user_membership(bool mixedRoles)
    {
        using var factory = new ApiFactory(); await factory.InitializeAsync();
        if (mixedRoles)
        {
            using var scope = factory.Services.CreateScope();
            var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            Assert.True((await users.AddToRoleAsync((await users.FindByIdAsync(factory.Admin.ToString()))!, "User")).Succeeded);
        }
        var (client, _) = await factory.LoginAsync("admin@example.test"); using var admin = client;
        foreach (var path in new[] { "/api/v1/notes", "/api/v1/tags", "/api/v1/reminders", "/api/v1/notifications",
            "/api/v1/notifications/unread-count", "/api/note/get-all", "/api/tag/get-all", "/api/reminder/get-all" })
            Assert.Equal(HttpStatusCode.Forbidden, (await admin.GetAsync(path)).StatusCode);
        var id = Guid.NewGuid();
        foreach (var (method, path) in new[] {
            (HttpMethod.Post, "/api/v1/notes"), (HttpMethod.Post, "/api/note/create"),
            (HttpMethod.Post, "/api/v1/tags"), (HttpMethod.Post, "/api/tag/create"),
            (HttpMethod.Post, $"/api/v1/notes/{id}/reminders"), (HttpMethod.Post, "/api/reminder/create"),
            (HttpMethod.Post, "/api/notetag/add"), (HttpMethod.Patch, "/api/v1/notifications/read-all"),
            (HttpMethod.Delete, $"/api/v1/notes/{id}"), (HttpMethod.Delete, $"/api/note/delete/{id}") })
        {
            using var request = new HttpRequestMessage(method, path) { Content = JsonContent.Create(new { title = "Admin must not create notes" }) };
            Assert.Equal(HttpStatusCode.Forbidden, (await admin.SendAsync(request)).StatusCode);
        }
        foreach (var path in new[] { "/api/v1/admin/statistics", "/api/v1/admin/users", "/api/v1/admin/roles", "/api/v1/admin/audit-events", "/api/v1/me", "/api/v1/me/sessions" })
            Assert.Equal(HttpStatusCode.OK, (await admin.GetAsync(path)).StatusCode);
        using var check = factory.Services.CreateScope();
        Assert.False(await check.ServiceProvider.GetRequiredService<DatabaseContext>().Notes.AnyAsync(x => x.UserId == factory.Admin));
        Assert.Empty(factory.Email.Messages);
    }

    [Fact]
    public async Task Current_database_role_takes_precedence_over_old_token_without_deleting_personal_data()
    {
        using var factory = new ApiFactory(); await factory.InitializeAsync();
        var (client, _) = await factory.LoginAsync(); using var user = client;
        var note = await ApiFactory.Note(user);
        using (var scope = factory.Services.CreateScope())
        {
            var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            Assert.True((await users.AddToRoleAsync((await users.FindByIdAsync(factory.A.ToString()))!, "Admin")).Succeeded);
        }
        Assert.Equal(HttpStatusCode.Forbidden, (await user.GetAsync("/api/v1/notes")).StatusCode);
        Assert.Equal(HttpStatusCode.OK, (await user.GetAsync("/api/v1/admin/statistics")).StatusCode);
        using (var scope = factory.Services.CreateScope())
        {
            var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            Assert.True((await users.RemoveFromRoleAsync((await users.FindByIdAsync(factory.A.ToString()))!, "Admin")).Succeeded);
        }
        Assert.Equal(HttpStatusCode.OK, (await user.GetAsync("/api/v1/notes/" + note.GetProperty("id").GetGuid())).StatusCode);
        Assert.Equal(HttpStatusCode.Forbidden, (await user.GetAsync("/api/v1/admin/users")).StatusCode);
    }
}
