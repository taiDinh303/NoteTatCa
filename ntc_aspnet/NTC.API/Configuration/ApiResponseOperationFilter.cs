using Microsoft.AspNetCore.Authorization;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;

namespace NTC.API.Configuration;

public sealed class ApiResponseOperationFilter : IOperationFilter
{
    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        if (!context.ApiDescription.RelativePath!.StartsWith("api/", StringComparison.Ordinal)) return;
        var schema = context.SchemaGenerator.GenerateSchema(typeof(ApiErrorResponse), context.SchemaRepository);
        var errors = new Dictionary<string, string>
        {
            ["400"] = "Invalid input or business rule violation",
            ["404"] = "Resource not found within the caller's scope",
            ["409"] = "Stale version or conflicting state",
            ["429"] = "Request limit exceeded; inspect Retry-After when present",
            ["500"] = "Unexpected server error; use traceId for support"
        };
        if (!context.ApiDescription.ActionDescriptor.EndpointMetadata.OfType<IAllowAnonymous>().Any())
        {
            errors["401"] = "Authentication required or session revoked";
            errors["403"] = "Insufficient permissions";
        }
        // Public sign-in/recovery endpoints may also reject invalid proof with 401.
        else errors["401"] = "Invalid credentials or proof";
        foreach (var (code, description) in errors)
            operation.Responses.TryAdd(code, new OpenApiResponse
            {
                Description = description,
                Content = new Dictionary<string, OpenApiMediaType> { ["application/json"] = new() { Schema = schema } }
            });
    }
}
