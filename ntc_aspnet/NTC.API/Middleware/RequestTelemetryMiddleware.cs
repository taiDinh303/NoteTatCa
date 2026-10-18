using System.Diagnostics;
namespace NTC.API.Middleware;
public sealed class RequestTelemetryMiddleware(RequestDelegate next, ILogger<RequestTelemetryMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var supplied = context.Request.Headers["X-Correlation-ID"].ToString();
        context.TraceIdentifier = supplied.Length is > 0 and <= 64 && supplied.All(c => char.IsAsciiLetterOrDigit(c) || c is '-' or '_' or '.')
            ? supplied : Guid.NewGuid().ToString("N");
        context.Response.OnStarting(() =>
        {
            context.Response.Headers["X-Correlation-ID"] = context.TraceIdentifier;
            if (context.Request.Path.StartsWithSegments("/api")) context.Response.Headers.CacheControl = "no-store";
            context.Response.Headers["X-Content-Type-Options"] = "nosniff";
            return Task.CompletedTask;
        });
        var start = Stopwatch.GetTimestamp();
        try { await next(context); }
        finally
        {
            logger.LogInformation("HTTP {Method} {Endpoint} {Status} {ElapsedMs}ms {TraceId}", context.Request.Method,
                context.GetEndpoint()?.DisplayName ?? "unmatched", context.Response.StatusCode,
                Stopwatch.GetElapsedTime(start).TotalMilliseconds, context.TraceIdentifier);
        }
    }
}
