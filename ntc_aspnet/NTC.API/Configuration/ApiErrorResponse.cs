namespace NTC.API.Configuration;

// Shared shape emitted by model validation, authentication, rate limiting and exception handling.
public sealed record ApiErrorResponse(int StatusCode, string Code, string Message, object? Data,
    string TraceId, Dictionary<string, string[]>? Errors = null);
