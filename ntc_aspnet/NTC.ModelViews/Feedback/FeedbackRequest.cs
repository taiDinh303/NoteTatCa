using System.ComponentModel.DataAnnotations;
namespace NTC.ModelViews.Feedback;
public sealed class FeedbackRequest
{
    [Required, StringLength(40)] public string Kind { get; set; } = string.Empty;
    [Required, StringLength(5000, MinimumLength = 1)] public string Message { get; set; } = string.Empty;
}
