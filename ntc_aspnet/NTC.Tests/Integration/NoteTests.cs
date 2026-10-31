using System.Net;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using NTC.Repositories.Context;
using NTC.Tests.Infrastructure;
namespace NTC.Tests.Integration;
public sealed class NoteTests
{
    [Fact]
    public async Task Optional_titles_duplicate_label_names_and_search_are_supported()
    {
        using var f=new ApiFactory(); await f.InitializeAsync(); var (c,_)=await f.LoginAsync(); using var client=c;
        var note=await ApiFactory.Note(c,"Tìm kiếm văn bản Unicode",null); Assert.Equal("",note.GetProperty("title").GetString());
        var first=await ApiFactory.Data(await c.PostAsJsonAsync("/api/v1/tags",new { name="Same name" }));
        var second=await ApiFactory.Data(await c.PostAsJsonAsync("/api/v1/tags",new { name="Same name" }));
        Assert.NotEqual(first.GetProperty("id").GetGuid(),second.GetProperty("id").GetGuid());
        var result=await ApiFactory.Data(await c.GetAsync("/api/v1/notes?q=Unicode")); Assert.Single(result.GetProperty("items").EnumerateArray());
        Assert.Empty((await ApiFactory.Data(await c.GetAsync("/api/v1/notes?q=does-not-exist"))).GetProperty("items").EnumerateArray());
        Assert.Equal(HttpStatusCode.BadRequest,(await c.GetAsync("/api/v1/notes?pageNumber=0&pageSize=999")).StatusCode);
    }
    [Fact]
    public async Task Idempotent_create_replays_the_same_note_and_rejects_a_different_payload()
    {
        using var f=new ApiFactory(); await f.InitializeAsync(); var (c,_)=await f.LoginAsync(); using var client=c;
        c.DefaultRequestHeaders.Add("Idempotency-Key",Guid.NewGuid().ToString());
        var one=await ApiFactory.Note(c); var two=await ApiFactory.Note(c); Assert.Equal(one.GetProperty("id").GetGuid(),two.GetProperty("id").GetGuid());
        Assert.Equal(HttpStatusCode.Conflict,(await c.PostAsJsonAsync("/api/v1/notes",new { content="Different" })).StatusCode);
        Assert.Single((await ApiFactory.Data(await c.GetAsync("/api/v1/notes"))).GetProperty("items").EnumerateArray());
    }
    [Fact]
    public async Task Autosave_requires_a_current_version_and_keeps_the_winning_update()
    {
        using var f=new ApiFactory(); await f.InitializeAsync(); var (c,_)=await f.LoginAsync(); using var client=c;
        var note=await ApiFactory.Note(c); var id=note.GetProperty("id").GetGuid(); var version=note.GetProperty("version").GetGuid();
        var updated=await ApiFactory.Data(await c.PatchAsJsonAsync($"/api/v1/notes/{id}",new {title="updated",content="Winner",version}));
        Assert.NotEqual(version,updated.GetProperty("version").GetGuid());
        Assert.Equal(HttpStatusCode.Conflict,(await c.PatchAsJsonAsync($"/api/v1/notes/{id}",new {content="Lost",version})).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest,(await c.PatchAsJsonAsync($"/api/v1/notes/{id}",new {content="No version"})).StatusCode);
        Assert.Equal("Winner",(await ApiFactory.Data(await c.GetAsync($"/api/v1/notes/{id}"))).GetProperty("content").GetString());
    }
    [Fact]
    public async Task Revision_restore_preserves_the_current_content_and_rejects_other_owners()
    {
        using var f = new ApiFactory(); await f.InitializeAsync();
        var (a, _) = await f.LoginAsync(); var (b, _) = await f.LoginAsync("b@example.test");
        using var owner = a; using var other = b;
        var created = await ApiFactory.Note(a, "First");
        var id = created.GetProperty("id").GetGuid();
        var firstVersion = created.GetProperty("version").GetGuid();
        var edited = await ApiFactory.Data(await a.PatchAsJsonAsync($"/api/v1/notes/{id}",
            new { title = "Second", content = "Second", version = firstVersion }));
        var secondVersion = edited.GetProperty("version").GetGuid();
        var revisions = await ApiFactory.Data(await a.GetAsync($"/api/v1/notes/{id}/revisions"));
        var original = Assert.Single(revisions.GetProperty("items").EnumerateArray());
        Assert.Equal(firstVersion, original.GetProperty("sourceVersion").GetGuid());
        Assert.Equal("First", original.GetProperty("content").GetString());
        Assert.Equal(HttpStatusCode.NotFound, (await b.GetAsync($"/api/v1/notes/{id}/revisions")).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await b.PostAsJsonAsync(
            $"/api/v1/notes/{id}/revisions/{original.GetProperty("id").GetGuid()}/restore",
            new { version = secondVersion })).StatusCode);
        var restored = await ApiFactory.Data(await a.PostAsJsonAsync(
            $"/api/v1/notes/{id}/revisions/{original.GetProperty("id").GetGuid()}/restore",
            new { version = secondVersion }));
        Assert.Equal("First", restored.GetProperty("content").GetString());
        Assert.NotEqual(secondVersion, restored.GetProperty("version").GetGuid());
        Assert.Equal(HttpStatusCode.Conflict, (await a.PostAsJsonAsync(
            $"/api/v1/notes/{id}/revisions/{original.GetProperty("id").GetGuid()}/restore",
            new { version = secondVersion })).StatusCode);
        var after = await ApiFactory.Data(await a.GetAsync($"/api/v1/notes/{id}/revisions"));
        Assert.Contains(after.GetProperty("items").EnumerateArray(), item =>
            item.GetProperty("content").GetString() == "Second");
        await ApiFactory.Data(await a.PostAsync($"/api/v1/notes/{id}/trash", null));
        await ApiFactory.Data(await a.DeleteAsync($"/api/v1/notes/{id}"));
        using var scope = f.Services.CreateScope();
        Assert.False(await scope.ServiceProvider.GetRequiredService<DatabaseContext>()
            .NoteRevisions.AnyAsync(x => x.NoteId == id));
    }
    [Fact]
    public async Task Rich_content_round_trips_and_legacy_cannot_silently_flatten_it()
    {
        using var f=new ApiFactory(); await f.InitializeAsync(); var (c,_)=await f.LoginAsync(); using var client=c;
        const string document="""{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hello 👋","marks":[{"type":"textStyle","attrs":{"color":"#FF0000"}}]}]},{"type":"taskList","content":[{"type":"taskItem","attrs":{"checked":true},"content":[{"type":"paragraph","content":[{"type":"text","text":"Done"}]}]}]}]}""";
        var note=await ApiFactory.Data(await c.PostAsJsonAsync("/api/v1/notes",new { documentJson=document,iconEmoji="📝" }));
        Assert.Equal(document,note.GetProperty("documentJson").GetString()); Assert.Contains("Done",note.GetProperty("content").GetString());
        var id=note.GetProperty("id").GetGuid();
        Assert.Equal(HttpStatusCode.Conflict,(await c.PutAsJsonAsync("/api/note/update",new {id,content="Flattened"})).StatusCode);
        Assert.Single((await ApiFactory.Data(await c.GetAsync("/api/v1/notes?q=Done"))).GetProperty("items").EnumerateArray());
    }
    [Theory]
    [InlineData("{\"type\":\"doc\",\"content\":[{\"type\":\"script\"}]}")]
    [InlineData("{\"type\":\"doc\",\"content\":[{\"type\":\"text\",\"text\":\"x\",\"marks\":[{\"type\":\"link\",\"attrs\":{\"href\":\"javascript:alert(1)\"}}]}]}")]
    [InlineData("{\"type\":\"doc\",\"attrs\":{\"onclick\":\"bad\"}}")]
    [InlineData("not-json")]
    public async Task Unsafe_or_invalid_documents_are_rejected(string document)
    {
        using var f=new ApiFactory(); await f.InitializeAsync(); var (c,_)=await f.LoginAsync(); using var client=c;
        Assert.Equal(HttpStatusCode.BadRequest,(await c.PostAsJsonAsync("/api/v1/notes",new { documentJson=document })).StatusCode);
    }
    [Fact]
    public async Task Pin_reorder_and_trash_lifecycle_remain_consistent()
    {
        using var f=new ApiFactory(); await f.InitializeAsync(); var (c,_)=await f.LoginAsync(); using var client=c;
        var one=await ApiFactory.Note(c,"one"); var two=await ApiFactory.Note(c,"two"); var first=one.GetProperty("id").GetGuid(); var second=two.GetProperty("id").GetGuid();
        Assert.True((await c.PostAsJsonAsync("/api/v1/notes/reorder",new { draggedId=first,previousId=(Guid?)null,nextId=second,version=one.GetProperty("version").GetGuid() })).IsSuccessStatusCode);
        var listed=(await ApiFactory.Data(await c.GetAsync("/api/v1/notes"))).GetProperty("items").EnumerateArray().ToArray(); Assert.Equal(first,listed[0].GetProperty("id").GetGuid());
        var pinned=await ApiFactory.Data(await c.PatchAsJsonAsync($"/api/v1/notes/{first}/pin",new {isPinned=true,version=listed[0].GetProperty("version").GetGuid()})); Assert.True(pinned.GetProperty("isPinned").GetBoolean());
        Assert.True((await c.PostAsync($"/api/v1/notes/{first}/trash",null)).IsSuccessStatusCode);
        Assert.Equal(HttpStatusCode.NotFound,(await c.GetAsync($"/api/v1/notes/{first}")).StatusCode);
        Assert.Single((await ApiFactory.Data(await c.GetAsync("/api/v1/notes?trash=true"))).GetProperty("items").EnumerateArray());
        Assert.True((await c.PostAsync($"/api/v1/notes/{first}/restore",null)).IsSuccessStatusCode);
        Assert.Equal(HttpStatusCode.NotFound,(await c.DeleteAsync($"/api/v1/notes/{first}")).StatusCode);
        Assert.True((await c.PostAsync($"/api/v1/notes/{first}/trash",null)).IsSuccessStatusCode);
        Assert.True((await c.DeleteAsync($"/api/v1/notes/{first}")).IsSuccessStatusCode);
    }
    [Fact]
    public async Task Invalid_color_icon_and_oversized_content_are_rejected()
    {
        using var f=new ApiFactory(); await f.InitializeAsync(); var (c,_)=await f.LoginAsync(); using var client=c;
        foreach(var body in new object[] {new {backgroundColor="#12345"},new {iconEmoji="é"},new { title=new string('t',151)},new {content=new string('x',100001)}})
            Assert.Equal(HttpStatusCode.BadRequest,(await c.PostAsJsonAsync("/api/v1/notes",body)).StatusCode);
    }
    [Fact]
    public async Task A_corrupt_legacy_cross_owner_label_link_does_not_leak_the_label()
    {
        using var f=new ApiFactory(); await f.InitializeAsync(); var (a,_)=await f.LoginAsync(); var (b,_)=await f.LoginAsync("b@example.test"); using var ca=a;using var cb=b;
        var n=await ApiFactory.Note(a);var id=n.GetProperty("id").GetGuid();var tag=await ApiFactory.Data(await b.PostAsJsonAsync("/api/v1/tags",new {name="PRIVATE-B-LABEL"}));
        // Simulate an already-corrupt legacy database. Normal writes now fail at the composite FK.
        using(var scope=f.Services.CreateScope())
        {
            var db=scope.ServiceProvider.GetRequiredService<DatabaseContext>();
            await db.Database.ExecuteSqlRawAsync("PRAGMA foreign_keys=OFF");
            try { await db.Database.ExecuteSqlInterpolatedAsync($"INSERT INTO NoteTags (NoteId,TagId,UserId) VALUES ({id},{tag.GetProperty("id").GetGuid()},{f.A})"); }
            finally { await db.Database.ExecuteSqlRawAsync("PRAGMA foreign_keys=ON"); }
        }
        Assert.DoesNotContain("PRIVATE-B-LABEL",await (await a.GetAsync($"/api/v1/notes/{id}")).Content.ReadAsStringAsync());
    }
}
