using System.ComponentModel.DataAnnotations;

namespace NTC.ModelViews.Administration;

public sealed class AnnouncementDraftRequest
{
    [Required, StringLength(150)] public string Title { get; set; } = "";
    [Required, StringLength(10000)] public string Body { get; set; } = "";
    public bool AllActiveUsers { get; set; }
    [MaxLength(1000)] public Guid[] UserIds { get; set; } = [];
    public Guid ExpectedVersion { get; set; }
    public Guid RequestId { get; set; }
}
public sealed record AnnouncementVersionRequest(Guid ExpectedVersion);
public sealed record AnnouncementPublishRequest(Guid ExpectedVersion, Guid RequestId);
public sealed record AnnouncementResponse(Guid Id, string Title, string Body, bool AllActiveUsers,
    Guid Version, Guid AuthorId, DateTimeOffset CreatedAt, DateTimeOffset? PublishedAt,
    Guid? PublishedBy, int RecipientCount, DateTimeOffset? RevokedAt, Guid? RevokedBy);
public sealed record AnnouncementEventResponse(Guid Id, Guid ActorId, string Action, DateTimeOffset OccurredAt);
public sealed record AnnouncementDetail(AnnouncementResponse Announcement, Guid[] UserIds, AnnouncementEventResponse[] Events, Guid[] RecipientIds);
public sealed record AnnouncementPreview(AnnouncementResponse Announcement, int RecipientCount);
public sealed record AnnouncementCandidate(Guid Id, string Email);
public sealed record InboxMessageResponse(Guid Id, Guid? NoteId, Guid? ReminderId,
    DateTimeOffset OccurrenceAt, DateTimeOffset? ReadAt, string Kind, string Title, string Body);
