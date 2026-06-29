using Microsoft.AspNetCore.Mvc;
using NTC.Contract.Services.Interface;
using NTC.Core.Base;
using NTC.Core.Store;
using NTC.ModelViews.TagModelView;

namespace NTC.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    //[Authorize]
    public class TagController : ControllerBase
    {
        private readonly ITagService _tagService;

        public TagController(ITagService tagService)
        {
            _tagService = tagService;
        }

        #region Tag

        /// <summary>
        /// Retrieve all tags with pagination.
        /// </summary>
        [HttpGet("get-all")]
        public async Task<IActionResult> GetAll(int pageNumber = 1, int pageSize = 10)
        {
            BasePaginatedList<TagResponseModelView> result =
                await _tagService.GetAllAsync(pageNumber, pageSize);

            return Ok(new BaseResponse<BasePaginatedList<TagResponseModelView>>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result
            ));
        }

        /// <summary>
        /// Retrieve a tag by its ID.
        /// </summary>
        [HttpGet("get-by-id/{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            TagResponseModelView result =
                await _tagService.GetByIdAsync(id);

            return Ok(new BaseResponse<TagResponseModelView>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result
            ));
        }


        /// <summary>
        /// Create a new tag.
        /// </summary>
        [HttpPost("create")]
        public async Task<IActionResult> Create([FromBody] CreateTagModelView model)
        {
            var tag = await _tagService.CreateAsync(model);

            return Ok(new BaseResponse<TagResponseModelView>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: new TagResponseModelView
                {
                    Id = tag.Id,
                    Name = tag.Name,
                    Color = tag.Color
                }
            ));
        }

        /// <summary>
        /// Update an existing tag.
        /// </summary>
        [HttpPut("update")]
        public async Task<IActionResult> Update(
            [FromBody] UpdateTagModelView model)
        {
            await _tagService.UpdateAsync(model);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Update tag successfully!"
            ));
        }

        /// <summary>
        /// Soft delete a tag.
        /// </summary>
        [HttpDelete("soft-delete/{id}")]
        public async Task<IActionResult> SoftDelete(Guid id)
        {
            await _tagService.SoftDeleteAsync(id);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Tag soft deleted successfully!"
            ));
        }

        /// <summary>
        /// Permanently delete a tag.
        /// </summary>
        [HttpDelete("delete/{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            await _tagService.DeleteAsync(id);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Tag deleted successfully!"
            ));
        }

        #endregion
    }
}
