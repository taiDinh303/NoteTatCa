using NTC.Core.Base;

namespace NTC.Contract.Repositories.Entities.Tasks;

public sealed class Announcement : BaseEntity
{
    public string Title { get; set; } = "";
    public string Body { get; set; } = "";
    public bool AllActiveUsers { get; set; }
    public Guid AuthorId { get; set; }
    public Guid CreateRequestId { get; set; }
    public string CreateRequestHash { get; set; } = "";
    public DateTimeOffset? PublishedAt { get; set; }
    public Guid? PublishedBy { get; set; }
    public Guid? PublishRequestId { get; set; }
    public Guid? PublishedVersion { get; set; }
    public int RecipientCount { get; set; }
    public DateTimeOffset? RevokedAt { get; set; }
    public Guid? RevokedBy { get; set; }
    public ICollection<AnnouncementTarget> Targets { get; set; } = new List<AnnouncementTarget>();
    public ICollection<AnnouncementReceipt> Receipts { get; set; } = new List<AnnouncementReceipt>();
}

public sealed class AnnouncementTarget
{
    public Guid AnnouncementId { get; set; }
    public Guid UserId { get; set; }
}

public sealed class AnnouncementReceipt : BaseEntity
{
    public Guid AnnouncementId { get; set; }
    public Guid UserId { get; set; }
    public DateTimeOffset? ReadAt { get; set; }
    public Announcement Announcement { get; set; } = null!;
}

public sealed class AnnouncementEvent
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid AnnouncementId { get; set; }
    public Guid ActorId { get; set; }
    public string Action { get; set; } = "";
    public DateTimeOffset OccurredAt { get; set; }
}
