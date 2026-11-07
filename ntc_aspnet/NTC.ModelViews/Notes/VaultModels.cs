namespace NTC.ModelViews.Notes;
public sealed record VaultSecretRequest(string Kind, string Secret);
public sealed record VaultResetRequest(string Code, string Kind, string Secret);
public sealed record VaultNoteRequest(Guid Version, bool Hidden);
public sealed record VaultStatus(bool Configured, string? Kind, bool EmailVerified);
public sealed record VaultUnlock(string Token, DateTimeOffset ExpiresAt);
