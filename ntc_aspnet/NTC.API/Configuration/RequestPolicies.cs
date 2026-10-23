using System.Globalization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.Mvc;
namespace NTC.API.Configuration;
public static class RequestPolicies
{
    public static void AddRequestPolicies(this IServiceCollection services, IConfiguration config)
    {
        services.AddControllers(options => options.Filters.Add<ResponseTraceFilter>()).ConfigureApiBehaviorOptions(options => options.InvalidModelStateResponseFactory = context =>
            new BadRequestObjectResult(new { statusCode = 400, code = "VALIDATION_ERROR", message = "Some fields are invalid.", data = (object?)null,
                errors = context.ModelState.Where(x => x.Value?.Errors.Count > 0).ToDictionary(x => x.Key, x => x.Value!.Errors.Select(e => string.IsNullOrEmpty(e.ErrorMessage) ? "Invalid value." : e.ErrorMessage).ToArray()),
                traceId = context.HttpContext.TraceIdentifier }));
        services.AddCors(options => options.AddPolicy("Clients", policy =>
        {
            var origins = config.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? ["https://localhost:5037", "http://localhost:5173"];
            if (origins.Any(x => x == "*" || !Uri.TryCreate(x, UriKind.Absolute, out var uri) || uri.Scheme is not ("http" or "https") || uri.AbsolutePath != "/"))
                throw new InvalidOperationException("CORS origins must be specific HTTP(S) origins.");
            policy.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod().WithExposedHeaders("X-Correlation-ID");
        }));
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = 429;
            options.AddPolicy("feedback", context => RateLimitPartition.GetFixedWindowLimiter(
                context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                    ?? context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                _ => new FixedWindowRateLimiterOptions { PermitLimit = 5, Window = TimeSpan.FromHours(1), QueueLimit = 0, AutoReplenishment = true }));
            options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
                RateLimitPartition.GetFixedWindowLimiter(context.User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                    ?? context.Connection.RemoteIpAddress?.ToString() ?? "unknown", _ => new FixedWindowRateLimiterOptions
                    { PermitLimit = Math.Clamp(config.GetValue<int?>("RateLimiting:ApiRequestsPerMinute") ?? 600, 1, 10_000),
                        Window = TimeSpan.FromMinutes(1), QueueLimit = 0, AutoReplenishment = true }));
            options.AddPolicy("auth", context => RateLimitPartition.GetFixedWindowLimiter(context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                _ => new FixedWindowRateLimiterOptions { PermitLimit = Math.Clamp(config.GetValue<int?>("RateLimiting:AuthRequestsPerMinute") ?? 20, 1, 1000),
                    Window = TimeSpan.FromMinutes(1), QueueLimit = 0, AutoReplenishment = true }));
            options.OnRejected = async (context, token) =>
            {
                if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retry))
                    context.HttpContext.Response.Headers.RetryAfter = Math.Ceiling(retry.TotalSeconds).ToString(CultureInfo.InvariantCulture);
                await context.HttpContext.Response.WriteAsJsonAsync(new { statusCode = 429, code = "RATE_LIMITED", message = "Too many requests. Try again later.", data = (object?)null,
                    traceId = context.HttpContext.TraceIdentifier }, token);
            };
        });
    }
}
