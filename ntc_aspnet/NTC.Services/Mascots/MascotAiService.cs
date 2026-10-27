using System.Buffers.Binary;
using System.Globalization;
using Microsoft.Extensions.Options;
using NTC.Contract.Repositories;
using NTC.Contract.Repositories.Entities.Tasks;
using NTC.Contract.Repositories.IUOW;
using NTC.Contract.Services.Interface;
using NTC.Core.Base;
using NTC.Core.Security;
using NTC.ModelViews.Mascots;
using NTC.Services.Shared;
namespace NTC.Services.Mascots;

public sealed class MascotAiService(IUnitOfWork uow, ICurrentUser actor, TimeProvider clock,
    IMascotGenerationStore store, IOptions<MascotAiOptions> options) : BaseService(uow, actor, clock), IMascotAiService
{
    private string Today => UtcNow.ToString("yyyyMMdd", CultureInfo.InvariantCulture);
    private static MascotJobView View(MascotGeneration item) => new(item.Id, item.State, item.CreatedAt, item.ErrorCode);
    public async Task<MascotAiStatus> StatusAsync(CancellationToken token)
    {
        var userId = UserId;
        if (!options.Value.Available)
        {
            var existing = await store.OptionalSlotAsync(userId, token);
            return new(false, 1, NextReset(), false, false, null, existing is null ? null : View(existing));
        }
        var latest = await store.LatestAsync(userId, token);
        var slot = await store.CurrentSlotAsync(userId, token);
        var view = latest is null ? null : View(latest);
        if (view is not null && view.State != "applied" && latest!.CreatedAt < UtcNow.AddDays(-7)) view = view with { State = "expired" };
        var dailyAvailable = latest?.QuotaDay != Today;
        var pending = latest?.State is "queued" or "running";
        return new(true, 1, NextReset(), dailyAvailable && !pending && slot is null, dailyAvailable && !pending && slot is not null && slot.State is not ("queued" or "running"), view, slot is null ? null : View(slot));
    }
    private DateTimeOffset NextReset() => new(UtcNow.UtcDateTime.Date.AddDays(1), TimeSpan.Zero);
    public async Task<MascotJobView> CreateAsync(CreateMascotRequest request, CancellationToken token)
    {
        var userId = UserId;
        if (!options.Value.Available) throw new BaseException.ErrorException(503, "AI_NOT_CONFIGURED", "Mascot AI is not available yet.");
        if (!request.ConsentToSendToOpenAi) throw DomainErrors.Invalid("Confirm sending your description and reference image to OpenAI.");
        if (request.RequestId == Guid.Empty) throw DomainErrors.Invalid("A request identifier is required.");
        var description = (request.Description ?? "").Trim();
        if (description.Length > 1000 || (description.Length == 0 && request.ReferencePngBase64 is null))
            throw DomainErrors.Invalid("Describe a character or choose a reference image.");
        byte[]? reference = null;
        if (request.ReferencePngBase64 is not null)
        {
            if (request.ReferencePngBase64.Length > 2_800_000) throw DomainErrors.Invalid("The reference image is too large.");
            try { reference = Convert.FromBase64String(request.ReferencePngBase64); }
            catch (FormatException) { throw DomainErrors.Invalid("The reference image is invalid."); }
            if (!ValidPng(reference, 2 * 1024 * 1024, 2048)) throw DomainErrors.Invalid("Choose a PNG reference image up to 2 MB and 2048 pixels.");
        }
        var latest = await store.LatestAsync(userId, token);
        if (latest?.RequestId == request.RequestId) return View(latest);
        if (latest?.QuotaDay == Today) throw DailyLimit();
        if (latest?.State is "queued" or "running") throw DomainErrors.Conflict("Your mascot is still being created.");
        var slot = await store.CurrentSlotAsync(userId, token);
        if ((slot is not null && request.ReplacesId != slot.Id) || (slot is null && request.ReplacesId is not null))
            throw DomainErrors.Conflict("Each account has one custom mascot. Edit or delete your current mascot first.");
        if (slot is not null && slot.State is "queued" or "running") throw DomainErrors.Conflict("Your mascot is still being created.");
        if (reference is null && slot is not null)
        {
            var previous = await store.OwnedAsync(userId, slot.Id, token);
            reference = previous?.SavedDirectionsWebp ?? previous?.DirectionsPng;
        }
        var item = new MascotGeneration { UserId = userId, RequestId = request.RequestId, QuotaDay = Today,
            CreatedAt = UtcNow, Description = description, ReferenceImage = reference, ReplacesId = request.ReplacesId, OccupiesSlot = slot is null };
        if (!await store.ReserveAsync(item, token))
        {
            latest = await store.LatestAsync(userId, token);
            if (latest?.RequestId == request.RequestId) return View(latest);
            if (latest?.QuotaDay == Today) throw DailyLimit();
            throw DomainErrors.Conflict("Each account has one custom mascot. Edit or delete your current mascot first.");
        }
        return View(item);
    }
    private static BaseException.ErrorException DailyLimit() => new(429, "MASCOT_DAILY_LIMIT", "You have used today's mascot creation. Please try after the next reset.");
    public async Task ApplyAsync(Guid id, ApplyMascotRequest request, CancellationToken token)
    {
        var userId = UserId;
        _ = await store.OwnedAsync(userId, id, token) ?? throw DomainErrors.NotFound("Mascot");
        byte[] Decode(string value)
        {
            byte[] bytes;
            try { bytes = Convert.FromBase64String(value); } catch (FormatException) { throw DomainErrors.Invalid("The mascot image is invalid."); }
            if (bytes.Length is < 20 or > 600_000 || !bytes.AsSpan(0, 4).SequenceEqual("RIFF"u8) || !bytes.AsSpan(8, 4).SequenceEqual("WEBP"u8))
                throw DomainErrors.Invalid("The mascot image is invalid.");
            return bytes;
        }
        if (!await store.ApplyAsync(userId, id, Decode(request.DirectionsWebpBase64), Decode(request.ReactionsWebpBase64), UtcNow, token))
            throw DomainErrors.Conflict("Your custom mascot changed. Reload before applying this result.");
    }
    public async Task DeleteAsync(Guid id, CancellationToken token)
    {
        var job = await store.OwnedAsync(UserId, id, token) ?? throw DomainErrors.NotFound("Mascot");
        if (job.OccupiesSlot) await store.DeleteSlotAsync(UserId, id, token);
    }
    public async Task<SavedMascotResult> SavedAsync(CancellationToken token)
    {
        var slot = await store.CurrentSlotAsync(UserId, token) ?? throw DomainErrors.NotFound("Mascot");
        var job = await store.OwnedAsync(UserId, slot.Id, token) ?? throw DomainErrors.NotFound("Mascot");
        if (job.State != "applied" || job.SavedDirectionsWebp is null || job.SavedReactionsWebp is null)
            throw DomainErrors.Conflict("The mascot is not ready for preview.");
        return new(job.Id, Convert.ToBase64String(job.SavedDirectionsWebp), Convert.ToBase64String(job.SavedReactionsWebp));
    }
    public async Task<MascotAiResult> ResultAsync(Guid id, CancellationToken token)
    {
        var userId = UserId;
        if (!options.Value.Available) throw new BaseException.ErrorException(503, "AI_NOT_CONFIGURED", "Mascot AI is not available yet.");
        var item = await store.OwnedAsync(userId, id, token) ?? throw DomainErrors.NotFound("Mascot");
        if (item.State != "ready" || item.CreatedAt < UtcNow.AddDays(-7) || item.DirectionsPng is null || item.ReactionsPng is null)
            throw DomainErrors.Conflict("The mascot is not ready for preview.");
        return new(Convert.ToBase64String(item.DirectionsPng), Convert.ToBase64String(item.ReactionsPng));
    }
    public static bool ValidPng(byte[] bytes, int maxBytes, int maxDimension) => bytes.Length is >= 33 && bytes.Length <= maxBytes
        && bytes.AsSpan(0, 8).SequenceEqual(new byte[] { 137, 80, 78, 71, 13, 10, 26, 10 })
        && bytes.AsSpan(12, 4).SequenceEqual("IHDR"u8)
        && BinaryPrimitives.ReadUInt32BigEndian(bytes.AsSpan(16, 4)) is > 0 && BinaryPrimitives.ReadUInt32BigEndian(bytes.AsSpan(16, 4)) <= maxDimension
        && BinaryPrimitives.ReadUInt32BigEndian(bytes.AsSpan(20, 4)) is > 0 && BinaryPrimitives.ReadUInt32BigEndian(bytes.AsSpan(20, 4)) <= maxDimension;
}
