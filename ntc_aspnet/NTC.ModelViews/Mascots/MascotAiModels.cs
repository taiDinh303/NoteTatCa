using System.ComponentModel.DataAnnotations;
namespace NTC.ModelViews.Mascots;
public sealed class CreateMascotRequest
{
    public Guid RequestId { get; set; }
    public Guid? ReplacesId { get; set; }
    [MaxLength(1000)] public string Description { get; set; } = "";
    [MaxLength(2_800_000)] public string? ReferencePngBase64 { get; set; }
    public bool ConsentToSendToOpenAi { get; set; }
}
public sealed record MascotJobView(Guid Id, string State, DateTimeOffset CreatedAt, string? ErrorCode);
public sealed record MascotAiStatus(bool Available, int DailyLimit, DateTimeOffset ResetsAt, bool CanCreate, bool CanEdit, MascotJobView? Latest, MascotJobView? Slot);
public sealed record MascotAiResult(string DirectionsPngBase64, string ReactionsPngBase64);
public sealed class ApplyMascotRequest
{
    [Required, MaxLength(800_000)] public string DirectionsWebpBase64 { get; set; } = "";
    [Required, MaxLength(800_000)] public string ReactionsWebpBase64 { get; set; } = "";
}
public sealed record SavedMascotResult(Guid Id, string DirectionsWebpBase64, string ReactionsWebpBase64);
