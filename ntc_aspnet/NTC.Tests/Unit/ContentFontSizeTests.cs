using System.Text.Json;
using NTC.Core.Base;
using NTC.Services.Notes;
using Xunit;
namespace NTC.Tests.Unit;
public class ContentFontSizeTests
{
    [Theory]
    [InlineData("12px")][InlineData("14px")][InlineData("16px")][InlineData("18px")][InlineData("20px")][InlineData("24px")][InlineData("28px")][InlineData("32px")][InlineData("40px")][InlineData("48px")]
    public void SupportedFontSizePreservesText(string fontSize) => Assert.Equal("Private text", ContentRules.PlainText(Document(fontSize), null));
    [Theory]
    [InlineData(null)][InlineData("1000px")][InlineData("1em")][InlineData("16px;color:red")][InlineData(16)]
    public void InvalidFontSizeIsRejected(object? fontSize)
    {
        var error = Assert.Throws<BaseException.ErrorException>(() => ContentRules.PlainText(Document(fontSize), null));
        Assert.Equal(400, error.StatusCode);
    }
    private static string Document(object? fontSize) => JsonSerializer.Serialize(new {
        type = "doc", content = new[] {new {type = "paragraph", content = new[] {new {type = "text", text = "Private text", marks = new[] {new {type = "textStyle", attrs = new {fontSize, color = "#123456"}}}}}}}
    });
}
