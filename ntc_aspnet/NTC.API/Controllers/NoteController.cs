using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NTC.Contract.Services.Interface;
using NTC.Core.Base;
using NTC.Core.Store;
using NTC.ModelViews.NoteModelView;

namespace NTC.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    //[Authorize(Roles = "Admin,User")]
    public class NoteController : NTC.API.Controllers.Shared.BaseApiController
    {
        private readonly INoteService _noteService;

        public NoteController(INoteService noteService)
        {
            _noteService = noteService;
        }

        #region Note

        /// <summary>
        /// Retrieve all notes with pagination
        /// </summary>
        [HttpGet("get-all")]
        [ProducesResponseType(typeof(NTC.Core.Base.BaseResponse<BasePaginatedList<NoteResponseModelView>>), 200)]
        public async Task<IActionResult> GetAll(int pageNumber = 1, int pageSize = 10)
        {
            BasePaginatedList<NoteResponseModelView> result = await _noteService.GetAllAsync(pageNumber, pageSize);

            return Ok(new BaseResponse<BasePaginatedList<NoteResponseModelView>>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result
            ));
        }

        /// <summary>
        /// Retrieve all notes in trash with pagination
        /// </summary>
        [HttpGet("get-trash")]
        [ProducesResponseType(typeof(NTC.Core.Base.BaseResponse<BasePaginatedList<NoteResponseModelView>>), 200)]
        public async Task<IActionResult> GetTrash(int pageNumber = 1, int pageSize = 10)
        {
            BasePaginatedList<NoteResponseModelView> result = await _noteService.GetTrashAsync(pageNumber, pageSize);

            return Ok(new BaseResponse<BasePaginatedList<NoteResponseModelView>>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result
            ));
        }

        /// <summary>
        /// Retrieve notes by tag with pagination
        /// </summary>
        [HttpGet("get-by-tag")]
        [ProducesResponseType(typeof(NTC.Core.Base.BaseResponse<BasePaginatedList<NoteResponseModelView>>), 200)]
        public async Task<IActionResult> GetByTag(Guid tagId, int pageNumber = 1, int pageSize = 10)
        {
            BasePaginatedList<NoteResponseModelView> result = await _noteService.GetByTagAsync(tagId, pageNumber, pageSize);

            return Ok(new BaseResponse<BasePaginatedList<NoteResponseModelView>>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result
            ));
        }

        /// <summary>
        /// Retrieve notes that have reminders with pagination
        /// </summary>
        [HttpGet("get-by-reminder")]
        [ProducesResponseType(typeof(NTC.Core.Base.BaseResponse<BasePaginatedList<NoteResponseModelView>>), 200)]
        public async Task<IActionResult> GetByReminder(int pageNumber = 1, int pageSize = 10)
        {
            BasePaginatedList<NoteResponseModelView> result =
                await _noteService.GetByReminderAsync(pageNumber, pageSize);

            return Ok(new BaseResponse<BasePaginatedList<NoteResponseModelView>>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result
            ));
        }

        /// <summary>
        /// Retrieve a note by its ID
        /// </summary>
        [HttpGet("get-by-id/{id}")]
        [ProducesResponseType(typeof(NTC.Core.Base.BaseResponse<NoteResponseModelView>), 200)]
        public async Task<IActionResult> GetById(Guid id)
        {
            NoteResponseModelView result = await _noteService.GetByIdAsync(id);

            return Ok(new BaseResponse<NoteResponseModelView>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result
            ));
        }

        /// <summary>
        /// Create a new note
        /// </summary>
        [HttpPost("create")]
        [ProducesResponseType(typeof(NTC.Core.Base.BaseResponse<NoteResponseModelView>), 200)]
        public async Task<IActionResult> Create([FromBody] CreateNoteModelView model)
        {
            var note = await _noteService.CreateAsync(model);

            return Ok(new BaseResponse<NoteResponseModelView>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: new NoteResponseModelView
                {
                    Id = note.Id,
                    UserId = note.UserId,

                    Title = note.Title,
                    Content = note.Content,

                    IsPinned = note.IsPinned,
                    PinnedAt = note.PinnedAt,
                    Priority = note.Priority,

                    SortOrder = note.SortOrder,
                    BackgroundColor = note.BackgroundColor,
                }
            ));
        }


        /// <summary>
        /// Update an existing note
        /// </summary>
        [HttpPut("update")]
        [ProducesResponseType(typeof(NTC.Core.Base.BaseResponse<string>), 200)]
        public async Task<IActionResult> Update([FromBody] UpdateNoteModelView model)
        {
            await _noteService.UpdateAsync(model);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Update note successfully!"
            ));
        }

        /// <summary>
        /// Soft delete a note
        /// </summary>
        [HttpDelete("soft-delete/{id}")]
        [ProducesResponseType(typeof(NTC.Core.Base.BaseResponse<string>), 200)]
        public async Task<IActionResult> SoftDelete(Guid id)
        {
            await _noteService.SoftDeleteAsync(id);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Note soft deleted successfully!"
            ));
        }

        /// <summary>
        /// Soft delete a note
        /// </summary>
        [HttpDelete("restore/{id}")]
        [ProducesResponseType(typeof(NTC.Core.Base.BaseResponse<string>), 200)]
        public async Task<IActionResult> Restore(Guid id)
        {
            await _noteService.RestoreAsync(id);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Note restored successfully!"
            ));
        }

        /// <summary>
        /// Permanently delete a note
        /// </summary>
        [HttpDelete("delete/{id}")]
        [ProducesResponseType(typeof(NTC.Core.Base.BaseResponse<string>), 200)]
        public async Task<IActionResult> Delete(Guid id)
        {
            await _noteService.DeleteAsync(id);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Note deleted successfully!"
            ));
        }

        /// <summary>
        /// Toggle the pinned status of a note
        /// </summary>
        [HttpPut("toggle-pin/{id}")]
        [ProducesResponseType(typeof(NTC.Core.Base.BaseResponse<string>), 200)]
        public async Task<IActionResult> TogglePin(Guid id)
        {
            await _noteService.TogglePinAsync(id);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Toggle pin successfully!"
            ));
        }

        /// <summary>
        /// Reorder a note
        /// </summary>
        [HttpPut("reorder")]
        [ProducesResponseType(typeof(NTC.Core.Base.BaseResponse<string>), 200)]
        public async Task<IActionResult> Reorder([FromBody] ReorderNoteModelView model)
        {
            await _noteService.ReorderAsync(model);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Reorder note successfully!"
            ));
        }




        #endregion
    }
}
