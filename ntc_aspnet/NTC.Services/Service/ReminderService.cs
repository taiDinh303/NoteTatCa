using Microsoft.EntityFrameworkCore;
using NTC.Contract.Repositories.Entities;
using NTC.Contract.Repositories.Entities.Tasks;
using NTC.Contract.Repositories.IUOW;
using NTC.Contract.Services.Interface;
using NTC.Core.Base;
using NTC.Core.Security;
using NTC.ModelViews.ReminderModelView;
using NTC.Services.Mappings;
using NTC.Services.Notes;
using NTC.Services.Shared;
namespace NTC.Services.Service;
public sealed class ReminderService(IUnitOfWork unitOfWork, ICurrentUser currentUser, TimeProvider clock)
    : BaseService(unitOfWork, currentUser, clock), IReminderService
{
    private IQueryable<Reminder> Owned() => Repository<Reminder>().Entities.Include(x => x.Note)
        .Where(x => x.Note != null && x.Note.UserId == UserId && x.Note.DeletedTime == null && x.DeletedTime == null);
    public async Task<BasePaginatedList<ReminderResponseModelView>> GetAllAsync(int pageNumber, int pageSize)
    {
        _ = UserId; ValidatePage(pageNumber, pageSize); var query = Owned().AsNoTracking(); var count = await query.CountAsync();
        var items = await query.OrderBy(x => x.ReminderAt).ThenBy(x => x.Id).Skip((pageNumber - 1) * pageSize).Take(pageSize).ToListAsync();
        return new(items.Select(x => x.ToViewModel()).ToArray(), count, pageNumber, pageSize);
    }
    public async Task<ReminderResponseModelView> GetByIdAsync(Guid id) =>
        (await Owned().AsNoTracking().FirstOrDefaultAsync(x => x.Id == id) ?? throw DomainErrors.NotFound("Reminder")).ToViewModel();
    public async Task<List<ReminderResponseModelView>> GetByNoteIdAsync(Guid noteId)
    {
        if (!await Repository<Note>().Entities.AnyAsync(x => x.Id == noteId && x.UserId == UserId && x.DeletedTime == null)) throw DomainErrors.NotFound("Note");
        return (await Owned().AsNoTracking().Where(x => x.NoteId == noteId).OrderBy(x => x.ReminderAt).ToListAsync()).Select(x => x.ToViewModel()).ToList();
    }
    public async Task<Reminder> CreateAsync(CreateReminderModelView model)
    {
        return await InTransactionAsync(async () =>
        {
            if (!await Repository<Note>().Entities.AnyAsync(x => x.Id == model.NoteId && x.UserId == UserId && x.DeletedTime == null)) throw DomainErrors.NotFound("Note");
            if (await Owned().CountAsync(x => x.NoteId == model.NoteId && x.IsActive) >= 5) throw DomainErrors.Invalid("A note supports up to five active reminders.");
            var user = await Repository<ApplicationUser>().Entities.FirstAsync(x => x.Id == UserId);
            var r = new Reminder { NoteId = model.NoteId, ReminderAt = model.ReminderAt.ToUniversalTime(), RepeatType = model.RepeatType,
                RepeatInterval = model.RepeatInterval, RepeatDays = model.RepeatDays, RepeatCount = model.RepeatCount,
                RepeatUntil = model.RepeatUntil?.ToUniversalTime(), TimeZoneId = model.TimeZoneId ?? user.TimeZoneId, SendEmail = model.SendEmail };
            ReminderSchedule.Validate(r);
            if (r.ReminderAt <= UtcNow) throw DomainErrors.Invalid("A new reminder must start in the future.");
            r.NextOccurrenceAt = ReminderSchedule.Occurrence(r, 0);
            await Repository<Reminder>().InsertAsync(r); await UnitOfWork.SaveAsync(); return r;
        });
    }
    public async Task UpdateAsync(UpdateReminderModelView model)
    {
        await InTransactionAsync(async () =>
        {
            var r = await Owned().FirstOrDefaultAsync(x => x.Id == model.Id) ?? throw DomainErrors.NotFound("Reminder");
            if (model.Version.HasValue) RequireVersion(model.Version.Value, r.Version);
            await ApplyUpdate(r, model);
            await UnitOfWork.SaveAsync(); return true;
        });
    }
    public async Task PatchAsync(Guid id, PatchReminderRequest request)
    {
        await InTransactionAsync(async () =>
        {
            var r = await Owned().FirstOrDefaultAsync(x => x.Id == id) ?? throw DomainErrors.NotFound("Reminder");
            RequireVersion(request.Version, r.Version);
            if (request.Includes(nameof(request.ReminderAt)) && request.ReminderAt == null
                || request.Includes(nameof(request.TimeZoneId)) && string.IsNullOrWhiteSpace(request.TimeZoneId)
                || request.Includes(nameof(request.RepeatType)) && request.RepeatType == null
                || request.Includes(nameof(request.RepeatInterval)) && request.RepeatInterval == null
                || request.Includes(nameof(request.IsActive)) && request.IsActive == null
                || request.Includes(nameof(request.SendEmail)) && request.SendEmail == null)
                throw DomainErrors.Invalid("Required reminder fields cannot be cleared.");
            await ApplyUpdate(r, new()
            {
                Id = id, ReminderAt = request.ReminderAt ?? r.ReminderAt, TimeZoneId = request.TimeZoneId ?? r.TimeZoneId,
                RepeatType = request.RepeatType ?? r.RepeatType, RepeatInterval = request.RepeatInterval ?? r.RepeatInterval,
                RepeatDays = request.Includes(nameof(request.RepeatDays)) ? request.RepeatDays : r.RepeatDays,
                RepeatUntil = request.Includes(nameof(request.RepeatUntil)) ? request.RepeatUntil : r.RepeatUntil,
                RepeatCount = request.Includes(nameof(request.RepeatCount)) ? request.RepeatCount : r.RepeatCount,
                SendEmail = request.SendEmail ?? r.SendEmail, IsActive = request.IsActive ?? r.IsActive
            });
            await UnitOfWork.SaveAsync(); return true;
        });
    }
    private async Task ApplyUpdate(Reminder r, UpdateReminderModelView model)
    {
        var wasActive = r.IsActive;
        var before = (r.ReminderAt, r.RepeatType, r.RepeatInterval, r.RepeatDays, r.RepeatUntil, r.RepeatCount, r.TimeZoneId);
        if (!wasActive && model.IsActive && await Owned().CountAsync(x => x.NoteId == r.NoteId && x.IsActive) >= 5)
            throw DomainErrors.Invalid("A note supports up to five active reminders.");
        r.ReminderAt = model.ReminderAt.ToUniversalTime(); r.RepeatType = model.RepeatType; r.RepeatInterval = model.RepeatInterval;
        r.RepeatDays = model.RepeatDays; r.RepeatUntil = model.RepeatUntil?.ToUniversalTime(); r.RepeatCount = model.RepeatCount;
        r.TimeZoneId = model.TimeZoneId ?? r.TimeZoneId; r.SendEmail = model.SendEmail; r.IsActive = model.IsActive;
        ReminderSchedule.Validate(r);
        var changed = before != (r.ReminderAt, r.RepeatType, r.RepeatInterval, r.RepeatDays, r.RepeatUntil, r.RepeatCount, r.TimeZoneId);
        if (changed || wasActive != r.IsActive)
        {
            await CancelPending(r.Id);
            r.OccurrencesProcessed = 0; r.NextOccurrenceAt = r.IsActive ? ReminderSchedule.Occurrence(r, 0) : null;
            if (r.IsActive && r.NextOccurrenceAt <= UtcNow) ReminderSchedule.AdvancePast(r, UtcNow);
        }
        else if (!r.SendEmail) await CancelPending(r.Id);
    }
    private async Task CancelPending(Guid id)
    {
        foreach (var delivery in await Repository<ReminderDelivery>().Entities.Where(x => x.ReminderId == id && x.SentAt == null && !x.Abandoned).ToListAsync())
        { delivery.Abandoned = true; delivery.AbandonedAt = UtcNow; delivery.LastErrorCode = "REMINDER_CHANGED"; delivery.LeaseId = null; delivery.LeaseUntil = null; }
    }
    public async Task SoftDeleteAsync(Guid id)
    {
        await InTransactionAsync(async () =>
        {
            var r = await Owned().FirstOrDefaultAsync(x => x.Id == id) ?? throw DomainErrors.NotFound("Reminder");
            r.IsActive = false; r.DeletedTime = UtcNow; r.DeletedBy = CurrentUser.Name; await CancelPending(id);
            await UnitOfWork.SaveAsync(); return true;
        });
    }
    public async Task DeleteAsync(Guid id)
    {
        await InTransactionAsync(async () =>
        {
            var r = await Repository<Reminder>().Entities.Include(x => x.Note)
                .FirstOrDefaultAsync(x => x.Id == id && x.Note != null && x.Note.UserId == UserId && x.Note.DeletedTime == null)
                ?? throw DomainErrors.NotFound("Reminder");
            foreach (var n in await Repository<Notification>().Entities.Where(x => x.ReminderId == id).ToListAsync()) await Repository<Notification>().DeleteAsync(n);
            foreach (var d in await Repository<ReminderDelivery>().Entities.Where(x => x.ReminderId == id).ToListAsync()) await Repository<ReminderDelivery>().DeleteAsync(d);
            await Repository<Reminder>().DeleteAsync(r); await UnitOfWork.SaveAsync(); return true;
        });
    }
}
