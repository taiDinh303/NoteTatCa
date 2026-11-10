namespace NTC.ModelViews.Administration;

public sealed record ReminderDeliveryResponse(Guid Id, Guid UserId, string Status, int Attempts,
    DateTimeOffset OccurrenceAt, DateTimeOffset NextAttemptAt, DateTimeOffset? LastAttemptAt,
    DateTimeOffset? SentAt, DateTimeOffset? AbandonedAt, DateTimeOffset? LeaseUntil, string? ErrorCode);
