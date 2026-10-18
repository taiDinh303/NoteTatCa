using NTC.Core.Base;

namespace NTC.Contract.Repositories.Entities.Tasks;

public sealed class Notification : BaseEntity
{
    public Guid UserId { get; set; }
    public Guid NoteId { get; set; }
    public Guid ReminderId { get; set; }
    public DateTimeOffset OccurrenceAt { get; set; }
    public DateTimeOffset? ReadAt { get; set; }
    public Note Note { get; set; } = null!;
    public Reminder Reminder { get; set; } = null!;
}
