using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using NTC.Core.Utils;

namespace NTC.Core.Base
{
    public abstract class BaseEntity : IAuditableEntity
    {
        protected BaseEntity()
        {
            Id = Guid.NewGuid();
            CreatedTime = LastUpdatedTime = CoreHelper.SystemTimeNow;
        }

        [Key]
        public Guid Id { get; set; }
        public Guid Version { get; set; } = Guid.NewGuid();
        public string? CreatedBy { get; set; }
        public string? LastUpdatedBy { get; set; }
        public string? DeletedBy { get; set; }
        public DateTimeOffset CreatedTime { get; set; }
        public DateTimeOffset LastUpdatedTime { get; set; }
        public DateTimeOffset? DeletedTime { get; set; }
        [NotMapped]
        public bool PreserveImportedTimestamps { get; set; }
    }
}

