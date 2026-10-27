namespace NTC.Services.Mascots;
public sealed class MascotAiOptions
{
    public bool Enabled { get; set; }
    public string OpenAiApiKey { get; set; } = "";
    public string Model { get; set; } = "gpt-image-2.5-flare";
    public bool Available => Enabled && !string.IsNullOrWhiteSpace(OpenAiApiKey);
}
