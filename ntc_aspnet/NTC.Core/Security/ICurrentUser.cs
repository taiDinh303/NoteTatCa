namespace NTC.Core.Security;

public interface ICurrentUser
{
    bool IsAuthenticated { get; }
    Guid? UserId { get; }
    Guid? SessionId { get; }
    string Name { get; }
    bool IsInRole(string role);
}
