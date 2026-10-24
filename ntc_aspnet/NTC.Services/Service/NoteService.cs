using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using NTC.Contract.Repositories.Entities;
using NTC.Contract.Repositories.Entities.Tasks;
using NTC.Contract.Repositories.IUOW;
using NTC.Contract.Services.Interface;
using NTC.Core.Base;
using NTC.Core.Security;
using NTC.ModelViews.NoteModelView;
using NTC.Services.Mappings;
using NTC.Services.Notes;
using NTC.Services.Shared;

namespace NTC.Services.Service;

public sealed class NoteService(IUnitOfWork unitOfWork, ICurrentUser currentUser, TimeProvider clock)
    : BaseService(unitOfWork, currentUser, clock), INoteService
{
    private IQueryable<Note> Owned(bool trash = false) => Repository<Note>().Entities
        .Where(x => x.UserId == UserId && (x.DeletedTime != null) == trash);
    private IQueryable<Note> WithDetails(IQueryable<Note> query) => query
        .Include(x => x.NoteTags.Where(t => t.Tag.DeletedTime == null && t.Tag.UserId == UserId)).ThenInclude(x => x.Tag)
        .Include(x => x.Reminders.Where(r => r.IsActive && r.DeletedTime == null));
    public Task<BasePaginatedList<NoteResponseModelView>> GetAllAsync(int p, int s) => QueryAsync(p, s);
    public Task<BasePaginatedList<NoteResponseModelView>> GetTrashAsync(int p, int s) => QueryAsync(p, s, trash: true);
    public Task<BasePaginatedList<NoteResponseModelView>> GetByTagAsync(Guid? tag, int p, int s) => QueryAsync(p, s, tagId: tag);
    public Task<BasePaginatedList<NoteResponseModelView>> GetByReminderAsync(int p, int s) => QueryAsync(p, s, hasReminder: true);
    public async Task<BasePaginatedList<NoteResponseModelView>> QueryAsync(int page, int size, string? search = null,
        Guid? tagId = null, bool trash = false, bool? pinned = null, bool hasReminder = false)
    {
        _ = UserId; ValidatePage(page, size);
        var query = Owned(trash).AsNoTracking();
        if (search?.Length > 200) throw DomainErrors.Invalid("Search must be at most 200 characters.");
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            query = query.Where(x => x.Title!.ToLower().Contains(term) || x.Content.ToLower().Contains(term));
        }
        if (tagId.HasValue) query = query.Where(x => x.NoteTags.Any(t => t.TagId == tagId && t.Tag.UserId == UserId && t.Tag.DeletedTime == null));
        if (pinned.HasValue) query = query.Where(x => x.IsPinned == pinned);
        if (hasReminder) query = query.Where(x => x.Reminders.Any(r => r.IsActive && r.DeletedTime == null));
        var count = await query.CountAsync();
        var ordered = trash ? query.OrderByDescending(x => x.DeletedTime).ThenBy(x => x.Id)
            : query.OrderByDescending(x => x.IsPinned).ThenBy(x => x.SortOrder).ThenBy(x => x.Id);
        var notes = await WithDetails(ordered).Skip((page - 1) * size).Take(size).ToListAsync();
        return new(notes.Select(x => x.ToViewModel()).ToArray(), count, page, size);
    }
    public async Task<NoteResponseModelView> GetByIdAsync(Guid id) => (await WithDetails(Owned())
        .AsNoTracking().FirstOrDefaultAsync(x => x.Id == id) ?? throw DomainErrors.NotFound("Note")).ToViewModel();

    public async Task<Note> CreateAsync(CreateNoteModelView model)
    {
        _ = UserId; Validate(model.Title, model.Content, model.DocumentJson, model.IconEmoji, model.BackgroundColor);
        var fingerprint = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(new
        { model.Title, model.Content, model.DocumentJson, model.IconEmoji, model.BackgroundColor, model.IsPinned, model.TagIds }))));
        return await InTransactionAsync(async () =>
        {
            if (model.ClientRequestId is { } key)
            {
                if (key == Guid.Empty) throw DomainErrors.Invalid("Idempotency key must not be empty.");
                var existing = await Repository<Note>().Entities.FirstOrDefaultAsync(x => x.UserId == UserId && x.CreateRequestId == key);
                if (existing != null)
                {
                    if (existing.CreateRequestHash != fingerprint || existing.DeletedTime != null) throw DomainErrors.Conflict("Idempotency key was already used.");
                    return existing;
                }
            }
            var tags = await ValidateTags(model.TagIds);
            var min = await Owned().Where(x => x.IsPinned == model.IsPinned).Select(x => (double?)x.SortOrder).MinAsync() ?? 1000;
            var note = new Note { UserId = UserId, Title = model.Title?.Trim() ?? "", Content = ContentRules.PlainText(model.DocumentJson, model.Content),
                DocumentJson = model.DocumentJson, IconEmoji = ContentRules.Emoji(model.IconEmoji), BackgroundColor = ContentRules.Color(model.BackgroundColor),
                IsPinned = model.IsPinned, PinnedAt = model.IsPinned ? UtcNow : null, Priority = model.Priority,
                SortOrder = min - 1000, CreateRequestId = model.ClientRequestId, CreateRequestHash = model.ClientRequestId.HasValue ? fingerprint : null };
            await Repository<Note>().InsertAsync(note);
            foreach (var tag in tags) await Repository<NoteTag>().InsertAsync(new() { NoteId = note.Id, TagId = tag, UserId = UserId });
            await UnitOfWork.SaveAsync(); return note;
        });
    }
    public async Task UpdateAsync(UpdateNoteModelView model)
    {
        Validate(model.Title, model.Content, model.DocumentJson, model.IconEmoji, model.BackgroundColor);
        await InTransactionAsync(async () =>
        {
            var note = await Owned().FirstOrDefaultAsync(x => x.Id == model.Id) ?? throw DomainErrors.NotFound("Note");
            CheckVersion(note, model.Version);
            if (note.DocumentJson != null && model.DocumentJson == null && !model.ConvertToPlainText) throw DomainErrors.Conflict("A rich note must be saved with its document. Use explicit conversion in the editor.");
            var tags = model.TagIds == null ? null : await ValidateTags(model.TagIds);
            note.Title = model.Title?.Trim() ?? ""; note.Content = ContentRules.PlainText(model.DocumentJson, model.Content);
            note.DocumentJson = model.DocumentJson; note.IconEmoji = ContentRules.Emoji(model.IconEmoji);
            note.BackgroundColor = ContentRules.Color(model.BackgroundColor); note.Priority = model.Priority;
            await Pin(note, model.IsPinned);
            if (tags != null)
            {
                var links = await Repository<NoteTag>().Entities.Where(x => x.NoteId == note.Id).ToListAsync();
                foreach (var link in links.Where(x => !tags.Contains(x.TagId))) await Repository<NoteTag>().DeleteAsync(link);
                foreach (var tag in tags.Where(x => links.All(l => l.TagId != x))) await Repository<NoteTag>().InsertAsync(new() { NoteId = note.Id, TagId = tag, UserId = UserId });
            }
            await Repository<Note>().UpdateAsync(note); await UnitOfWork.SaveAsync(); return true;
        });
    }
    private async Task<List<Guid>> ValidateTags(List<Guid>? ids)
    {
        var tags = ids?.Distinct().ToList() ?? [];
        if (tags.Count > 20 || tags.Contains(Guid.Empty)) throw DomainErrors.Invalid("A note supports up to 20 labels.");
        var count = await Repository<Tag>().Entities.CountAsync(x => tags.Contains(x.Id) && x.UserId == UserId && x.DeletedTime == null);
        if (count != tags.Count) throw DomainErrors.NotFound("Label");
        return tags;
    }
    private static void Validate(string? title, string content, string? document, string? icon, string? color)
    {
        if (title?.Length > 150) throw DomainErrors.Invalid("Title must be at most 150 characters.");
        if (content.Length > ContentRules.MaxTextLength) throw DomainErrors.Invalid("Content exceeds 100,000 characters.");
        _ = ContentRules.PlainText(document, content); _ = ContentRules.Emoji(icon); _ = ContentRules.Color(color);
    }
    private static void CheckVersion(Note note, Guid? version)
    { if (version.HasValue && version.Value != note.Version) throw DomainErrors.Conflict(); }
    private async Task Pin(Note note, bool pinned)
    {
        if (note.IsPinned == pinned) return;
        var min = await Owned().Where(x => x.IsPinned == pinned).Select(x => (double?)x.SortOrder).MinAsync() ?? 1000;
        note.IsPinned = pinned; note.PinnedAt = pinned ? UtcNow : null; note.SortOrder = min - 1000;
    }
    public async Task TogglePinAsync(Guid id)
    {
        await InTransactionAsync(async () => { var note = await Owned().FirstOrDefaultAsync(x => x.Id == id) ?? throw DomainErrors.NotFound("Note");
            await Pin(note, !note.IsPinned); await UnitOfWork.SaveAsync(); return true; });
    }
    public async Task SetPinnedAsync(Guid id, bool pinned, Guid version)
    {
        await InTransactionAsync(async () => { var note = await Owned().FirstOrDefaultAsync(x => x.Id == id) ?? throw DomainErrors.NotFound("Note");
            CheckVersion(note, version); await Pin(note, pinned); await UnitOfWork.SaveAsync(); return true; });
    }
    public async Task SoftDeleteAsync(Guid id)
    {
        var note = await Repository<Note>().Entities.FirstOrDefaultAsync(x => x.Id == id && x.UserId == UserId) ?? throw DomainErrors.NotFound("Note");
        if (note.DeletedTime != null) return;
        note.DeletedTime = UtcNow; note.DeletedBy = CurrentUser.Name; await UnitOfWork.SaveAsync();
    }
    public async Task RestoreAsync(Guid id)
    {
        await InTransactionAsync(async () =>
        {
            var note = await Owned(true).FirstOrDefaultAsync(x => x.Id == id) ?? throw DomainErrors.NotFound("Note");
            if (note.DeletedTime <= UtcNow.AddDays(-30)) throw DomainErrors.Conflict("The 30-day recovery period has expired.");
            note.DeletedTime = null; note.DeletedBy = null;
            var reminders = await Repository<Reminder>().Entities.Where(x => x.NoteId == id && x.IsActive && x.DeletedTime == null).ToListAsync();
            foreach (var reminder in reminders) ReminderSchedule.AdvancePast(reminder, UtcNow);
            await UnitOfWork.SaveAsync(); return true;
        });
    }
    public async Task DeleteAsync(Guid id)
    {
        await InTransactionAsync(async () =>
        {
            var note = await Owned(true).FirstOrDefaultAsync(x => x.Id == id) ?? throw DomainErrors.NotFound("Note in trash");
            await NoteGraph.DeleteAsync(UnitOfWork, note); await UnitOfWork.SaveAsync(); return true;
        });
    }
    public async Task ReorderAsync(ReorderNoteModelView model)
    {
        await InTransactionAsync(async () =>
        {
            var note = await Owned().FirstOrDefaultAsync(x => x.Id == model.DraggedId) ?? throw DomainErrors.NotFound("Note");
            CheckVersion(note, model.Version);
            var group = await Owned().Where(x => x.IsPinned == note.IsPinned).OrderBy(x => x.SortOrder).ThenBy(x => x.Id).ToListAsync();
            group.Remove(note);
            if (model.PreviousId == note.Id || model.NextId == note.Id || model.PreviousId.HasValue && model.PreviousId == model.NextId)
                throw DomainErrors.Invalid("Invalid reorder neighbors.");
            var previous = model.PreviousId.HasValue ? group.FindIndex(x => x.Id == model.PreviousId) : -1;
            var next = model.NextId.HasValue ? group.FindIndex(x => x.Id == model.NextId) : group.Count;
            if (model.PreviousId.HasValue && previous < 0 || model.NextId.HasValue && next < 0) throw DomainErrors.NotFound("Neighbor");
            if (next != previous + 1) throw DomainErrors.Conflict("Reorder neighbors are no longer adjacent.");
            group.Insert(next, note);
            for (var i = 0; i < group.Count; i++) group[i].SortOrder = (i + 1) * 1000d;
            await UnitOfWork.SaveAsync(); return true;
        });
    }
}
