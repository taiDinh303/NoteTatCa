-- Read-only summaries, run against a permitted clone before migration. No personal values printed.
SELECT COUNT(*) AS DuplicateNormalizedEmailGroups
FROM (SELECT NormalizedEmail FROM AspNetUsers WHERE NormalizedEmail IS NOT NULL GROUP BY NormalizedEmail HAVING COUNT(*) > 1) AS DuplicateGroups;
SELECT COUNT(*) AS MissingEmailOrNormalization FROM AspNetUsers
WHERE Email IS NULL OR NormalizedEmail IS NULL;
SELECT COUNT(*) AS NotesOverNewTextLimit FROM Notes WHERE DATALENGTH(Content) / 2 > 100000;
SELECT COUNT(*) AS CrossOwnerLabelLinks FROM NoteTags AS Links
JOIN Notes AS Notes ON Notes.Id = Links.NoteId JOIN Tags AS Tags ON Tags.Id = Links.TagId
WHERE Notes.UserId <> Tags.UserId;
SELECT COUNT(*) AS TrashEligibleForSevenDayPurge FROM Notes
WHERE DeletedTime <= DATEADD(day, -7, SYSDATETIMEOFFSET());
