using NTC.Contract.Repositories.Entities.Tasks;
using NTC.Services.Notes;
namespace NTC.Tests.Unit;
public sealed class ReminderScheduleTests
{
    [Fact]
    public void Monthly_recurrence_keeps_the_original_day_after_a_short_month()
    {
        var r=new Reminder {ReminderAt=DateTimeOffset.Parse("2026-01-31T09:00:00+07:00"),TimeZoneId="Asia/Ho_Chi_Minh",RepeatType=RepeatType.Monthly};
        Assert.Equal(DateTimeOffset.Parse("2026-02-28T02:00:00Z"),ReminderSchedule.Occurrence(r,1));
        Assert.Equal(DateTimeOffset.Parse("2026-03-31T02:00:00Z"),ReminderSchedule.Occurrence(r,2));
    }
    [Fact]
    public void Yearly_leap_day_returns_to_february_29_in_a_leap_year()
    {
        var r=new Reminder {ReminderAt=DateTimeOffset.Parse("2024-02-29T09:00:00Z"),TimeZoneId="UTC",RepeatType=RepeatType.Yearly};
        Assert.Equal(DateTimeOffset.Parse("2025-02-28T09:00:00Z"),ReminderSchedule.Occurrence(r,1));
        Assert.Equal(DateTimeOffset.Parse("2028-02-29T09:00:00Z"),ReminderSchedule.Occurrence(r,4));
    }
    [Fact]
    public void Weekly_flags_and_interval_are_anchored_to_the_start_week()
    {
        var r=new Reminder {ReminderAt=DateTimeOffset.Parse("2026-10-12T09:00:00Z"),TimeZoneId="UTC",RepeatType=RepeatType.Weekly,RepeatDays=WeekDays.Monday|WeekDays.Friday,RepeatInterval=2};
        ReminderSchedule.Validate(r);
        Assert.Equal(DateTimeOffset.Parse("2026-10-16T09:00:00Z"),ReminderSchedule.Occurrence(r,1));
        Assert.Equal(DateTimeOffset.Parse("2026-10-26T09:00:00Z"),ReminderSchedule.Occurrence(r,2));
    }
    [Fact]
    public void Nonexistent_dst_time_moves_to_the_next_valid_time_and_ambiguous_time_occurs_once()
    {
        var r=new Reminder {ReminderAt=DateTimeOffset.Parse("2026-03-07T02:30:00-05:00"),TimeZoneId="America/New_York",RepeatType=RepeatType.Daily};
        Assert.Equal(DateTimeOffset.Parse("2026-03-08T07:00:00Z"),ReminderSchedule.Occurrence(r,1));
        r.ReminderAt=DateTimeOffset.Parse("2026-10-31T01:30:00-04:00");
        Assert.Equal(DateTimeOffset.Parse("2026-11-01T05:30:00Z"),ReminderSchedule.Occurrence(r,1));
    }
    [Fact]
    public void Count_and_until_bound_the_schedule_and_first_after_handles_long_downtime()
    {
        var r=new Reminder {ReminderAt=DateTimeOffset.Parse("2020-01-01T09:00:00Z"),TimeZoneId="UTC",RepeatType=RepeatType.Daily,RepeatCount=3};
        Assert.Null(ReminderSchedule.Occurrence(r,3));
        Assert.Equal(3,ReminderSchedule.FirstAfter(r,DateTimeOffset.Parse("2026-10-17T12:00:00Z")).Index);
        r.RepeatCount=null;r.RepeatUntil=DateTimeOffset.Parse("2020-01-02T09:00:00Z");Assert.Null(ReminderSchedule.Occurrence(r,2));
        r.RepeatUntil=null;var next=ReminderSchedule.FirstAfter(r,DateTimeOffset.Parse("2026-10-17T12:00:00Z"));
        Assert.Equal(DateTimeOffset.Parse("2026-10-18T09:00:00Z"),next.At);
    }
    [Fact]
    public void Invalid_recurrence_is_rejected()
    {
        var r=new Reminder {RepeatType=RepeatType.Weekly,RepeatDays=WeekDays.None};
        Assert.Throws<NTC.Core.Base.BaseException.ErrorException>(()=>ReminderSchedule.Validate(r));
        r.RepeatType=RepeatType.Daily;r.RepeatInterval=0;Assert.Throws<NTC.Core.Base.BaseException.ErrorException>(()=>ReminderSchedule.Validate(r));
    }
}
