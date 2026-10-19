using Microsoft.AspNetCore.Authorization;
using NTC.API.Configuration;
using Microsoft.AspNetCore.Mvc;
using NTC.API.Controllers.Shared;
using NTC.Contract.Services.Interface;
using NTC.Core.Base;
using NTC.ModelViews.ReminderModelView;

namespace NTC.API.Controllers.V1;

[Authorize(Policy = AuthConfiguration.WorkspacePolicy)]
[ApiController, Route("api/v1")]
public sealed class RemindersController(IReminderService reminders) : BaseApiController
{
    [HttpGet("reminders"), ProducesResponseType(typeof(BaseResponse<BasePaginatedList<ReminderResponseModelView>>), 200)]
    public async Task<IActionResult> List(int pageNumber = 1, int pageSize = 20) => Success(await reminders.GetAllAsync(pageNumber, pageSize));
    [HttpGet("reminders/{id:guid}"), ProducesResponseType(typeof(BaseResponse<ReminderResponseModelView>), 200)]
    public async Task<IActionResult> Get(Guid id) => Success(await reminders.GetByIdAsync(id));
    [HttpGet("notes/{noteId:guid}/reminders"), ProducesResponseType(typeof(BaseResponse<List<ReminderResponseModelView>>), 200)]
    public async Task<IActionResult> ForNote(Guid noteId) => Success(await reminders.GetByNoteIdAsync(noteId));
    [HttpPost("notes/{noteId:guid}/reminders"), ProducesResponseType(typeof(BaseResponse<ReminderResponseModelView>), 201)]
    public async Task<IActionResult> Create(Guid noteId, CreateReminderModelView request)
    { request.NoteId = noteId; var item = await reminders.CreateAsync(request); return CreatedResource($"/api/v1/reminders/{item.Id}", await reminders.GetByIdAsync(item.Id)); }
    [HttpPatch("reminders/{id:guid}"), ProducesResponseType(typeof(BaseResponse<ReminderResponseModelView>), 200)]
    public async Task<IActionResult> Update(Guid id, PatchReminderRequest request)
    { await reminders.PatchAsync(id, request); return Success(await reminders.GetByIdAsync(id)); }
    [HttpDelete("reminders/{id:guid}"), ProducesResponseType(typeof(BaseResponse<bool>), 200)]
    public async Task<IActionResult> Delete(Guid id) { await reminders.DeleteAsync(id); return Success(true); }
}
