using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using NTC.Core.Base;

namespace NTC.API.Configuration;

public sealed class ResponseTraceFilter : IResultFilter
{
    public void OnResultExecuting(ResultExecutingContext context)
    {
        if (context.Result is ObjectResult { Value: ITraceableResponse response })
            response.TraceId = context.HttpContext.TraceIdentifier;
    }

    public void OnResultExecuted(ResultExecutedContext context) { }
}
