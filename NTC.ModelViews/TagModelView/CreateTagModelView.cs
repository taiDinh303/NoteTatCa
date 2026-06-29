using System.ComponentModel.DataAnnotations;

namespace NTC.ModelViews.TagModelView
{
    public class CreateTagModelView
    {
        [Required]
        [MaxLength(50)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(20)]
        public string? Color { get; set; }

        [MaxLength(50)]
        public string? Icon { get; set; }
    }
}
