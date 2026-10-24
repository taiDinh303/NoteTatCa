using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using NTC.Contract.Repositories.Entities;
using NTC.Contract.Repositories.Entities.Identity;
using NTC.Contract.Repositories.Entities.Tasks;
using NTC.Contract.Repositories.IUOW;
using NTC.Contract.Services.Interface;
using NTC.Services.Notes;
namespace NTC.Services.Jobs;

public sealed class BackgroundMaintenanceService(IUnitOfWork unitOfWork, TimeProvider clock, IEmailSender email,
    IConfiguration config, ILogger<BackgroundMaintenanceService> logger) : IBackgroundMaintenanceService
{
    public async Task<int> DispatchRemindersAsync(CancellationToken cancellationToken = default)
    {
        var now = clock.GetUtcNow(); var count = 0;
        var ids = await unitOfWork.GetRepository<Reminder>().Entities.AsNoTracking()
            .Where(x => x.IsActive && x.DeletedTime == null && (x.NextOccurrenceAt <= now || x.NextOccurrenceAt == null && x.OccurrencesProcessed == 0))
            .OrderBy(x => x.NextOccurrenceAt).Select(x => x.Id).Take(100).ToListAsync(cancellationToken);
        foreach (var id in ids)
        {
            cancellationToken.ThrowIfCancellationRequested();
            await unitOfWork.BeginTransactionAsync();
            try
            {
                var r = await unitOfWork.GetRepository<Reminder>().Entities.Include(x => x.Note).ThenInclude(x => x!.User).FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
                if (r?.Note?.User == null || !r.IsActive || r.DeletedTime != null) { await unitOfWork.CommitTransactionAsync(); continue; }
                var future = ReminderSchedule.FirstAfter(r, now);
                var latestIndex = future.Index - 1;
                var latest = latestIndex >= r.OccurrencesProcessed ? ReminderSchedule.Occurrence(r, latestIndex) : null;
                var user = r.Note.User;
                if (r.Note.DeletedTime == null && !user.IsLocked && user.DeletedTime == null && latest >= now.AddHours(-24) && latest <= now)
                {
                    var occurrence = latest!.Value;
                    if (!await unitOfWork.GetRepository<Notification>().Entities.AnyAsync(x => x.ReminderId == id && x.OccurrenceAt == occurrence, cancellationToken))
                    {
                        await unitOfWork.GetRepository<Notification>().InsertAsync(new() { UserId = r.Note.UserId, NoteId = r.NoteId, ReminderId = id, OccurrenceAt = occurrence });
                        if (r.SendEmail) await unitOfWork.GetRepository<ReminderDelivery>().InsertAsync(new()
                        { UserId = r.Note.UserId, NoteId = r.NoteId, ReminderId = id, OccurrenceAt = occurrence, NextAttemptAt = now });
                        count++;
                    }
                }
                r.OccurrencesProcessed = Math.Max(r.OccurrencesProcessed, future.Index); r.NextOccurrenceAt = future.At;
                if (future.At == null) r.IsActive = false;
                await unitOfWork.SaveAsync(); await unitOfWork.CommitTransactionAsync();
            }
            catch (DbUpdateConcurrencyException) { await unitOfWork.RollBackAsync(); }
            catch { await unitOfWork.RollBackAsync(); throw; }
        }
        return count;
    }
    public async Task<int> DeliverEmailsAsync(CancellationToken cancellationToken = default)
    {
        var now = clock.GetUtcNow(); var sent = 0;
        var ids = await unitOfWork.GetRepository<ReminderDelivery>().Entities.AsNoTracking()
            .Where(x => x.SentAt == null && !x.Abandoned && x.NextAttemptAt <= now && (x.LeaseUntil == null || x.LeaseUntil <= now))
            .OrderBy(x => x.NextAttemptAt).Select(x => x.Id).Take(100).ToListAsync(cancellationToken);
        foreach (var id in ids)
        {
            cancellationToken.ThrowIfCancellationRequested(); var leaseId = Guid.NewGuid(); ReminderDelivery? item = null; string? recipient = null;
            await unitOfWork.BeginTransactionAsync();
            try
            {
                item = await unitOfWork.GetRepository<ReminderDelivery>().Entities.FirstOrDefaultAsync(x => x.Id == id, cancellationToken);
                if (item == null || item.SentAt != null || item.Abandoned || item.LeaseUntil > now) { await unitOfWork.CommitTransactionAsync(); continue; }
                var note = await unitOfWork.GetRepository<Note>().Entities.AsNoTracking().Include(x => x.User).FirstOrDefaultAsync(x => x.Id == item.NoteId, cancellationToken);
                var reminder = await unitOfWork.GetRepository<Reminder>().Entities.AsNoTracking().FirstOrDefaultAsync(x => x.Id == item.ReminderId, cancellationToken);
                if (note?.User == null || note.DeletedTime != null || note.User.IsLocked || note.User.DeletedTime != null
                    || !note.User.EmailConfirmed || string.IsNullOrEmpty(note.User.Email) || reminder == null || reminder.DeletedTime != null || !reminder.SendEmail)
                { item.Abandoned = true; item.AbandonedAt = now; item.LastErrorCode = "PARENT_UNAVAILABLE"; item.LeaseId = null; item.LeaseUntil = null; await unitOfWork.SaveAsync(); await unitOfWork.CommitTransactionAsync(); continue; }
                // A crash on the final send must not restart an unlimited retry cycle.
                if (item.Attempts >= 5)
                { item.Abandoned = true; item.AbandonedAt = now; item.LastErrorCode = "RETRY_LIMIT_REACHED"; item.LeaseId = null; item.LeaseUntil = null; await unitOfWork.SaveAsync(); await unitOfWork.CommitTransactionAsync(); continue; }
                item.LeaseId = leaseId; item.LeaseUntil = now.AddMinutes(2); item.Attempts++; item.LastAttemptAt = now; recipient = note.User.Email;
                await unitOfWork.SaveAsync(); await unitOfWork.CommitTransactionAsync();
            }
            catch (DbUpdateConcurrencyException) { await unitOfWork.RollBackAsync(); continue; }
            catch { await unitOfWork.RollBackAsync(); throw; }
            try
            {
                var clientUrl = config["AppSettings:ClientUrl"]?.TrimEnd('/') ?? "";
                var link = System.Net.WebUtility.HtmlEncode($"{clientUrl}/notes/{item!.NoteId}");
                await email.SendEmailAsync(recipient!, "NoteTatCa reminder", $"<p>You have a note reminder.</p><p><a href=\"{link}\">Open NoteTatCa</a></p>");
                item.SentAt = clock.GetUtcNow(); item.LastErrorCode = null; sent++;
            }
            catch (Exception ex) when (!cancellationToken.IsCancellationRequested)
            {
                item!.LastErrorCode = ex is OperationCanceledException ? "EMAIL_TIMEOUT" : "EMAIL_SEND_FAILED"; item.Abandoned = item.Attempts >= 5;
                if (item.Abandoned) item.AbandonedAt = clock.GetUtcNow();
                item.NextAttemptAt = clock.GetUtcNow().AddMinutes(Math.Pow(2, Math.Min(item.Attempts, 5)));
                logger.LogWarning("Reminder email attempt failed for delivery {DeliveryId}; attempt {Attempt}", item.Id, item.Attempts);
            }
            item!.LeaseUntil = null; item.LeaseId = null;
            try { await unitOfWork.SaveAsync(); } catch (DbUpdateConcurrencyException) { unitOfWork.ClearTracking(); /* A cancellation or a newer lease owns this row. */ }
        }
        return sent;
    }
    public async Task<int> PurgeTrashAsync(CancellationToken cancellationToken = default)
    {
        var cutoff = clock.GetUtcNow().AddDays(-30); var count = 0;
        var ids = await unitOfWork.GetRepository<Note>().Entities.AsNoTracking().Where(x => x.DeletedTime <= cutoff)
            .OrderBy(x => x.DeletedTime).Select(x => x.Id).Take(100).ToListAsync(cancellationToken);
        foreach (var id in ids)
        {
            cancellationToken.ThrowIfCancellationRequested(); await unitOfWork.BeginTransactionAsync();
            try
            {
                var note = await unitOfWork.GetRepository<Note>().Entities.FirstOrDefaultAsync(x => x.Id == id && x.DeletedTime <= cutoff, cancellationToken);
                if (note != null) { await NoteGraph.DeleteAsync(unitOfWork, note); await unitOfWork.SaveAsync(); count++; }
                await unitOfWork.CommitTransactionAsync();
            }
            catch (DbUpdateConcurrencyException) { await unitOfWork.RollBackAsync(); }
            catch { await unitOfWork.RollBackAsync(); throw; }
        }
        return count;
    }
    public async Task<int> PruneIdentityStateAsync(CancellationToken cancellationToken = default)
    {
        var cutoff = clock.GetUtcNow().AddDays(-1);
        var revokedCutoff = clock.GetUtcNow().AddDays(-30);
        var sessions = await unitOfWork.GetRepository<RefreshSession>().Entities.Where(x => x.ExpiresAt < cutoff || x.RevokedAt < revokedCutoff).OrderBy(x => x.ExpiresAt).Take(500).ToListAsync(cancellationToken);
        var challenges = await unitOfWork.GetRepository<EmailChallenge>().Entities.Where(x => x.ExpiresAt < cutoff).OrderBy(x => x.ExpiresAt).Take(500).ToListAsync(cancellationToken);
        foreach (var session in sessions) await unitOfWork.GetRepository<RefreshSession>().DeleteAsync(session);
        foreach (var challenge in challenges) await unitOfWork.GetRepository<EmailChallenge>().DeleteAsync(challenge);
        await unitOfWork.SaveAsync(); return sessions.Count + challenges.Count;
    }
}
