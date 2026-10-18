using NTC.ModelViews.TagModelView;
using NTC.ModelViews.ReminderModelView;
using NTC.ModelViews.AuthModelView;
using NTC.ModelViews.Administration;
using NTC.ModelViews.Notifications;
using NTC.ModelViews.UserInfoModelView;
using Microsoft.AspNetCore.Mvc;
using NTC.API.Controllers.Shared;
using NTC.Contract.Services.Interface;
using NTC.Core.Base;
using NTC.ModelViews.NoteModelView;
using NTC.ModelViews.Notes;
namespace NTC.API.Controllers.V1;
[ApiController, Route("api/v1/notes")]
public sealed class NotesController(INoteService notes, INoteTagService labels) : BaseApiController
{
    [HttpGet] [ProducesResponseType(typeof(BaseResponse<BasePaginatedList<NoteResponseModelView>>), 200)]
    public async Task<IActionResult> List(int pageNumber = 1, int pageSize = 20, string? q = null, Guid? tagId = null, bool trash = false, bool? pinned = null, bool hasReminder = false) =>
        Success(await notes.QueryAsync(pageNumber, pageSize, q, tagId, trash, pinned, hasReminder));
    [HttpGet("{id:guid}")] [ProducesResponseType(typeof(BaseResponse<NoteResponseModelView>), 200)]
    public async Task<IActionResult> Get(Guid id) => Success(await notes.GetByIdAsync(id));
    [HttpPost] [ProducesResponseType(typeof(BaseResponse<NoteResponseModelView>), 201)]
    public async Task<IActionResult> Create(SaveNoteRequest request, [FromHeader(Name = "Idempotency-Key")] string? key = null)
    {
        Guid? requestId = null;
        if (key != null) requestId = Guid.TryParse(key, out var parsed) && parsed != Guid.Empty ? parsed : throw DomainErrors.Invalid("Idempotency-Key must be a nonempty Guid.");
        var note = await notes.CreateAsync(request.ToCreate(requestId));
        return CreatedResource($"/api/v1/notes/{note.Id}", await notes.GetByIdAsync(note.Id));
    }
    [HttpPatch("{id:guid}")] [ProducesResponseType(typeof(BaseResponse<NoteResponseModelView>), 200)]
    public async Task<IActionResult> Update(Guid id, PatchNoteRequest request)
    {
        if (request.Version == Guid.Empty) throw DomainErrors.Invalid("A version is required when saving.");
        var current = await notes.GetByIdAsync(id);
        if (current.DocumentJson != null && request.Content != null && request.DocumentJson == null && !request.ConvertToPlainText)
            throw DomainErrors.Invalid("Edit the rich document, or explicitly confirm conversion to plain text.");
        await notes.UpdateAsync(new() { Id = id, Version = request.Version, Title = request.Title ?? current.Title,
            Content = request.Content ?? current.Content, DocumentJson = request.ConvertToPlainText ? null : request.DocumentJson ?? current.DocumentJson,
            IconEmoji = request.IconEmoji ?? current.IconEmoji, BackgroundColor = request.BackgroundColor ?? current.BackgroundColor,
            IsPinned = request.IsPinned ?? current.IsPinned, Priority = current.Priority, TagIds = request.TagIds,
            ConvertToPlainText = request.ConvertToPlainText });
        return Success(await notes.GetByIdAsync(id));
    }
    [HttpPatch("{id:guid}/pin")] [ProducesResponseType(typeof(BaseResponse<NoteResponseModelView>), 200)]
    public async Task<IActionResult> Pin(Guid id, PinNoteRequest request)
    {
        if (request.Version == Guid.Empty) throw DomainErrors.Invalid("A version is required.");
        await notes.SetPinnedAsync(id, request.IsPinned, request.Version); return Success(await notes.GetByIdAsync(id));
    }
    [HttpPost("reorder")] [ProducesResponseType(typeof(NTC.Core.Base.BaseResponse<bool>), 200)]
        public async Task<IActionResult> Reorder(ReorderNoteModelView request)
    {
        if (request.Version is null || request.Version == Guid.Empty) throw DomainErrors.Invalid("A version is required.");
        await notes.ReorderAsync(request); return Success(true);
    }
    [HttpPost("{id:guid}/trash")] [ProducesResponseType(typeof(NTC.Core.Base.BaseResponse<bool>), 200)]
        public async Task<IActionResult> Trash(Guid id) { await notes.SoftDeleteAsync(id); return Success(true); }
    [HttpPost("{id:guid}/restore")] [ProducesResponseType(typeof(BaseResponse<NoteResponseModelView>), 200)]
    public async Task<IActionResult> Restore(Guid id) { await notes.RestoreAsync(id); return Success(await notes.GetByIdAsync(id)); }
    [HttpDelete("{id:guid}")] [ProducesResponseType(typeof(NTC.Core.Base.BaseResponse<bool>), 200)]
        public async Task<IActionResult> Delete(Guid id) { await notes.DeleteAsync(id); return Success(true); }
    [HttpPut("{id:guid}/tags/{tagId:guid}")] [ProducesResponseType(typeof(NTC.Core.Base.BaseResponse<bool>), 200)]
        public async Task<IActionResult> AddLabel(Guid id, Guid tagId) { await labels.AddTagToNoteAsync(id, tagId); return Success(true); }
    [HttpDelete("{id:guid}/tags/{tagId:guid}")] [ProducesResponseType(typeof(NTC.Core.Base.BaseResponse<bool>), 200)]
        public async Task<IActionResult> RemoveLabel(Guid id, Guid tagId) { await labels.RemoveTagFromNoteAsync(id, tagId); return Success(true); }
}
