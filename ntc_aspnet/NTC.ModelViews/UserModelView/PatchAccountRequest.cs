using System.ComponentModel.DataAnnotations;
using NTC.ModelViews.Shared;

namespace NTC.ModelViews.UserModelView;

public sealed class PatchAccountRequest : FieldPatchRequest
{
    private string? _phoneNumber;
    [MaxLength(32)]
    public string? PhoneNumber { get => _phoneNumber; set => Set(ref _phoneNumber, value); }
}
