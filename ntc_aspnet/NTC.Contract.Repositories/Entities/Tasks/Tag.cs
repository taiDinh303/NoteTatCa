using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using NTC.Core.Base;

namespace NTC.Contract.Repositories.Entities
{
    public class Tag : BaseEntity
    {
        // Owner
        public Guid UserId { get; set; }

        [ForeignKey(nameof(UserId))]
        public virtual ApplicationUser? User { get; set; }

        [Required]
        [MaxLength(50)]
        public string Name { get; set; } = string.Empty;

        public string? Color { get; set; }
        public string? Icon { get; set; }

        // Navigation
        public virtual ICollection<NoteTag> NoteTags { get; set; } = new HashSet<NoteTag>();


    }

}
