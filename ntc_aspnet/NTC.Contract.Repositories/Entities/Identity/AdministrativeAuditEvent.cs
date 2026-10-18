namespace NTC.Contract.Repositories.Entities.Identity;

/// <summary>Append-only administrative metadata. Never stores note content, email or tokens.</summary>
public sealed class AdministrativeAuditEvent
{
    public Guid Id { get; set; } = Guid.NewGuid();
    // Null actor means an explicit operator CLI operation, not an anonymous API action.
    public Guid? ActorUserId { get; set; }
    public Guid? TargetUserId { get; set; }
    // Kept as a historical identifier so deleting a custom role does not delete its audit.
    public Guid? RoleId { get; set; }
    public AdministrativeAction Action { get; set; }
    public DateTimeOffset OccurredAt { get; set; }
}

public enum AdministrativeAction
{
    AccountLocked = 1,
    AccountUnlocked = 2,
    AccountCreated = 3,
    AccountDeactivated = 4,
    RoleGranted = 5,
    RoleRevoked = 6,
    RoleCreated = 7,
    RoleUpdated = 8,
    RoleDeactivated = 9,
    RoleDeleted = 10,
    BootstrapAdministratorGranted = 11,
    AccountReactivated = 12
}
