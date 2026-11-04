using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using NTC.Tests.Infrastructure;

namespace NTC.Tests.Integration;

public sealed class ListFormattingTests
{
    [Theory]
    [InlineData("disc")]
    [InlineData("dash")]
    [InlineData("circle")]
    [InlineData("square")]
    [InlineData("url(https://evil.test)")]
    [InlineData("dash; color:red")]
    [InlineData("")]
    public async Task Bullet_styles_round_trip_only_when_allowlisted(string style)
    {
        using var f = new ApiFactory(); await f.InitializeAsync();
        var (client, _) = await f.LoginAsync(); using var owner = client;
        var documentJson = JsonSerializer.Serialize(new {
            type = "doc", content = new[] { new {
                type = "bulletList", attrs = new { bulletStyle = style }, content = new[] { new {
                    type = "listItem", content = new[] { new {
                        type = "paragraph", content = new[] { new { type = "text", text = "List item" } }
                    } }
                } }
            } }
        });
        var response = await client.PostAsJsonAsync("/api/v1/notes", new { documentJson });
        if (style is not ("disc" or "dash" or "circle" or "square"))
        {
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode); return;
        }
        var saved = await ApiFactory.Data(response);
        var loaded = await ApiFactory.Data(await client.GetAsync($"/api/v1/notes/{saved.GetProperty("id").GetGuid()}"));
        Assert.Equal(documentJson, loaded.GetProperty("documentJson").GetString());
        Assert.Contains("List item", loaded.GetProperty("content").GetString());
    }
}
