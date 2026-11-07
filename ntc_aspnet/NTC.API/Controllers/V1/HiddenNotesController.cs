using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using NTC.API.Configuration;
using NTC.API.Controllers.Shared;
using NTC.Contract.Services.Interface;
using NTC.Core.Base;
using NTC.Core.Security;
using NTC.ModelViews.Notes;
using NTC.ModelViews.NoteModelView;
namespace NTC.API.Controllers.V1;
[Authorize(Policy=AuthConfiguration.WorkspacePolicy)]
[ApiController,Route("api/v1/hidden-notes")]
public sealed class HiddenNotesController(INoteVaultService vault,INoteService notes,INoteAccess access):BaseApiController {
 [HttpGet("status")] [ProducesResponseType(typeof(BaseResponse<VaultStatus>),200)] public async Task<IActionResult> Status()=>Success(await vault.StatusAsync());
 [HttpPost("configure"),EnableRateLimiting("auth")] [ProducesResponseType(typeof(BaseResponse<bool>),200)] public async Task<IActionResult> Configure(VaultSecretRequest request){await vault.ConfigureAsync(request);return Success(true);}
 [HttpPost("unlock"),EnableRateLimiting("auth")] [ProducesResponseType(typeof(BaseResponse<VaultUnlock>),200)] public async Task<IActionResult> Unlock(VaultSecretRequest request)=>Success(await vault.UnlockAsync(request));
 [HttpPost("lock")] [ProducesResponseType(typeof(BaseResponse<bool>),200)] public async Task<IActionResult> Lock(){await vault.LockAsync(Request.Headers["X-Note-Vault"].ToString());return Success(true);}
 [HttpPost("reset-code"),EnableRateLimiting("auth")] [ProducesResponseType(typeof(BaseResponse<bool>),200)] public async Task<IActionResult> ResetCode(){await vault.SendResetAsync();return Success(true);}
 [HttpPost("reset"),EnableRateLimiting("auth")] [ProducesResponseType(typeof(BaseResponse<bool>),200)] public async Task<IActionResult> Reset(VaultResetRequest request){await vault.ResetAsync(request);return Success(true);}
 [HttpPost("heartbeat")] [ProducesResponseType(typeof(BaseResponse<bool>),200)] public IActionResult Heartbeat(){if(!access.HiddenNotesUnlocked)throw DomainErrors.Forbidden();return Success(true);}
 [HttpPost] [ProducesResponseType(typeof(BaseResponse<NoteResponseModelView>),201)] public async Task<IActionResult> Create(SaveNoteRequest request,[FromHeader(Name="Idempotency-Key")] string? key=null) {
  if(!access.HiddenNotesUnlocked)throw DomainErrors.Forbidden();
  var requestId=Guid.TryParse(key,out var parsed)&&parsed!=Guid.Empty?parsed:throw DomainErrors.Invalid("An idempotency key is required.");
  var note=await notes.CreateAsync(request.ToCreate(requestId),hidden:true);return CreatedResource($"/api/v1/notes/{note.Id}",await notes.GetByIdAsync(note.Id));
 }
 [HttpGet] [ProducesResponseType(typeof(BaseResponse<BasePaginatedList<NoteResponseModelView>>),200)] public async Task<IActionResult> List(int pageNumber=1,int pageSize=20,string? q=null,bool trash=false){
  if(!access.HiddenNotesUnlocked)throw DomainErrors.Forbidden();return Success(await notes.QueryAsync(pageNumber,pageSize,search:q,trash:trash,hidden:true));
 }
 [HttpPatch("{id:guid}/visibility")] [ProducesResponseType(typeof(BaseResponse<bool>),200)] public async Task<IActionResult> Visibility(Guid id,VaultNoteRequest request){await vault.SetHiddenAsync(id,request);return Success(true);}
}
