using Microsoft.AspNetCore.Identity;
using NTC.Core.Utils;
using NTC.Core.Base;

namespace NTC.Contract.Repositories.Entities
{
    public class ApplicationRole : IdentityRole<Guid>, IAuditableEntity
    {
        public string? CreatedBy { get; set; }
        public string? LastUpdatedBy { get; set; }
        public string? DeletedBy { get; set; }
        public DateTimeOffset CreatedTime { get; set; }
        public DateTimeOffset LastUpdatedTime { get; set; }
        public DateTimeOffset? DeletedTime { get; set; }
        public string? Description { get; set; }

        public ApplicationRole()
        {
            CreatedTime = CoreHelper.SystemTimeNow;
            LastUpdatedTime = CreatedTime;
        }
    }
}
