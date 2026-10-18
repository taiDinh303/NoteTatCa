namespace NTC.Core.Base;

/// <summary>Shared audit metadata for domain entities and the separate Identity hierarchy.</summary>
public interface IAuditableEntity
{
    string? CreatedBy { get; set; }
    string? LastUpdatedBy { get; set; }
    string? DeletedBy { get; set; }
    DateTimeOffset CreatedTime { get; set; }
    DateTimeOffset LastUpdatedTime { get; set; }
    DateTimeOffset? DeletedTime { get; set; }
}
