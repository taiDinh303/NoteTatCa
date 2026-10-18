namespace NTC.ModelViews.Notifications;
public sealed record NotificationResponse(Guid Id, Guid NoteId, Guid ReminderId, DateTimeOffset OccurrenceAt, DateTimeOffset? ReadAt);
