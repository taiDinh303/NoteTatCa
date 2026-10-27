using Microsoft.EntityFrameworkCore;
using NTC.Contract.Repositories;
using NTC.Contract.Repositories.Entities.Tasks;
using NTC.Repositories.Context;
namespace NTC.Repositories.Mascots;

public sealed class MascotGenerationStore(DatabaseContext db) : IMascotGenerationStore
{
    private IQueryable<MascotGeneration> Jobs => db.Set<MascotGeneration>().AsNoTracking();
    public Task<MascotGeneration?> LatestAsync(Guid userId, CancellationToken token) =>
        Jobs.Where(x => x.UserId == userId).OrderByDescending(x => x.CreatedAt)
            .Select(x => new MascotGeneration { Id = x.Id, UserId = x.UserId, RequestId = x.RequestId, QuotaDay = x.QuotaDay,
                State = x.State, OccupiesSlot = x.OccupiesSlot, ReplacesId = x.ReplacesId, CreatedAt = x.CreatedAt, StartedAt = x.StartedAt, FinishedAt = x.FinishedAt, ErrorCode = x.ErrorCode })
            .FirstOrDefaultAsync(token);
    public Task<MascotGeneration?> CurrentSlotAsync(Guid userId, CancellationToken token) =>
        Jobs.Where(x => x.UserId == userId && x.OccupiesSlot)
            .Select(x => new MascotGeneration { Id = x.Id, UserId = x.UserId, State = x.State, CreatedAt = x.CreatedAt, OccupiesSlot = true })
            .SingleOrDefaultAsync(token);
    public async Task<MascotGeneration?> OptionalSlotAsync(Guid userId, CancellationToken token)
    {
        try { return await CurrentSlotAsync(userId, token); }
        catch (Microsoft.Data.SqlClient.SqlException error) when (error.Number == 208) { return null; }
        catch (Npgsql.PostgresException error) when (error.SqlState == "42P01") { return null; }
    }
    public Task<MascotGeneration?> OwnedAsync(Guid userId, Guid id, CancellationToken token) =>
        Jobs.SingleOrDefaultAsync(x => x.UserId == userId && x.Id == id, token);
    public async Task<bool> ReserveAsync(MascotGeneration item, CancellationToken token)
    {
        db.Add(item);
        try { await db.SaveChangesAsync(token); db.Entry(item).State = EntityState.Detached; return true; }
        catch (DbUpdateException) when (!token.IsCancellationRequested)
        {
            db.Entry(item).State = EntityState.Detached;
            if (await Jobs.AnyAsync(x => x.UserId == item.UserId && (x.QuotaDay == item.QuotaDay || x.RequestId == item.RequestId || (item.OccupiesSlot && x.OccupiesSlot)), token)) return false;
            throw;
        }
    }
    public async Task<MascotGeneration?> ClaimAsync(DateTimeOffset now, CancellationToken token)
    {
        var next = await Jobs.Where(x => x.State == "queued").OrderBy(x => x.CreatedAt).FirstOrDefaultAsync(token);
        if (next is null) return null;
        var claimed = await db.Set<MascotGeneration>().Where(x => x.Id == next.Id && x.State == "queued")
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.State, "running").SetProperty(x => x.StartedAt, now), token);
        if (claimed != 1) return null;
        next.State = "running"; next.StartedAt = now; return next;
    }
    public Task CompleteAsync(Guid id, byte[] directions, byte[] reactions, DateTimeOffset now, CancellationToken token) =>
        db.Set<MascotGeneration>().Where(x => x.Id == id && x.State == "running")
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.State, "ready").SetProperty(x => x.FinishedAt, now)
                .SetProperty(x => x.DirectionsPng, directions).SetProperty(x => x.ReactionsPng, reactions)
                .SetProperty(x => x.ReferenceImage, (byte[]?)null).SetProperty(x => x.Description, ""), token);
    public Task FailAsync(Guid id, string code, DateTimeOffset now, CancellationToken token) =>
        db.Set<MascotGeneration>().Where(x => x.Id == id && x.State == "running")
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.State, "failed").SetProperty(x => x.ErrorCode, code)
                .SetProperty(x => x.FinishedAt, now).SetProperty(x => x.OccupiesSlot, false).SetProperty(x => x.ReferenceImage, (byte[]?)null).SetProperty(x => x.Description, ""), token);
    public async Task ExpireAsync(DateTimeOffset now, CancellationToken token)
    {
        await db.Set<MascotGeneration>().Where(x => x.State == "queued" && !db.Users.Any(u => u.Id == x.UserId && !u.IsLocked && u.DeletedTime == null && u.EmailConfirmed))
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.State, "failed").SetProperty(x => x.ErrorCode, "ACCOUNT_UNAVAILABLE")
                .SetProperty(x => x.FinishedAt, now).SetProperty(x => x.OccupiesSlot, false).SetProperty(x => x.ReferenceImage, (byte[]?)null).SetProperty(x => x.Description, ""), token);
        // An interrupted paid request is never retried automatically.
        await db.Set<MascotGeneration>().Where(x => x.State == "running" && x.StartedAt < now.AddMinutes(-12))
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.State, "failed").SetProperty(x => x.ErrorCode, "INTERRUPTED")
                .SetProperty(x => x.FinishedAt, now).SetProperty(x => x.OccupiesSlot, false).SetProperty(x => x.ReferenceImage, (byte[]?)null).SetProperty(x => x.Description, ""), token);
        await db.Set<MascotGeneration>().Where(x => x.CreatedAt < now.AddDays(-7) && x.State != "expired" && x.State != "applied")
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.State, "expired").SetProperty(x => x.ReferenceImage, (byte[]?)null)
                .SetProperty(x => x.DirectionsPng, (byte[]?)null).SetProperty(x => x.ReactionsPng, (byte[]?)null)
                .SetProperty(x => x.Description, ""), token);
        await db.Set<MascotGeneration>().Where(x => !x.OccupiesSlot && x.CreatedAt < now.AddDays(-30)).ExecuteDeleteAsync(token);
    }
    public async Task<bool> ApplyAsync(Guid userId, Guid id, byte[] directionsWebp, byte[] reactionsWebp, DateTimeOffset now, CancellationToken token)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(token);
        var job = await Jobs.SingleOrDefaultAsync(x => x.Id == id && x.UserId == userId, token);
        if (job is null) return false;
        if (job.State == "applied" && job.OccupiesSlot) return true;
        if (job.State != "ready" || job.CreatedAt < now.AddDays(-7)) return false;
        if (job.ReplacesId is { } previous)
        {
            var released = await db.Set<MascotGeneration>().Where(x => x.Id == previous && x.UserId == userId && x.OccupiesSlot)
                .ExecuteUpdateAsync(s => s.SetProperty(x => x.OccupiesSlot, false).SetProperty(x => x.State, "expired")
                    .SetProperty(x => x.DirectionsPng, (byte[]?)null).SetProperty(x => x.ReactionsPng, (byte[]?)null)
                    .SetProperty(x => x.SavedDirectionsWebp, (byte[]?)null).SetProperty(x => x.SavedReactionsWebp, (byte[]?)null), token);
            if (released != 1) return false;
        }
        else if (!job.OccupiesSlot) return false;
        var updated = await db.Set<MascotGeneration>().Where(x => x.Id == id && x.UserId == userId && x.State == "ready")
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.OccupiesSlot, true).SetProperty(x => x.State, "applied")
                .SetProperty(x => x.SavedDirectionsWebp, directionsWebp).SetProperty(x => x.SavedReactionsWebp, reactionsWebp)
                .SetProperty(x => x.DirectionsPng, (byte[]?)null).SetProperty(x => x.ReactionsPng, (byte[]?)null)
                .SetProperty(x => x.ReferenceImage, (byte[]?)null).SetProperty(x => x.Description, ""), token);
        if (updated != 1) return false;
        await transaction.CommitAsync(token); return true;
    }
    public async Task<bool> DeleteSlotAsync(Guid userId, Guid id, CancellationToken token)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(token);
        var changed = await db.Set<MascotGeneration>().Where(x => x.UserId == userId && x.Id == id && x.OccupiesSlot)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.OccupiesSlot, false).SetProperty(x => x.State, "expired")
                .SetProperty(x => x.DirectionsPng, (byte[]?)null).SetProperty(x => x.ReactionsPng, (byte[]?)null)
                .SetProperty(x => x.SavedDirectionsWebp, (byte[]?)null).SetProperty(x => x.SavedReactionsWebp, (byte[]?)null)
                .SetProperty(x => x.ReferenceImage, (byte[]?)null).SetProperty(x => x.Description, ""), token);
        if (changed != 1) return false;
        await db.Set<MascotGeneration>().Where(x => x.UserId == userId && x.ReplacesId == id && x.State != "applied")
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.State, "expired").SetProperty(x => x.ReferenceImage, (byte[]?)null)
                .SetProperty(x => x.DirectionsPng, (byte[]?)null).SetProperty(x => x.ReactionsPng, (byte[]?)null).SetProperty(x => x.Description, ""), token);
        await transaction.CommitAsync(token); return true;
    }
}
