using Microsoft.AspNetCore.Mvc;
using NTC.Contract.Services.Interface;
using NTC.Core.Base;
using NTC.Core.Store;
using NTC.ModelViews.UserInfoModelView;
using NTC.ModelViews.UserModelView;

namespace NTC.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    //[Authorize]
    public class UserController : ControllerBase
    {
        private readonly IUserService _userService;

        public UserController(IUserService userService)
        {
            _userService = userService;
        }

        #region User
        [HttpGet("get-all")]
        public async Task<IActionResult> GetAll(int pageNumber = 1, int pageSize = 10)
        {
            BasePaginatedList<UserResponseModelView> result = await _userService.GetAllAsync(pageNumber, pageSize);
            return Ok(new BaseResponse<BasePaginatedList<UserResponseModelView>>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result
            ));
        }

        [HttpGet("get-by-id/{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            UserResponseModelView result = await _userService.GetByIdAsync(id);

            return Ok(new BaseResponse<UserResponseModelView>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result
            ));
        }

        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateUserModelView model)
        {
            await _userService.CreateAsync(model);
            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Create user successfully!"
            ));
        }


        [HttpPut("update")]
        public async Task<IActionResult> Update([FromBody] UpdateUserModelView model)
        {
            await _userService.UpdateAsync(model);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Update user successfully!"
            ));
        }


        [HttpDelete("soft-delete/{id}")]
        public async Task<IActionResult> SoftDelete(Guid id)
        {
            await _userService.SoftDeleteAsync(id);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "User soft deleted successfully!"
            ));
        }

        [HttpDelete("delete/{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            await _userService.DeleteAsync(id);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "User deleted successfully!"
            ));
        }
        #endregion



        #region Email
        [HttpPost("send-change-email")]
        public async Task<IActionResult> SendChangeEmail([FromBody] UpdateEmailModelView request)
        {
            await _userService.SendChangeEmailAsync(request);

            return Ok(new BaseResponse<string>(
                 statusCode: StatusCodeHelper.OK,
                 code: ResponseCodeConstants.SUCCESS,
                 data: "Confirmation email sent"
            ));
        }

        [HttpGet("confirm-change-email")]
        public async Task<IActionResult> ConfirmChangeEmail(Guid userId, string token, string newEmail)
        {
            await _userService.ConfirmChangeEmailAsync(userId, token, newEmail);

            return Ok(new BaseResponse<string>(
                 statusCode: StatusCodeHelper.OK,
                 code: ResponseCodeConstants.SUCCESS,
                 data: "Email changed successfully"
            ));
        }

        #endregion

        #region Password Management

        /// <summary>
        /// Gửi email để tạo mật khẩu cho tài khoản đăng nhập bằng Google
        /// </summary>
        [HttpPost("send-set-password-email/{userId}")]
        public async Task<IActionResult> SendSetPasswordEmail(Guid userId)
        {
            await _userService.SendSetPasswordLinkAsync(userId);

            return Ok(new BaseResponse<string>(
                StatusCodeHelper.OK,
                ResponseCodeConstants.SUCCESS,
                "Email tạo mật khẩu đã được gửi!"
            ));
        }

        /// <summary>
        /// Cập nhật (đặt) mật khẩu mới thông qua token được gửi qua email
        /// </summary>
        [HttpPost("set-password")]
        public async Task<IActionResult> SetPassword([FromBody] SetPasswordRequest model)
        {
            await _userService.SetPasswordAsync(model.UserId, model.Token, model.NewPassword);

            return Ok(new BaseResponse<string>(
                StatusCodeHelper.OK,
                ResponseCodeConstants.SUCCESS,
                "Tạo mật khẩu thành công!"
            ));
        }


        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordModelView model)
        {
            await _userService.ChangePasswordAsync(model.UserId, model.CurrentPassword, model.NewPassword);

            return Ok(new BaseResponse<string>(
                StatusCodeHelper.OK,
                ResponseCodeConstants.SUCCESS,
                "Password changed successfully!"
            ));
        }



        #endregion



    }
}
