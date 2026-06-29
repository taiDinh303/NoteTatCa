using Microsoft.AspNetCore.Mvc;
using NTC.Contract.Services.Interface;
using NTC.Core.Base;
using NTC.Core.Store;

namespace NTC.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UserRoleController : ControllerBase
    {
        private readonly IUserRoleService _userRoleService;

        public UserRoleController(IUserRoleService userRoleService)
        {
            _userRoleService = userRoleService;
        }

        [HttpPost("add-role")]
        public async Task<IActionResult> AddRoleToUser(Guid UserId, Guid RoleId)
        {
            await _userRoleService.AddRoleToUserAsync(UserId, RoleId);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Role added to user successfully!"
            ));
        }

        [HttpDelete("remove-role")]
        public async Task<IActionResult> RemoveRoleFormUser(Guid UserId, Guid RoleId)
        {
            await _userRoleService.RemoveRoleFromUserAsync(UserId, RoleId);
            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Role removed from user successfully!"
            ));
        }



    }
}
