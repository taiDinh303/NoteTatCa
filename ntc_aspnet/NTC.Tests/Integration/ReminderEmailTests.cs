using System.Net;
using NTC.Services.Infrastructure;

namespace NTC.Tests.Integration;

public sealed class ReminderEmailTests
{
    [Fact]
    public void Reminder_encodes_note_text_and_button_url_without_rendering_note_markup()
    {
        var renderer = new EmailTemplateRenderer();
        var html = renderer.RenderReminder("<img onerror=bad>", "<script>bad</script> & milk", "https://client.example.test/notes/1?a=1&b=2");
        Assert.DoesNotContain("<img", html);
        Assert.DoesNotContain("<script>", html);
        Assert.Contains("&lt;img", html);
        Assert.Contains("&lt;script&gt;bad&lt;/script&gt; &amp; milk", html);
        Assert.Contains("href=\"https://client.example.test/notes/1?a=1&amp;b=2\"", html);
        Assert.Contains("Xem ghi chú</a>", html);
    }

    [Fact]
    public void Reminder_preview_is_bounded_without_splitting_emoji_and_subject_has_no_line_breaks()
    {
        var renderer = new EmailTemplateRenderer();
        var html = WebUtility.HtmlDecode(renderer.RenderReminder("  Shopping\r\n list  ", new string('x', 239) + "👩‍🍳" + "hidden tail", "https://client.example.test/notes/1"));
        Assert.Equal("Shopping list", renderer.ReminderTitle("  Shopping\r\n list  "));
        Assert.Contains(new string('x', 239) + "👩‍🍳…", html);
        Assert.DoesNotContain("hidden tail", html);
        Assert.Equal(new string('x', 100) + "…", renderer.ReminderTitle(new string('x', 150)));
    }

    [Fact]
    public void Empty_note_still_has_a_title_and_open_button_without_a_blank_preview()
    {
        var renderer = new EmailTemplateRenderer();
        var html = WebUtility.HtmlDecode(renderer.RenderReminder(" \n ", " \t ", "https://client.example.test/notes/1"));
        Assert.Contains("Ghi chú không tiêu đề", html);
        Assert.Contains("Xem ghi chú</a>", html);
        Assert.DoesNotContain("margin:12px 0 0", html);
    }
}
