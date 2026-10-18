using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NTC.Contract.Services.Interface;
using NTC.Core.Base;
using NTC.Core.Store;
using NTC.ModelViews.UserInfoModelView;


namespace NTC.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    //[Authorize(Roles = "User")]
    public class UserInfoController : NTC.API.Controllers.Shared.BaseApiController
    {
        private readonly IUserInfoService _userInfoService;

        public UserInfoController(IUserInfoService userInfoService)
        {
            _userInfoService = userInfoService;
        }


        /// <summary>
        /// Retrieves all user information with pagination
        /// </summary>
        [HttpGet("get-all")]
        [ProducesResponseType(typeof(NTC.Core.Base.BaseResponse<BasePaginatedList<UserInfoResponseModelView>>), 200)]
        public async Task<IActionResult> GetAll(int pageNumber = 1, int pageSize = 5)
        {
            BasePaginatedList<UserInfoResponseModelView> result = await _userInfoService.GetAllAsync(pageNumber, pageSize);
            return Ok(new BaseResponse<BasePaginatedList<UserInfoResponseModelView>>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result
            ));
        }

        /// <summary>
        /// Retrieves user information by ID
        /// </summary>
        [HttpGet("get-by-id/{id}")]
        [ProducesResponseType(typeof(NTC.Core.Base.BaseResponse<UserInfoResponseModelView>), 200)]
        public async Task<IActionResult> GetById(Guid id)
        {
            UserInfoResponseModelView result = await _userInfoService.GetByIdAsync(id);

            return Ok(new BaseResponse<UserInfoResponseModelView>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result
            ));
        }

        /// <summary>
        /// Creates new user information
        /// </summary>
        [HttpPost("create")]
        [ProducesResponseType(typeof(NTC.Core.Base.BaseResponse<string>), 200)]
        public async Task<IActionResult> Create([FromBody] CreateUserInfoModelView model)
        {
            await _userInfoService.CreateAsync(model);
            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "User Information created successfully!"
            ));
        }


        /// <summary>
        /// Updates user information
        /// </summary>
        [HttpPut("update")]
        [ProducesResponseType(typeof(NTC.Core.Base.BaseResponse<string>), 200)]
        public async Task<IActionResult> Update([FromBody] UpdateUserInfoModelView model)
        {
            await _userInfoService.UpdateAsync(model);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "User Information updated successfully!"
            ));
        }
        /// <summary>
        /// Updates the user's name
        /// </summary>
        [HttpPut("update-name")]
        [ProducesResponseType(typeof(NTC.Core.Base.BaseResponse<string>), 200)]
        public async Task<IActionResult> UpdateName([FromBody] UpdateNameModelView model)
        {
            await _userInfoService.UpdateNameAsync(model);
            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Name updated successfully!"
            ));
        }
        /// <summary>
        /// Updates the user's gender
        /// </summary>
        [HttpPut("update-gender")]
        [ProducesResponseType(typeof(NTC.Core.Base.BaseResponse<string>), 200)]
        public async Task<IActionResult> UpdateGender([FromBody] UpdateGenderModelView model)
        {
            await _userInfoService.UpdateGenderAsync(model);
            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Gender updated successfully!"
            ));
        }
        /// <summary>
        /// Updates the user's birthday
        /// </summary>
        [HttpPut("update-birthday")]
        [ProducesResponseType(typeof(NTC.Core.Base.BaseResponse<string>), 200)]
        public async Task<IActionResult> UpdateBirthday([FromBody] UpdateBirthdayModelView model)
        {
            await _userInfoService.UpdateBirthdayAsync(model);
            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Birthday updated successfully!"
            ));
        }

    }
}
