namespace NTC.Contract.Repositories.Entities.Identity;
public sealed class NoteVault {
 public Guid UserId { get; set; }
 public Guid CredentialVersion { get; set; } = Guid.NewGuid();
 public string Kind { get; set; } = "pin";
 public string SecretHash { get; set; } = "";
 public int FailedAttempts { get; set; }
 public DateTimeOffset? LockedUntil { get; set; }
 public string? ResetHash { get; set; }
 public DateTimeOffset? ResetExpiresAt { get; set; }
 public DateTimeOffset? ResetSentAt { get; set; }
 public int ResetAttempts { get; set; }
 public Guid Version { get; set; } = Guid.NewGuid();
}
public sealed class NoteVaultGrant {
 public string TokenHash { get; set; } = "";
 public Guid UserId { get; set; }
 public Guid SessionId { get; set; }
 public Guid VaultVersion { get; set; }
 public DateTimeOffset ExpiresAt { get; set; }
}
