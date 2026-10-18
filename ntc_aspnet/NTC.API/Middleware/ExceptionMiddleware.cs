using Microsoft.EntityFrameworkCore;
using NTC.Core.Base;
namespace NTC.API.Middleware;
public sealed class ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try { await next(context); }
        catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested) { }
        catch (BaseException.ErrorException ex) { await Error(context, ex.StatusCode, ex.ErrorDetail.ErrorCode ?? "FAILED", ex.ErrorDetail.ErrorMessage); }
        catch (DbUpdateConcurrencyException) { await Error(context, 409, "CONFLICT", "The resource changed. Reload before saving."); }
        catch (Npgsql.PostgresException ex) when (ex.SqlState is "40001" or "40P01")
        { await Error(context, 409, "CONFLICT", "A concurrent operation conflicted. Retry with current data."); }
        catch (Microsoft.Data.SqlClient.SqlException ex) when (ex.Number == 1205)
        { await Error(context, 409, "CONFLICT", "A concurrent operation conflicted. Retry with current data."); }
        catch (DbUpdateException) { await Error(context, 409, "DATA_CONFLICT", "The operation conflicts with current data."); }
        catch (BadHttpRequestException ex) { await Error(context, ex.StatusCode, "INVALID_REQUEST", "Invalid request."); }
        catch (Exception ex)
        {
            logger.LogError("Unhandled API failure ({ExceptionType}) trace {TraceId}", ex.GetType().Name, context.TraceIdentifier);
            await Error(context, 500, "INTERNAL_SERVER_ERROR", "An unexpected error occurred.");
        }
    }
    private static Task Error(HttpContext context, int status, string code, object? message)
    {
        if (context.Response.HasStarted) return Task.CompletedTask;
        context.Response.StatusCode = status;
        return context.Response.WriteAsJsonAsync(new { statusCode = status, code, message, data = (object?)null, traceId = context.TraceIdentifier });
    }
}
