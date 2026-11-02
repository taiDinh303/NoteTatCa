using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using NTC.Repositories.Context;
using NTC.Tests.Infrastructure;

namespace NTC.Tests.Integration;

public sealed class WorkspaceArchiveTests
{
    [Fact]
    public async Task Archive_restores_into_an_isolated_workspace_without_overwriting_existing_notes()
    {
        using var source = new ApiFactory(); await source.InitializeAsync();
        var (sourceClient, _) = await source.LoginAsync(); using var owner = sourceClient;
        var label = await ApiFactory.Data(await owner.PostAsJsonAsync("/api/v1/tags", new { name = "Family", color = "#FF9900" }));
        var original = await ApiFactory.Note(owner, "First draft", "Family words");
        var id = original.GetProperty("id").GetGuid();
        var labelId = label.GetProperty("id").GetGuid();
        await ApiFactory.Data(await owner.PutAsync($"/api/v1/notes/{id}/tags/{labelId}", null));
        var current = await ApiFactory.Data(await owner.GetAsync($"/api/v1/notes/{id}"));
        await ApiFactory.Data(await owner.PatchAsJsonAsync($"/api/v1/notes/{id}", new
        {
            title = "Family words", content = "Mother, father", version = current.GetProperty("version").GetGuid()
        }));
        await ApiFactory.Data(await owner.PostAsJsonAsync($"/api/v1/notes/{id}/reminders",
            new { reminderAt = DateTimeOffset.UtcNow.AddDays(2), timeZoneId = "Asia/Ho_Chi_Minh", sendEmail = true }));
        var archive = await ApiFactory.Data(await owner.GetAsync("/api/v1/workspace/archive"));
        Assert.Single(archive.GetProperty("notes").EnumerateArray());
        Assert.Single(archive.GetProperty("notes")[0].GetProperty("revisions").EnumerateArray());

        using var destination = new ApiFactory(); await destination.InitializeAsync();
        var (destinationClient, _) = await destination.LoginAsync(); using var restorer = destinationClient;
        var existing = await ApiFactory.Note(restorer, "Keep this note");
        var import = await ApiFactory.Data(await restorer.PostAsJsonAsync("/api/v1/workspace/archive/import", archive));
        Assert.Equal(1, import.GetProperty("notes").GetInt32());
        Assert.Equal(1, import.GetProperty("labels").GetInt32());
        Assert.Equal(1, import.GetProperty("revisions").GetInt32());
        Assert.Equal(1, import.GetProperty("reminders").GetInt32());
        var after = await ApiFactory.Data(await restorer.GetAsync("/api/v1/notes?pageSize=100"));
        var items = after.GetProperty("items").EnumerateArray().ToArray();
        Assert.Equal(2, items.Length);
        Assert.Contains(items, x => x.GetProperty("id").GetGuid() == existing.GetProperty("id").GetGuid());
        var restored = Assert.Single(items, x => x.GetProperty("title").GetString() == "Family words");
        Assert.NotEqual(id, restored.GetProperty("id").GetGuid());
        Assert.Equal(archive.GetProperty("notes")[0].GetProperty("createdTime").GetDateTimeOffset(),
            restored.GetProperty("createdTime").GetDateTimeOffset());
        using (var scope = destination.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<DatabaseContext>();
            Assert.False((await db.Reminders.SingleAsync(x => x.NoteId == restored.GetProperty("id").GetGuid())).IsActive);
        }
        var history = await ApiFactory.Data(await restorer.GetAsync($"/api/v1/notes/{restored.GetProperty("id").GetGuid()}/revisions"));
        Assert.Equal("First draft", Assert.Single(history.GetProperty("items").EnumerateArray()).GetProperty("content").GetString());
        var other = await destination.LoginAsync("b@example.test"); using var otherClient = other.Client;
        Assert.Empty((await ApiFactory.Data(await otherClient.GetAsync("/api/v1/notes"))).GetProperty("items").EnumerateArray());
        Assert.Equal(HttpStatusCode.NotFound, (await otherClient.GetAsync($"/api/v1/notes/{restored.GetProperty("id").GetGuid()}")).StatusCode);
    }

    [Fact]
    public async Task Malformed_archive_is_rejected_without_partial_import()
    {
        using var f = new ApiFactory(); await f.InitializeAsync();
        var (client, _) = await f.LoginAsync(); using var owner = client;
        var archive = await ApiFactory.Data(await owner.GetAsync("/api/v1/workspace/archive"));
        var invalid = new { format = "notetatca-workspace", schemaVersion = 99, labels = Array.Empty<object>(), notes = Array.Empty<object>() };
        Assert.Equal(HttpStatusCode.BadRequest, (await owner.PostAsJsonAsync("/api/v1/workspace/archive/import", invalid)).StatusCode);
        Assert.Empty((await ApiFactory.Data(await owner.GetAsync("/api/v1/notes"))).GetProperty("items").EnumerateArray());
    }

    [Theory]
    [InlineData("null-note")]
    [InlineData("null-revision")]
    [InlineData("invalid-reminder")]
    public async Task Invalid_nested_archive_data_never_creates_partial_copies(string scenario)
    {
        using var f = new ApiFactory(); await f.InitializeAsync();
        var (client, _) = await f.LoginAsync(); using var owner = client;
        await ApiFactory.Note(owner, title: "Keep original");
        var exported = await ApiFactory.Data(await owner.GetAsync("/api/v1/workspace/archive"));
        var archive = System.Text.Json.Nodes.JsonNode.Parse(exported.GetRawText())!;
        var note = archive["notes"]![0]!;
        if (scenario == "null-note") archive["notes"]!.AsArray().Add((System.Text.Json.Nodes.JsonNode?)null);
        else if (scenario == "null-revision") note["revisions"]!.AsArray().Add((System.Text.Json.Nodes.JsonNode?)null);
        else note["reminders"]!.AsArray().Add(System.Text.Json.Nodes.JsonNode.Parse("""
            {"reminderAt":"2026-11-01T00:00:00Z","timeZoneId":"Asia/Ho_Chi_Minh","repeatType":1,"repeatInterval":0}
            """));
        Assert.Equal(HttpStatusCode.BadRequest, (await owner.PostAsJsonAsync("/api/v1/workspace/archive/import", archive)).StatusCode);
        var remaining = await ApiFactory.Data(await owner.GetAsync("/api/v1/notes"));
        Assert.Equal("Keep original", Assert.Single(remaining.GetProperty("items").EnumerateArray()).GetProperty("title").GetString());
    }
}
