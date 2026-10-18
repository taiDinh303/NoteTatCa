using NTC.Core.Base;

namespace NTC.Contract.Repositories.Entities.Tasks;

public sealed class ReminderDelivery : BaseEntity
{
    public Guid ReminderId { get; set; }
    public Guid UserId { get; set; }
    public Guid NoteId { get; set; }
    public DateTimeOffset OccurrenceAt { get; set; }
    public int Attempts { get; set; }
    public DateTimeOffset? LastAttemptAt { get; set; }
    public DateTimeOffset NextAttemptAt { get; set; }
    public DateTimeOffset? LeaseUntil { get; set; }
    public Guid? LeaseId { get; set; }
    public DateTimeOffset? SentAt { get; set; }
    public bool Abandoned { get; set; }
    public DateTimeOffset? AbandonedAt { get; set; }
    public string? LastErrorCode { get; set; }
    public Note Note { get; set; } = null!;
    public Reminder Reminder { get; set; } = null!;
}
