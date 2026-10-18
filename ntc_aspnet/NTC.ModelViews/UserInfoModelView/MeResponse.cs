using System.ComponentModel.DataAnnotations;
using NTC.Contract.Repositories.Entities;

namespace NTC.ModelViews.UserInfoModelView;

public sealed record MeResponse(UserResponseModelView Account, UserInfoResponseModelView? Profile);
public sealed record LinkedLoginResponse(string Provider, string? DisplayName);
public sealed record LegacyLinkedLoginResponse(string LoginProvider, string? ProviderDisplayName);
public sealed class CreateProfileRequest
{
    [Required, MinLength(1), MaxLength(25)] public string GivenName { get; set; } = string.Empty;
    [MaxLength(25)] public string? FamilyName { get; set; }
    public DateTime? BirthDate { get; set; }
    public GenderType Gender { get; set; }
}
