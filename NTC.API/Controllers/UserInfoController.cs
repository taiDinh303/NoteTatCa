using Microsoft.AspNetCore.Mvc;
using NTC.Contract.Services.Interface;
using NTC.Core.Base;
using NTC.Core.Store;
using NTC.ModelViews.UserInfoModelView;


namespace NTC.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UserInfoController : ControllerBase
    {
        private readonly IUserInfoService _userInfoService;

        public UserInfoController(IUserInfoService userInfoService)
        {
            _userInfoService = userInfoService;
        }


        [HttpGet("get-all")]
        public async Task<IActionResult> GetAll(int pageNumber = 1, int pageSize = 5)
        {
            BasePaginatedList<UserInfoResponseModelView> result = await _userInfoService.GetAllAsync(pageNumber, pageSize);
            return Ok(new BaseResponse<BasePaginatedList<UserInfoResponseModelView>>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result
            ));
        }

        [HttpGet("get-by-id/{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            UserInfoResponseModelView result = await _userInfoService.GetByIdAsync(id);

            return Ok(new BaseResponse<UserInfoResponseModelView>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result
            ));
        }

        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateUserInfoModelView model)
        {
            await _userInfoService.CreateAsync(model);
            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "User Information created successfully!"
            ));
        }



        [HttpPut("update")]
        public async Task<IActionResult> Update([FromBody] UpdateUserInfoModelView model)
        {
            await _userInfoService.UpdateAsync(model);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "User Information updated successfully!"
            ));
        }

        [HttpPut("update-name")]
        public async Task<IActionResult> UpdateName([FromBody] UpdateNameModelView model)
        {
            await _userInfoService.UpdateNameAsync(model);
            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Name updated successfully!"
            ));
        }

        [HttpPut("update-gender")]
        public async Task<IActionResult> UpdateGender([FromBody] UpdateGenderModelView model)
        {
            await _userInfoService.UpdateGenderAsync(model);
            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Gender updated successfully!"
            ));
        }

        [HttpPut("update-birthday")]
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
