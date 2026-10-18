using System.ComponentModel.DataAnnotations;
using NTC.ModelViews.Shared;

namespace NTC.ModelViews.TagModelView;

public sealed class PatchTagRequest : VersionedPatchRequest
{
    private string? _name;
    [MaxLength(50)]
    public string? Name { get => _name; set => Set(ref _name, value); }
    private string? _color;
    [MaxLength(20)]
    public string? Color { get => _color; set => Set(ref _color, value); }
    private string? _icon;
    [MaxLength(50)]
    public string? Icon { get => _icon; set => Set(ref _icon, value); }
}
