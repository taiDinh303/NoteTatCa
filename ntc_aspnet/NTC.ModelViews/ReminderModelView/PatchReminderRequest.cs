using System.ComponentModel.DataAnnotations;
using NTC.ModelViews.Shared;
using NTC.Contract.Repositories.Entities.Tasks;

namespace NTC.ModelViews.ReminderModelView;

public sealed class PatchReminderRequest : VersionedPatchRequest
{
    private DateTimeOffset? _reminderAt;
    public DateTimeOffset? ReminderAt { get => _reminderAt; set => Set(ref _reminderAt, value); }
    private string? _timeZoneId;
    [MaxLength(100)]
    public string? TimeZoneId { get => _timeZoneId; set => Set(ref _timeZoneId, value); }
    private bool? _sendEmail;
    public bool? SendEmail { get => _sendEmail; set => Set(ref _sendEmail, value); }
    private RepeatType? _repeatType;
    public RepeatType? RepeatType { get => _repeatType; set => Set(ref _repeatType, value); }
    private int? _repeatInterval;
    public int? RepeatInterval { get => _repeatInterval; set => Set(ref _repeatInterval, value); }
    private WeekDays? _repeatDays;
    public WeekDays? RepeatDays { get => _repeatDays; set => Set(ref _repeatDays, value); }
    private DateTimeOffset? _repeatUntil;
    public DateTimeOffset? RepeatUntil { get => _repeatUntil; set => Set(ref _repeatUntil, value); }
    private int? _repeatCount;
    public int? RepeatCount { get => _repeatCount; set => Set(ref _repeatCount, value); }
    private bool? _isActive;
    public bool? IsActive { get => _isActive; set => Set(ref _isActive, value); }
}
