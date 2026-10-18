using NTC.Core.Base;
using NTC.ModelViews.Notifications;
namespace NTC.Contract.Services.Interface;
public interface IInboxService
{
    Task<BasePaginatedList<NotificationResponse>> GetAsync(int page, int size, bool unreadOnly);
    Task MarkReadAsync(Guid id);
    Task<int> CountUnreadAsync();
    Task<int> MarkAllReadAsync();
}
