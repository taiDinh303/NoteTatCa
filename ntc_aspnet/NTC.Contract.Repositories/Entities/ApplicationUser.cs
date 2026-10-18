using Microsoft.AspNetCore.Identity;
using NTC.Core.Utils;
using NTC.Core.Base;

namespace NTC.Contract.Repositories.Entities
{
    public class ApplicationUser : IdentityUser<Guid>, IAuditableEntity
    {
        public bool IsLocked { get; set; }
        public string TimeZoneId { get; set; } = "Asia/Ho_Chi_Minh";
        public string? CreatedBy { get; set; }
        public string? LastUpdatedBy { get; set; }
        public string? DeletedBy { get; set; }
        public DateTimeOffset CreatedTime { get; set; }
        public DateTimeOffset LastUpdatedTime { get; set; }
        public DateTimeOffset? DeletedTime { get; set; }
        public virtual UserInfo? UserInfo { get; set; }
        public ApplicationUser()
        {
            CreatedTime = CoreHelper.SystemTimeNow;
            LastUpdatedTime = CreatedTime;
        }
    }
}
