using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using NTC.Core.Base;

namespace NTC.Services.Notes;

public static partial class ContentRules
{
    public const int MaxTextLength = 100_000;
    private static readonly HashSet<string> Nodes = ["doc", "paragraph", "text", "heading", "bulletList", "orderedList", "listItem", "taskList", "taskItem", "blockquote", "codeBlock", "hardBreak", "horizontalRule"];
    private static readonly HashSet<string> Marks = ["bold", "italic", "underline", "strike", "code", "link", "textStyle", "highlight"];
    [GeneratedRegex("^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$")]
    private static partial Regex HexColor();
    public static string? Color(string? color)
    {
        if (string.IsNullOrWhiteSpace(color)) return null;
        if (!HexColor().IsMatch(color)) throw DomainErrors.Invalid("Colors must be hexadecimal (#RGB, #RRGGBB or #RRGGBBAA).");
        return color;
    }
    public static string? Emoji(string? emoji)
    {
        if (string.IsNullOrEmpty(emoji)) return null;
        if (emoji.Length > 32 || StringInfo.ParseCombiningCharacters(emoji).Length != 1
            || emoji.Any(c => char.IsControl(c) || c is '<' or '>')
            || !emoji.EnumerateRunes().Any(r => Rune.GetUnicodeCategory(r) == UnicodeCategory.OtherSymbol || r.Value == 0x20E3))
            throw DomainErrors.Invalid("Choose one emoji for the note icon.");
        return emoji;
    }
    public static string PlainText(string? documentJson, string? fallback)
    {
        if (documentJson == null)
        {
            var text = fallback ?? string.Empty;
            if (text.Length > MaxTextLength) throw DomainErrors.Invalid("Content exceeds 100,000 characters.");
            return text;
        }
        if (Encoding.UTF8.GetByteCount(documentJson) > 1024 * 1024) throw DomainErrors.Invalid("Rich document exceeds 1 MiB.");
        try
        {
            using var document = JsonDocument.Parse(documentJson, new JsonDocumentOptions { MaxDepth = 64 });
            if (!document.RootElement.TryGetProperty("type", out var type) || type.GetString() != "doc")
                throw DomainErrors.Invalid("Document root must be doc.");
            var result = new StringBuilder(); var count = 0;
            Walk(document.RootElement, 0, ref count, result);
            var text = result.ToString().TrimEnd('\n');
            if (text.Length > MaxTextLength) throw DomainErrors.Invalid("Content exceeds 100,000 characters.");
            return text;
        }
        catch (JsonException) { throw DomainErrors.Invalid("Invalid rich document JSON."); }
        catch (InvalidOperationException) { throw DomainErrors.Invalid("Invalid rich document structure."); }
    }
    private static void Walk(JsonElement node, int depth, ref int count, StringBuilder plain)
    {
        if (depth > 32 || ++count > 20_000 || node.ValueKind != JsonValueKind.Object)
            throw DomainErrors.Invalid("Document is too complex.");
        foreach (var property in node.EnumerateObject())
            if (property.Name is not ("type" or "text" or "content" or "marks" or "attrs"))
                throw DomainErrors.Invalid("Unsupported document property.");
        if (!node.TryGetProperty("type", out var typeElement) || !Nodes.Contains(typeElement.GetString() ?? ""))
            throw DomainErrors.Invalid("Unsupported document node.");
        var type = typeElement.GetString()!;
        if (depth > 0 && type == "doc") throw DomainErrors.Invalid("Nested documents are not supported.");
        if (node.TryGetProperty("attrs", out var attrs)) ValidateAttrs(type, attrs);
        if (node.TryGetProperty("marks", out var marks))
        {
            if (marks.ValueKind != JsonValueKind.Array || marks.GetArrayLength() > 10) throw DomainErrors.Invalid("Invalid document marks.");
            foreach (var mark in marks.EnumerateArray())
            {
                if (!mark.TryGetProperty("type", out var markType) || !Marks.Contains(markType.GetString() ?? "")) throw DomainErrors.Invalid("Unsupported formatting.");
                foreach (var p in mark.EnumerateObject()) if (p.Name is not ("type" or "attrs")) throw DomainErrors.Invalid("Unsupported mark property.");
                if (mark.TryGetProperty("attrs", out var a)) ValidateAttrs(markType.GetString()!, a);
            }
        }
        if (type == "text")
        {
            if (!node.TryGetProperty("text", out var text) || text.ValueKind != JsonValueKind.String) throw DomainErrors.Invalid("Text node requires text.");
            plain.Append(text.GetString());
        }
        else if (node.TryGetProperty("text", out _)) throw DomainErrors.Invalid("Only text nodes may contain text.");
        if (node.TryGetProperty("content", out var content))
        {
            if (type is "text" or "hardBreak" or "horizontalRule" || content.ValueKind != JsonValueKind.Array) throw DomainErrors.Invalid("Invalid node content.");
            foreach (var child in content.EnumerateArray()) Walk(child, depth + 1, ref count, plain);
        }
        if (type is "paragraph" or "heading" or "hardBreak" or "codeBlock") plain.Append('\n');
        if (plain.Length > MaxTextLength + 20_000) throw DomainErrors.Invalid("Document text is too long.");
    }
    private static void ValidateAttrs(string type, JsonElement attrs)
    {
        if (attrs.ValueKind != JsonValueKind.Object) throw DomainErrors.Invalid("Attributes must be an object.");
        foreach (var attr in attrs.EnumerateObject())
        {
            var valid = (type, attr.Name) switch
            {
                ("heading", "level") => attr.Value.TryGetInt32(out var level) && level is >= 1 and <= 6,
                ("orderedList", "start") => attr.Value.TryGetInt32(out var start) && start is >= 1 and <= 1_000_000,
                ("taskItem", "checked") => attr.Value.ValueKind is JsonValueKind.True or JsonValueKind.False,
                ("codeBlock", "language") => attr.Value.ValueKind == JsonValueKind.Null || attr.Value.ValueKind == JsonValueKind.String && attr.Value.GetString()!.Length <= 32 && attr.Value.GetString()!.All(c => char.IsAsciiLetterOrDigit(c) || c is '-' or '_' or '+'),
                ("textStyle" or "highlight", "color") => attr.Value.ValueKind == JsonValueKind.String && HexColor().IsMatch(attr.Value.GetString()!),
                ("link", "href") => attr.Value.ValueKind == JsonValueKind.String && Uri.TryCreate(attr.Value.GetString(), UriKind.Absolute, out var uri) && uri.Scheme is "http" or "https" or "mailto",
                _ => false
            };
            if (!valid) throw DomainErrors.Invalid("Unsupported or unsafe document attribute.");
        }
    }
}
