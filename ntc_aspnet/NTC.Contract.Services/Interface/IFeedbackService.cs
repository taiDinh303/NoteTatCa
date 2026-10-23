using NTC.ModelViews.Feedback;
namespace NTC.Contract.Services.Interface;
public interface IFeedbackService
{
    Task SendAsync(FeedbackRequest request);
}
