using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NTC.Contract.Services.Interface;
using NTC.Core.Base;
using NTC.Core.Store;

namespace NTC.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    //[Authorize(Roles = "Admin,User")]
    public class NoteTagController : ControllerBase
    {
        private readonly INoteTagService _noteTagService;

        public NoteTagController(INoteTagService noteTagService)
        {
            _noteTagService = noteTagService;
        }

        /// <summary>
        /// Add a tag to a note
        /// </summary>
        [HttpPost("add")]
        public async Task<IActionResult> AddTagToNote(
            [FromQuery] Guid noteId,
            [FromQuery] Guid tagId)
        {
            await _noteTagService.AddTagToNoteAsync(noteId, tagId);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Tag added to note successfully!"
            ));
        }

        /// <summary>
        /// Remove a tag from a note
        /// </summary>
        [HttpDelete("remove")]
        public async Task<IActionResult> RemoveTagFromNote(
            [FromQuery] Guid noteId,
            [FromQuery] Guid tagId)
        {
            await _noteTagService.RemoveTagFromNoteAsync(noteId, tagId);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Tag removed from note successfully!"
            ));
        }


        /// <summary>
        /// Remove a tag from all notes
        /// </summary>
        [HttpDelete("remove-tag-from-all-notes")]
        public async Task<IActionResult> RemoveTagFromAllNotesAsync([FromQuery] Guid tagId)
        {
            await _noteTagService.RemoveTagFromAllNotesAsync(tagId);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Tag removed from all notes successfully!"
            ));
        }


        /// <summary>
        /// Remove all tags from a note
        /// </summary>
        [HttpDelete("remove-all-tags-from-note")]
        public async Task<IActionResult> RemoveAllTagsFromNote([FromQuery] Guid noteId)
        {
            await _noteTagService.RemoveAllTagsFromNoteAsync(noteId);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "All tags removed from note successfully!"
            ));
        }











    }
}
