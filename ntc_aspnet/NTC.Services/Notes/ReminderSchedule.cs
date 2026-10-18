using NTC.Contract.Repositories.Entities.Tasks;
using NTC.Core.Base;

namespace NTC.Services.Notes;

public static class ReminderSchedule
{
    public static TimeZoneInfo Zone(string? id)
    {
        try { return TimeZoneInfo.FindSystemTimeZoneById(id ?? "Asia/Ho_Chi_Minh"); }
        catch (TimeZoneNotFoundException) { throw DomainErrors.Invalid("Unknown time zone."); }
        catch (InvalidTimeZoneException) { throw DomainErrors.Invalid("Invalid time zone."); }
    }
    public static void Validate(Reminder reminder)
    {
        if (!Enum.IsDefined(reminder.RepeatType) || reminder.RepeatInterval is < 1 or > 365 || reminder.RepeatCount is <= 0 or > 100_000
            || reminder.RepeatUntil.HasValue && reminder.RepeatCount.HasValue || reminder.RepeatUntil < reminder.ReminderAt)
            throw DomainErrors.Invalid("Invalid recurrence interval or ending condition.");
        _ = Zone(reminder.TimeZoneId);
        if (reminder.RepeatType == RepeatType.Weekly)
        {
            var local = TimeZoneInfo.ConvertTime(reminder.ReminderAt, Zone(reminder.TimeZoneId));
            var day = 1 << (((int)local.DayOfWeek + 6) % 7);
            if (reminder.RepeatDays is null or WeekDays.None || ((int)reminder.RepeatDays.Value & ~127) != 0 || ((int)reminder.RepeatDays.Value & day) == 0)
                throw DomainErrors.Invalid("Weekly recurrence must include the start day and valid week days.");
        }
        else reminder.RepeatDays = null;
    }
    public static DateTimeOffset? Occurrence(Reminder r, int index)
    {
        if (index < 0 || r.RepeatCount.HasValue && index >= r.RepeatCount || r.RepeatType == RepeatType.None && index > 0) return null;
        var zone = Zone(r.TimeZoneId);
        var anchor = TimeZoneInfo.ConvertTime(r.ReminderAt, zone).DateTime;
        DateTime local;
        try
        {
            local = r.RepeatType switch
            {
                RepeatType.None => anchor,
                RepeatType.Daily => anchor.AddDays((long)index * r.RepeatInterval),
                RepeatType.Weekly => Weekly(anchor, r, index),
                RepeatType.Monthly => anchor.AddMonths(checked(index * r.RepeatInterval)),
                RepeatType.Yearly => anchor.AddYears(checked(index * r.RepeatInterval)),
                _ => throw DomainErrors.Invalid("Unknown recurrence type.")
            };
        }
        catch (ArgumentOutOfRangeException) { return null; }
        catch (OverflowException) { return null; }
        local = DateTime.SpecifyKind(local, DateTimeKind.Unspecified);
        while (zone.IsInvalidTime(local)) local = local.AddMinutes(1);
        var offset = zone.IsAmbiguousTime(local) ? zone.GetAmbiguousTimeOffsets(local).Max() : zone.GetUtcOffset(local);
        var instant = new DateTimeOffset(local, offset).ToUniversalTime();
        return r.RepeatUntil.HasValue && instant > r.RepeatUntil ? null : instant;
    }
    private static DateTime Weekly(DateTime anchor, Reminder r, int index)
    {
        var days = Enumerable.Range(0, 7).Where(x => (((int)(r.RepeatDays ?? 0)) & (1 << x)) != 0).ToArray();
        if (days.Length == 0) throw DomainErrors.Invalid("Weekly recurrence requires week days.");
        var anchorDay = ((int)anchor.DayOfWeek + 6) % 7;
        var first = days.Where(x => x >= anchorDay).ToArray();
        var monday = anchor.AddDays(-anchorDay);
        if (index < first.Length) return monday.AddDays(first[index]);
        var remaining = index - first.Length;
        return monday.AddDays((long)(remaining / days.Length + 1) * 7 * r.RepeatInterval + days[remaining % days.Length]);
    }
    public static (int Index, DateTimeOffset? At) FirstAfter(Reminder r, DateTimeOffset instant)
    {
        var low = 0; var high = 100_000;
        while (low < high)
        {
            var mid = low + (high - low) / 2; var value = Occurrence(r, mid);
            if (value.HasValue && value <= instant) low = mid + 1; else high = mid;
        }
        return (low, Occurrence(r, low));
    }
    public static void AdvancePast(Reminder r, DateTimeOffset now)
    {
        var next = FirstAfter(r, now); r.NextOccurrenceAt = next.At; r.OccurrencesProcessed = next.Index;
        if (next.At == null) r.IsActive = false;
    }
}
