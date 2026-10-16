using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NTC.Contract.Services.Interface;
using NTC.Core.Base;
using NTC.Core.Store;
using NTC.ModelViews.ReminderModelView;

namespace NTC.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "Admin,User")]
    public class ReminderController : ControllerBase
    {
        private readonly IReminderService _reminderService;

        public ReminderController(IReminderService reminderService)
        {
            _reminderService = reminderService;
        }

        #region Reminder

        /// <summary>
        /// Retrieve all reminders with pagination
        /// </summary>
        [HttpGet("get-all")]
        public async Task<IActionResult> GetAll(int pageNumber = 1, int pageSize = 10)
        {
            var result = await _reminderService.GetAllAsync(pageNumber, pageSize);

            return Ok(new BaseResponse<BasePaginatedList<ReminderResponseModelView>>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result
            ));
        }

        /// <summary>
        /// Retrieve a reminder by its ID
        /// </summary>
        [HttpGet("get-by-id/{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var result = await _reminderService.GetByIdAsync(id);

            return Ok(new BaseResponse<ReminderResponseModelView>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result
            ));
        }


        /// <summary>
        /// Retrieve reminders for a note
        /// </summary>
        [HttpGet("get-by-note/{noteId}")]
        public async Task<IActionResult> GetByNote(Guid noteId)
        {
            var result = await _reminderService.GetByNoteIdAsync(noteId);

            return Ok(new BaseResponse<List<ReminderResponseModelView>>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: result
            ));
        }

        /// <summary>
        /// Create a new reminder
        /// </summary>
        [HttpPost("create")]
        public async Task<IActionResult> Create(
            [FromBody] CreateReminderModelView model)
        {
            var reminder = await _reminderService.CreateAsync(model);

            return Ok(new BaseResponse<ReminderResponseModelView>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: new ReminderResponseModelView
                {
                    Id = reminder.Id,
                    NoteId = reminder.NoteId,
                    ReminderAt = reminder.ReminderAt,
                    RepeatType = reminder.RepeatType,
                    RepeatInterval = reminder.RepeatInterval,
                    RepeatDays = reminder.RepeatDays,
                    RepeatUntil = reminder.RepeatUntil,
                    RepeatCount = reminder.RepeatCount,
                    IsActive = reminder.IsActive
                }
            ));
        }

        /// <summary>
        /// Update an existing reminder
        /// </summary>
        [HttpPut("update")]
        public async Task<IActionResult> Update(
            [FromBody] UpdateReminderModelView model)
        {
            await _reminderService.UpdateAsync(model);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Update reminder successfully!"
            ));
        }

        /// <summary>
        /// Soft delete a reminder
        /// </summary>
        [HttpDelete("soft-delete/{id}")]
        public async Task<IActionResult> SoftDelete(Guid id)
        {
            await _reminderService.SoftDeleteAsync(id);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Reminder soft deleted successfully!"
            ));
        }
        /// <summary>
        /// Permanently delete a reminder
        /// </summary>
        [HttpDelete("delete/{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            await _reminderService.DeleteAsync(id);

            return Ok(new BaseResponse<string>(
                statusCode: StatusCodeHelper.OK,
                code: ResponseCodeConstants.SUCCESS,
                data: "Reminder deleted successfully!"
            ));
        }

        #endregion
    }
}