-- Read-only report for a permitted clone AFTER 20261017044024_CompleteNoteBackend.
-- Run before EnforceEntityIntegrity. Review nonzero counts; never auto-delete/merge rows.
SELECT COUNT(*) AS InvalidLabelRelationships
FROM NoteTags l LEFT JOIN Notes n ON n.Id=l.NoteId LEFT JOIN Tags t ON t.Id=l.TagId
WHERE n.Id IS NULL OR t.Id IS NULL OR n.UserId<>t.UserId;

SELECT COUNT(*) AS InvalidInboxRelationships
FROM Notifications x LEFT JOIN Notes n ON n.Id=x.NoteId LEFT JOIN Reminders r ON r.Id=x.ReminderId
WHERE n.Id IS NULL OR r.Id IS NULL OR x.UserId<>n.UserId OR r.NoteId<>x.NoteId;

SELECT COUNT(*) AS InvalidDeliveryRelationships
FROM ReminderDeliveries x LEFT JOIN Notes n ON n.Id=x.NoteId LEFT JOIN Reminders r ON r.Id=x.ReminderId
WHERE n.Id IS NULL OR r.Id IS NULL OR x.UserId<>n.UserId OR r.NoteId<>x.NoteId;

SELECT COUNT(*) AS InvalidRecurrenceRows FROM Reminders
WHERE RepeatType NOT BETWEEN 0 AND 4 OR RepeatInterval NOT BETWEEN 1 AND 365
   OR (RepeatCount IS NOT NULL AND RepeatCount NOT BETWEEN 1 AND 100000)
   OR (RepeatCount IS NOT NULL AND RepeatUntil IS NOT NULL) OR RepeatUntil<ReminderAt
   OR OccurrencesProcessed<0 OR (RepeatDays IS NOT NULL AND RepeatDays NOT BETWEEN 1 AND 127)
   OR (RepeatType=2 AND RepeatDays IS NULL);

SELECT COUNT(*) AS InvalidDeliveryStates FROM ReminderDeliveries
WHERE Attempts<0 OR (LeaseId IS NULL AND LeaseUntil IS NOT NULL) OR (LeaseId IS NOT NULL AND LeaseUntil IS NULL)
   OR (SentAt IS NOT NULL AND Abandoned=1);

SELECT COUNT(*) AS InvalidSessionStates FROM RefreshSessions
WHERE ExpiresAt<=CreatedAt OR RevokedAt<CreatedAt OR ReplacedById=Id;

SELECT COUNT(*) AS InvalidEmailChallenges FROM EmailChallenges
WHERE Attempts NOT BETWEEN 0 AND 5 OR ExpiresAt<=LastSentAt;

SELECT COUNT(*) AS InvalidDocumentMetadata FROM Notes
WHERE DocumentSchemaVersion<1 OR (CreateRequestId IS NULL AND CreateRequestHash IS NOT NULL)
   OR (CreateRequestId IS NOT NULL AND CreateRequestHash IS NULL);

SELECT COUNT(*) AS InvalidProfileGender FROM UserInfos WHERE Gender NOT BETWEEN 0 AND 2;
