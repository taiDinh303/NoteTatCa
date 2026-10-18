using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using NTC.Core.Security;

namespace NTC.Services.Security;

public sealed class HttpCurrentUser(IHttpContextAccessor accessor) : ICurrentUser
{
    private ClaimsPrincipal? Principal => accessor.HttpContext?.User;
    public bool IsAuthenticated => Principal?.Identity?.IsAuthenticated == true;
    public Guid? UserId => Guid.TryParse(Principal?.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? Principal?.FindFirstValue("sub"), out var id) ? id : null;
    public string Name => Principal?.Identity?.Name ?? "System";
    public Guid? SessionId => Guid.TryParse(Principal?.FindFirstValue("sid"), out var id) ? id : null;
    public bool IsInRole(string role) => Principal?.IsInRole(role) == true;
}
