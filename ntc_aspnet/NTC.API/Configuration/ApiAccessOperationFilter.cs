using Microsoft.AspNetCore.Authorization;
using Microsoft.OpenApi.Any;
using Microsoft.OpenApi.Models;
using Swashbuckle.AspNetCore.SwaggerGen;
namespace NTC.API.Configuration;
public sealed class ApiAccessOperationFilter : IOperationFilter
{
    public void Apply(OpenApiOperation operation, OperationFilterContext context)
    {
        var metadata=context.ApiDescription.ActionDescriptor.EndpointMetadata;
        if(metadata.OfType<IAllowAnonymous>().Any())
        { operation.Security=[]; operation.Extensions["x-ntc-access"]=new OpenApiString("anonymous"); return; }
        var roles=metadata.OfType<IAuthorizeData>().Select(x=>x.Roles).Where(x=>!string.IsNullOrWhiteSpace(x)).ToArray();
        var workspace=metadata.OfType<IAuthorizeData>().Any(x=>x.Policy==AuthConfiguration.WorkspacePolicy);
        operation.Security=[new OpenApiSecurityRequirement { { new OpenApiSecurityScheme { Reference=new OpenApiReference { Type=ReferenceType.SecurityScheme,Id="Bearer" } },Array.Empty<string>() } }];
        operation.Extensions["x-ntc-access"]=new OpenApiString(workspace?"authenticated non-Admin; server ownership rules apply":roles.Length>0?string.Join("; ",roles!):"authenticated; server ownership rules apply");
    }
}
