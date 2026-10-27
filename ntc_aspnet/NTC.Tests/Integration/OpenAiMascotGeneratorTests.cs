using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;
using NTC.Services.Mascots;
namespace NTC.Tests.Integration;
public sealed class OpenAiMascotGeneratorTests
{
    private sealed class Handler(Func<HttpRequestMessage, int, Task<HttpResponseMessage>> reply) : HttpMessageHandler
    {
        public int Calls { get; private set; }
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken token) => reply(request, ++Calls);
    }
    // Only validates the provider transport contract; no network/image decoding is used.
    private static byte[] PngHeader()
    {
        var bytes = new byte[33]; new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 }.CopyTo(bytes, 0);
        Encoding.ASCII.GetBytes("IHDR").CopyTo(bytes, 12); bytes[18] = bytes[22] = 4; bytes[25] = 6; return bytes;
    }
    [Fact]
    public async Task Text_creation_uses_one_generation_then_one_reference_edit_without_exposing_identity()
    {
        var bytes = PngHeader(); var owner = Guid.NewGuid();
        var handler = new Handler(async (request, count) =>
        {
            Assert.Equal("api.openai.com", request.RequestUri!.Host);
            Assert.Equal("synthetic-private-key", request.Headers.Authorization!.Parameter);
            var body = await request.Content!.ReadAsStringAsync();
            Assert.DoesNotContain(owner.ToString(), body);
            if (count == 1)
            {
                Assert.Equal("/v1/images/generations", request.RequestUri.AbsolutePath);
                using var json = JsonDocument.Parse(body);
                Assert.Equal(1, json.RootElement.GetProperty("n").GetInt32());
                Assert.Equal("transparent", json.RootElement.GetProperty("background").GetString());
                Assert.Equal("1024x1024", json.RootElement.GetProperty("size").GetString());
                Assert.Equal("png", json.RootElement.GetProperty("output_format").GetString());
            }
            else
            {
                Assert.Equal("/v1/images/edits", request.RequestUri.AbsolutePath);
                Assert.IsType<MultipartFormDataContent>(request.Content);
                Assert.Contains("image[]", body);
            }
            return new(HttpStatusCode.OK) { Content = new StringContent(JsonSerializer.Serialize(new { data = new[] { new { b64_json = Convert.ToBase64String(bytes) } } })) };
        });
        using var client = new HttpClient(handler);
        var generator = new OpenAiMascotGenerator(client, Options.Create(new MascotAiOptions { OpenAiApiKey = "synthetic-private-key" }));
        var images = await generator.GenerateAsync(owner, "A blue owl", null, default);
        Assert.Equal(bytes, images.Directions); Assert.Equal(bytes, images.Reactions); Assert.Equal(2, handler.Calls);
    }
    [Fact]
    public async Task Reference_input_uses_edits_and_provider_errors_are_not_retried_or_returned_verbatim()
    {
        var handler = new Handler((request, _) =>
        {
            Assert.Equal("/v1/images/edits", request.RequestUri!.AbsolutePath);
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.BadRequest) { Content = new StringContent("private upstream error and secret") });
        });
        using var client = new HttpClient(handler);
        var generator = new OpenAiMascotGenerator(client, Options.Create(new MascotAiOptions { OpenAiApiKey = "synthetic" }));
        var error = await Assert.ThrowsAsync<MascotProviderException>(() => generator.GenerateAsync(Guid.NewGuid(), "Owl", PngHeader(), default));
        Assert.Equal("PROVIDER_REJECTED", error.Code); Assert.DoesNotContain("private", error.Message); Assert.Equal(1, handler.Calls);
    }
}
