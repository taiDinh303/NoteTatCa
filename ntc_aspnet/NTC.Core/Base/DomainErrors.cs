using static NTC.Core.Base.BaseException;

namespace NTC.Core.Base;

public static class DomainErrors
{
    public static ErrorException NotFound(string resource = "Resource") => new(404, "NOT_FOUND", $"{resource} not found.");
    public static ErrorException Invalid(string message) => new(400, "VALIDATION_ERROR", message);
    public static ErrorException Conflict(string message = "The resource changed. Reload before saving.") => new(409, "CONFLICT", message);
    public static ErrorException Unauthorized() => new(401, "UNAUTHORIZED", "Authentication required.");
    public static ErrorException Forbidden() => new(403, "FORBIDDEN", "Access denied.");
}
