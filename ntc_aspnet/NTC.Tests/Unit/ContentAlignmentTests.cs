using System.Text.Json;
using NTC.Core.Base;
using NTC.Services.Notes;
using Xunit;

namespace NTC.Tests.Unit;

public class ContentAlignmentTests
{
    [Theory]
    [InlineData("paragraph", "left")]
    [InlineData("paragraph", "center")]
    [InlineData("heading", "center")]
    public void SupportedAlignmentPreservesPlainText(string type, string alignment)
    {
        Assert.Equal("Private text", ContentRules.PlainText(Document(type, alignment), null));
    }

    [Theory]
    [InlineData("paragraph", "right")]
    [InlineData("paragraph", "center; color:red")]
    [InlineData("codeBlock", "center")]
    [InlineData("paragraph", null)]
    public void UnsupportedAlignmentIsRejected(string type, string? alignment)
    {
        var error = Assert.Throws<BaseException.ErrorException>(() => ContentRules.PlainText(Document(type, alignment), null));
        Assert.Equal(400, error.StatusCode);
        Assert.Equal("VALIDATION_ERROR", error.ErrorDetail.ErrorCode);
    }

    private static string Document(string type, string? alignment) => JsonSerializer.Serialize(new
    {
        type = "doc",
        content = new[] { new { type, attrs = new { textAlign = alignment }, content = new[] { new { type = "text", text = "Private text" } } } }
    });
}
