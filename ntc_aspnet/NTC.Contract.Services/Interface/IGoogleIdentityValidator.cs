namespace NTC.Contract.Services.Interface;

public sealed record GoogleIdentity(string Subject, string Email, string? GivenName, string? FamilyName, string? Picture);
public interface IGoogleIdentityValidator { Task<GoogleIdentity> ValidateAsync(string idToken); }
