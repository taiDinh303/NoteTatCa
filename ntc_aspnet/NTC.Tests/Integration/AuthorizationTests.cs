using System.Net;
using System.Net.Http.Json;
using NTC.Tests.Infrastructure;
namespace NTC.Tests.Integration;

public sealed class AuthorizationTests
{
    [Fact]
    public async Task Anonymous_requests_cannot_read_legacy_or_versioned_data()
    {
        using var f = new ApiFactory(); await f.InitializeAsync(); using var client = f.CreateClient();
        foreach (var path in new[] { "/api/note/get-all", "/api/tag/get-all", "/api/reminder/get-all", "/api/userinfo/get-all", "/api/v1/notes", "/api/v1/notifications", "/api/v1/admin/statistics" })
            Assert.Equal(HttpStatusCode.Unauthorized, (await client.GetAsync(path)).StatusCode);
    }
    [Fact]
    public async Task Knowing_another_users_note_id_does_not_allow_reads_or_mutations_even_for_admin()
    {
        using var f = new ApiFactory(); await f.InitializeAsync(); var (a, _) = await f.LoginAsync(); using var ca = a;
        var note = await ApiFactory.Note(a); var id = note.GetProperty("id").GetGuid();
        foreach (var email in new[] { "b@example.test", "admin@example.test" })
        {
            var (other, _) = await f.LoginAsync(email); using var c = other;
            var denied = email.StartsWith("admin@") ? HttpStatusCode.Forbidden : HttpStatusCode.NotFound;
            foreach (var path in new[] { $"/api/note/get-by-id/{id}", $"/api/v1/notes/{id}" })
                Assert.Equal(denied, (await c.GetAsync(path)).StatusCode);
            Assert.Equal(denied, (await c.PutAsJsonAsync("/api/note/update", new { id, title = "Stolen", content = "changed" })).StatusCode);
            foreach (var operation in new[] { "soft-delete", "restore", "delete" })
                Assert.Equal(denied, (await c.DeleteAsync($"/api/note/{operation}/{id}")).StatusCode);
            Assert.Equal(denied, (await c.PostAsync($"/api/v1/notes/{id}/trash", null)).StatusCode);
            if (denied == HttpStatusCode.Forbidden)
                Assert.Equal(HttpStatusCode.Forbidden, (await c.GetAsync("/api/v1/notes")).StatusCode);
            else Assert.Empty((await ApiFactory.Data(await c.GetAsync("/api/v1/notes"))).GetProperty("items").EnumerateArray());
        }
        Assert.Equal("Private synthetic note", (await ApiFactory.Data(await a.GetAsync($"/api/v1/notes/{id}"))).GetProperty("content").GetString());
    }
    [Fact]
    public async Task Labels_relationships_reminders_and_profiles_are_self_scoped()
    {
        using var f = new ApiFactory(); await f.InitializeAsync(); var (a, _) = await f.LoginAsync(); var (b, _) = await f.LoginAsync("b@example.test"); using var ca=a; using var cb=b;
        var note = await ApiFactory.Note(a); var id = note.GetProperty("id").GetGuid();
        var tag = await ApiFactory.Data(await a.PostAsJsonAsync("/api/v1/tags", new { name = "duplicate allowed" })); var tid=tag.GetProperty("id").GetGuid();
        Assert.True((await a.PutAsync($"/api/v1/notes/{id}/tags/{tid}", null)).IsSuccessStatusCode);
        foreach (var path in new[] { $"/api/tag/get-by-id/{tid}", $"/api/userinfo/get-by-id/{f.A}", $"/api/reminder/get-by-note/{id}" })
            Assert.Equal(HttpStatusCode.NotFound, (await b.GetAsync(path)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await b.PutAsJsonAsync("/api/tag/update", new { id=tid, name="changed" })).StatusCode);
        foreach (var path in new[] { $"/api/notetag/remove?noteId={id}&tagId={tid}", $"/api/notetag/remove-all-tags-from-note?noteId={id}", $"/api/notetag/remove-tag-from-all-notes?tagId={tid}" })
            Assert.Equal(HttpStatusCode.NotFound, (await b.DeleteAsync(path)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await b.PutAsJsonAsync("/api/userinfo/update-name", new { userId=f.A,givenName="changed" })).StatusCode);
        var reminder = await ApiFactory.Data(await a.PostAsJsonAsync($"/api/v1/notes/{id}/reminders", new { reminderAt=f.Clock.GetUtcNow().AddHours(1), repeatInterval=1 }));
        var rid=reminder.GetProperty("id").GetGuid();
        Assert.Equal(HttpStatusCode.NotFound, (await b.GetAsync($"/api/reminder/get-by-id/{rid}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await b.DeleteAsync($"/api/reminder/soft-delete/{rid}")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await b.DeleteAsync($"/api/reminder/delete/{rid}")).StatusCode);
    }
    [Fact]
    public async Task Admin_statistics_do_not_contain_note_text_and_lock_invalidates_an_existing_session()
    {
        using var f=new ApiFactory(); await f.InitializeAsync(); var (a, session)=await f.LoginAsync(); var (admin, _)=await f.LoginAsync("admin@example.test"); using var ca=a; using var cc=admin;
        await ApiFactory.Note(a,"SECRET-SYNTHETIC-CONTENT", "SECRET-TITLE");
        Assert.Equal(HttpStatusCode.Forbidden,(await a.GetAsync("/api/v1/admin/statistics")).StatusCode);
        var statistics=await admin.GetAsync("/api/v1/admin/statistics"); var body=await statistics.Content.ReadAsStringAsync();
        Assert.True(statistics.IsSuccessStatusCode); Assert.DoesNotContain("SECRET",body); Assert.DoesNotContain("content",body,StringComparison.OrdinalIgnoreCase);
        Assert.True((await admin.PatchAsJsonAsync($"/api/v1/admin/users/{f.A}/lock",new { isLocked=true })).IsSuccessStatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized,(await a.GetAsync("/api/v1/notes")).StatusCode);
        Assert.False((await f.CreateClient().PostAsJsonAsync("/api/v1/auth/refresh",new {refreshToken=session.GetProperty("refreshToken").GetString()})).IsSuccessStatusCode);
    }
}
