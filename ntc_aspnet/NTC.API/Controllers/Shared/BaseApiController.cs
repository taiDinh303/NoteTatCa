using Microsoft.AspNetCore.Mvc;
using NTC.Core.Base;
using NTC.Core.Store;
namespace NTC.API.Controllers.Shared;
public abstract class BaseApiController : ControllerBase
{
    protected OkObjectResult Success<T>(T data, string? message = null) =>
        Ok(new BaseResponse<T>(StatusCodeHelper.OK, "SUCCESS", data, message) { TraceId = HttpContext.TraceIdentifier });
    protected ObjectResult CreatedResource<T>(string location, T data) =>
        Created(location, new BaseResponse<T>((StatusCodeHelper)201, "SUCCESS", data) { TraceId = HttpContext.TraceIdentifier });
}
