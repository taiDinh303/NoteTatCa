using System.ComponentModel.DataAnnotations;
namespace NTC.ModelViews.AuthModelView;
public sealed class RefreshRequest { [Required, MaxLength(512)] public string RefreshToken { get; set; } = string.Empty; }
public sealed class EmailRequest { [Required, EmailAddress, MaxLength(256)] public string Email { get; set; } = string.Empty; }
public sealed class ConfirmEmailRequest
{
    [Required, EmailAddress, MaxLength(256)] public string Email { get; set; } = string.Empty;
    [Required, RegularExpression("^[0-9]{6}$")] public string Code { get; set; } = string.Empty;
}
