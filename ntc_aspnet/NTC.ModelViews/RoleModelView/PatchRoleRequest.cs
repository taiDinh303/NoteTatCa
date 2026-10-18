using System.ComponentModel.DataAnnotations;
using NTC.ModelViews.Shared;

namespace NTC.ModelViews.RoleModelView;

public sealed class PatchRoleRequest : FieldPatchRequest
{
    private string? _name;
    private string? _description;
    [MaxLength(64)] public string? Name { get => _name; set => Set(ref _name, value); }
    [MaxLength(500)] public string? Description { get => _description; set => Set(ref _description, value); }
}
