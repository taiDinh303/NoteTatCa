using Microsoft.EntityFrameworkCore;
using NTC.Contract.Repositories.Entities;
using NTC.Contract.Repositories.Entities.Tasks;
using NTC.Contract.Repositories.IUOW;
using NTC.Contract.Services.Interface;
using NTC.Core.Base;
using NTC.Core.Security;
using NTC.ModelViews.Backup;
using NTC.Services.Notes;
using NTC.Services.Shared;

namespace NTC.Services.Service;

public sealed class WorkspaceArchiveService(IUnitOfWork unitOfWork, ICurrentUser currentUser, TimeProvider clock)
    : BaseService(unitOfWork, currentUser, clock), IWorkspaceArchiveService
{
    public async Task<WorkspaceArchive> ExportAsync()
    {
        var owner = UserId;
        var labels = await Repository<Tag>().Entities.AsNoTracking()
            .Where(x => x.UserId == owner && x.DeletedTime == null).OrderBy(x => x.Name).ToListAsync();
        var notes = await Repository<Note>().Entities.AsNoTracking()
            .Where(x => x.UserId == owner)
            .Include(x => x.NoteTags).Include(x => x.Reminders)
            .OrderBy(x => x.CreatedTime).ThenBy(x => x.Id).ToListAsync();
        var revisions = await Repository<NoteRevision>().Entities.AsNoTracking()
            .Where(x => x.UserId == owner)
            .OrderBy(x => x.SavedAt).ThenBy(x => x.Id).ToListAsync();
        var revisionsByNote = revisions.ToLookup(x => x.NoteId);
        var labelIds = labels.Select(x => x.Id).ToHashSet();
        return new WorkspaceArchive
        {
            ExportedAt = UtcNow,
            Labels = labels.Select(x => new ArchiveLabel(x.Id, x.Name, x.Color, x.Icon)).ToList(),
            Notes = notes.Select(x => new ArchiveNote
            {
                Id = x.Id, Title = x.Title, Content = x.Content, DocumentJson = x.DocumentJson,
                DocumentSchemaVersion = x.DocumentSchemaVersion, IconEmoji = x.IconEmoji,
                BackgroundColor = x.BackgroundColor, IsPinned = x.IsPinned, PinnedAt = x.PinnedAt,
                Priority = x.Priority, SortOrder = x.SortOrder,
                InTrash = x.DeletedTime != null, CreatedTime = x.CreatedTime, LastUpdatedTime = x.LastUpdatedTime,
                LabelIds = x.NoteTags.Where(t => labelIds.Contains(t.TagId)).Select(t => t.TagId).ToList(),
                Reminders = x.Reminders.Where(r => r.DeletedTime == null).Select(r => new ArchiveReminder(
                    r.ReminderAt, r.TimeZoneId, r.SendEmail, r.RepeatType, r.RepeatInterval,
                    r.RepeatDays, r.RepeatUntil, r.RepeatCount, r.IsActive)).ToList(),
                Revisions = revisionsByNote[x.Id].Select(r => new ArchiveRevision(
                    r.SourceVersion, r.SavedAt, r.Title, r.Content, r.DocumentJson,
                    r.DocumentSchemaVersion, r.IconEmoji, r.BackgroundColor)).ToList()
            }).ToList()
        };
    }

    public async Task<ImportArchiveResult> ImportAsync(WorkspaceArchive archive)
    {
        var owner = UserId;
        Validate(archive);
        return await InTransactionAsync(async () =>
        {
            var labels = new Dictionary<Guid, Guid>();
            foreach (var source in archive.Labels)
            {
                var label = new Tag { UserId = owner, Name = source.Name.Trim(), Color = source.Color, Icon = source.Icon };
                await Repository<Tag>().InsertAsync(label);
                labels.Add(source.Id, label.Id);
            }
            var reminderCount = 0; var revisionCount = 0;
            foreach (var source in archive.Notes)
            {
                var note = new Note
                {
                    UserId = owner, Title = source.Title, Content = source.Content,
                    DocumentJson = source.DocumentJson, DocumentSchemaVersion = source.DocumentSchemaVersion,
                    IconEmoji = source.IconEmoji, BackgroundColor = source.BackgroundColor,
                    IsPinned = source.IsPinned, PinnedAt = source.IsPinned ? source.PinnedAt ?? UtcNow : null,
                    Priority = source.Priority,
                    SortOrder = source.SortOrder,
                    CreatedTime = source.CreatedTime, LastUpdatedTime = source.LastUpdatedTime,
                    PreserveImportedTimestamps = true,
                    // Imported trash starts a fresh retention period in this account.
                    DeletedTime = source.InTrash ? UtcNow : null
                };
                await Repository<Note>().InsertAsync(note);
                foreach (var labelId in source.LabelIds)
                    await Repository<NoteTag>().InsertAsync(new NoteTag { UserId = owner, NoteId = note.Id, TagId = labels[labelId] });
                foreach (var reminder in source.Reminders)
                {
                    await Repository<Reminder>().InsertAsync(new Reminder
                    {
                        NoteId = note.Id, ReminderAt = reminder.ReminderAt, TimeZoneId = reminder.TimeZoneId,
                        SendEmail = reminder.SendEmail, RepeatType = reminder.RepeatType,
                        RepeatInterval = reminder.RepeatInterval, RepeatDays = reminder.RepeatDays,
                        RepeatUntil = reminder.RepeatUntil, RepeatCount = reminder.RepeatCount,
                        // Imported reminders are inactive until the owner deliberately re-enables them.
                        IsActive = false
                    });
                    reminderCount++;
                }
                foreach (var revision in source.Revisions)
                {
                    await Repository<NoteRevision>().InsertAsync(new NoteRevision
                    {
                        UserId = owner, NoteId = note.Id, SourceVersion = revision.SourceVersion,
                        SavedAt = revision.SavedAt, Title = revision.Title, Content = revision.Content,
                        DocumentJson = revision.DocumentJson, DocumentSchemaVersion = revision.DocumentSchemaVersion,
                        IconEmoji = revision.IconEmoji, BackgroundColor = revision.BackgroundColor
                    });
                    revisionCount++;
                }
            }
            await UnitOfWork.SaveAsync();
            return new ImportArchiveResult(archive.Notes.Count, archive.Labels.Count, reminderCount, revisionCount);
        });
    }

    private static void Validate(WorkspaceArchive? archive)
    {
        if (archive == null || archive.Format != WorkspaceArchive.FormatName || archive.SchemaVersion != 1 ||
            archive.Labels == null || archive.Notes == null || archive.Labels.Count > 5000 || archive.Notes.Count > 10000)
            throw DomainErrors.Invalid("Unsupported or oversized workspace archive.");
        if (archive.Labels.Any(x => x == null || x.Id == Guid.Empty || string.IsNullOrWhiteSpace(x.Name) || x.Name.Length > 50) ||
            archive.Labels.Select(x => x.Id).Distinct().Count() != archive.Labels.Count ||
            archive.Notes.Any(x => x == null || x.Id == Guid.Empty) || archive.Notes.Select(x => x.Id).Distinct().Count() != archive.Notes.Count)
            throw DomainErrors.Invalid("Invalid archive identity or label.");
        var labelIds = archive.Labels.Select(x => x.Id).ToHashSet();
        foreach (var label in archive.Labels)
        {
            _ = ContentRules.Color(label.Color);
            if (label.Icon?.Length > 50 || label.Icon?.Any(c => char.IsControl(c) || c is '<' or '>') == true)
                throw DomainErrors.Invalid("Invalid archived label icon.");
        }
        foreach (var note in archive.Notes)
        {
            if (note.Title == null || note.Title.Length > 150 || note.Content == null ||
                note.CreatedTime == default || note.LastUpdatedTime == default ||
                note.DocumentSchemaVersion != 1 || !double.IsFinite(note.SortOrder) ||
                note.LabelIds == null || note.LabelIds.Count > 20 || note.Reminders == null || note.Revisions == null ||
                note.Reminders.Any(x => x == null) || note.Revisions.Any(x => x == null) ||
                note.LabelIds.Any(x => !labelIds.Contains(x)) || note.LabelIds.Distinct().Count() != note.LabelIds.Count ||
                note.Reminders.Count > 100 || note.Revisions.Count > 10000)
                throw DomainErrors.Invalid("Invalid archived note.");
            ValidateContent(note.Title, note.Content, note.DocumentJson, note.IconEmoji, note.BackgroundColor);
            if (note.Revisions.Select(x => x.SourceVersion).Distinct().Count() != note.Revisions.Count)
                throw DomainErrors.Invalid("Duplicate archived revision.");
            foreach (var revision in note.Revisions)
            {
                if (revision.SourceVersion == Guid.Empty || revision.SavedAt == default || revision.DocumentSchemaVersion != 1)
                    throw DomainErrors.Invalid("Invalid archived revision.");
                ValidateContent(revision.Title, revision.Content, revision.DocumentJson, revision.IconEmoji, revision.BackgroundColor);
            }
            foreach (var reminder in note.Reminders)
            {
                ReminderSchedule.Validate(new Reminder {
                    ReminderAt = reminder.ReminderAt, TimeZoneId = reminder.TimeZoneId,
                    RepeatType = reminder.RepeatType, RepeatInterval = reminder.RepeatInterval,
                    RepeatDays = reminder.RepeatDays, RepeatUntil = reminder.RepeatUntil,
                    RepeatCount = reminder.RepeatCount
                });
                if (reminder.ReminderAt == default || string.IsNullOrWhiteSpace(reminder.TimeZoneId) || reminder.TimeZoneId.Length > 100)
                    throw DomainErrors.Invalid("Invalid archived reminder.");
                try { _ = TimeZoneInfo.FindSystemTimeZoneById(reminder.TimeZoneId); }
                catch (TimeZoneNotFoundException) { throw DomainErrors.Invalid("Invalid archived reminder time zone."); }
                catch (InvalidTimeZoneException) { throw DomainErrors.Invalid("Invalid archived reminder time zone."); }
            }
        }
    }
    private static void ValidateContent(string title, string content, string? document, string? icon, string? color)
    {
        if (title == null || title.Length > 150 || content == null ||
            ContentRules.PlainText(document, content) != content)
            throw DomainErrors.Invalid("Invalid archived content.");
        _ = ContentRules.Emoji(icon); _ = ContentRules.Color(color);
    }
}
