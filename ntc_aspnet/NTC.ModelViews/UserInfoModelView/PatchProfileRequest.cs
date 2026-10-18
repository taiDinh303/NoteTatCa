using System.ComponentModel.DataAnnotations;
using NTC.ModelViews.Shared;
using NTC.Contract.Repositories.Entities;

namespace NTC.ModelViews.UserInfoModelView;

public sealed class PatchProfileRequest : VersionedPatchRequest
{
    private string? _givenName;
    [MaxLength(25)]
    public string? GivenName { get => _givenName; set => Set(ref _givenName, value); }
    private string? _familyName;
    [MaxLength(25)]
    public string? FamilyName { get => _familyName; set => Set(ref _familyName, value); }
    private string? _picture;
    [MaxLength(2048)]
    public string? Picture { get => _picture; set => Set(ref _picture, value); }
    private string? _locale;
    [MaxLength(10)]
    public string? Locale { get => _locale; set => Set(ref _locale, value); }
    private string? _address;
    [MaxLength(500)]
    public string? Address { get => _address; set => Set(ref _address, value); }
    private string? _timeZoneId;
    [MaxLength(100)]
    public string? TimeZoneId { get => _timeZoneId; set => Set(ref _timeZoneId, value); }
    private DateTime? _birthDate;
    public DateTime? BirthDate { get => _birthDate; set => Set(ref _birthDate, value); }
    private GenderType? _gender;
    public GenderType? Gender { get => _gender; set => Set(ref _gender, value); }
}
