using System.ComponentModel.DataAnnotations.Schema;
using NTC.Contract.Repositories.Entities;

namespace NTC.ModelViews.AuthModelView
{
    public class AuthResponseModelView
    {
        public string RefreshToken { get; set; } = string.Empty;
        public DateTimeOffset RefreshExpiresAt { get; set; }
        public string TimeZoneId { get; set; } = "Asia/Ho_Chi_Minh";
        public string[] Roles { get; set; } = Array.Empty<string>();
        public string Token { get; set; } = string.Empty;
        public DateTime ExpiredAt { get; set; }

        //UserInfo
        public Guid UserId { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string? FamilyName { get; set; }
        public string GivenName { get; set; } = string.Empty;
        public string? Picture { get; set; }
        public DateTime? BirthDate { get; set; }
        public GenderType Gender { get; set; }

        [NotMapped]
        public string FullName => string.IsNullOrWhiteSpace(FamilyName) ? GivenName : $"{GivenName} {FamilyName}";
    }
}
