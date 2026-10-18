namespace NTC.Contract.Repositories.Entities.Identity;

public sealed class EmailChallenge
{
    public string Email { get; set; } = string.Empty;
    public string CodeHash { get; set; } = string.Empty;
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset LastSentAt { get; set; }
    public int Attempts { get; set; }
    public Guid Version { get; set; } = Guid.NewGuid();
}
