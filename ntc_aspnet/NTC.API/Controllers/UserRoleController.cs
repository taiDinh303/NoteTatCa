using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NTC.Contract.Services.Interface;
using NTC.Core.Base;
using NTC.Core.Store;

namespace NTC.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin")]
    public class UserRoleController : NTC.API.Controllers.Shared.BaseApiController
    {
        private readonly IUserRoleService _userRoleService;

        public UserRoleController(IUserRoleService userRoleService)
        {
            _userRoleService = userRoleService;
        }
        /// <summary>
        /// Assigns a role to a user
        /// </summary>
        [HttpPost("add-role")]
        [ProducesResponseType(typeof(NTC.Core.Base.BaseResponse<string>), 200)]
        public async Task<IActionResult> AddRoleToUser(Guid UserId, Guid RoleId)
        {
            await _userRoleService.AddRoleToUserAsync(UserId, RoleId);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Role added to user successfully!"
            ));
        }
        /// <summary>
        /// Removes a role from a user
        /// </summary>
        [HttpDelete("remove-role")]
        [ProducesResponseType(typeof(NTC.Core.Base.BaseResponse<string>), 200)]
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
