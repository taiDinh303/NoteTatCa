using System.ComponentModel.DataAnnotations;
using System.Runtime.CompilerServices;

namespace NTC.ModelViews.Shared;

/// <summary>Tracks JSON setters so omission differs from an explicit null in a typed PATCH.</summary>
public abstract class FieldPatchRequest
{
    private readonly HashSet<string> _provided = new(StringComparer.Ordinal);
    public bool Includes(string property) => _provided.Contains(property);
    protected void Set<T>(ref T field, T value, [CallerMemberName] string property = "")
    { field = value; _provided.Add(property); }
}

public abstract class VersionedPatchRequest : FieldPatchRequest
{
    [Required] public Guid Version { get; set; }
}
