using NTC.Core.Base;
using NTC.ModelViews.Administration;

namespace NTC.Contract.Services.Interface;

public interface IAnnouncementService
{
    Task<BasePaginatedList<AnnouncementResponse>> ListAsync(int page, int size);
    Task<BasePaginatedList<AnnouncementCandidate>> CandidatesAsync(int page, int size, string? q);
    Task<AnnouncementDetail> GetAsync(Guid id);
    Task<AnnouncementDetail> CreateAsync(AnnouncementDraftRequest request);
    Task<AnnouncementDetail> UpdateAsync(Guid id, AnnouncementDraftRequest request);
    Task<AnnouncementPreview> PreviewAsync(Guid id, Guid version);
    Task<AnnouncementDetail> PublishAsync(Guid id, AnnouncementPublishRequest request);
    Task<AnnouncementDetail> RevokeAsync(Guid id, Guid version);
    Task<BasePaginatedList<InboxMessageResponse>> FeedAsync(int page, int size, bool unreadOnly);
    Task<int> CountUnreadAsync();
    Task ReadAsync(Guid id);
    Task<int> ReadAllAsync();
}
