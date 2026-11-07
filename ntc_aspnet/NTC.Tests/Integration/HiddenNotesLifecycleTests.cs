using System.Net;
using System.Net.Http.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using NTC.Contract.Services.Interface;
using NTC.Repositories.Context;
using NTC.Tests.Infrastructure;
namespace NTC.Tests.Integration;
public sealed class HiddenNotesLifecycleTests {
 private static async Task<string> Unlock(HttpClient client,string secret="123456") {
  var data=await ApiFactory.Data(await client.PostAsJsonAsync("/api/v1/hidden-notes/unlock",new{kind="pin",secret}));
  var token=data.GetProperty("token").GetString()!;client.DefaultRequestHeaders.Remove("X-Note-Vault");client.DefaultRequestHeaders.Add("X-Note-Vault",token);return token;
 }
 [Fact] public async Task New_private_notes_are_hidden_from_birth_and_reset_revokes_all_previous_grants() {
  using var f=new ApiFactory();await f.InitializeAsync();var login=await f.LoginAsync();using var a=login.Client;
  await ApiFactory.Data(await a.PostAsJsonAsync("/api/v1/hidden-notes/configure",new{kind="pin",secret="123456"}));await Unlock(a);
  a.DefaultRequestHeaders.Add("Idempotency-Key",Guid.NewGuid().ToString());
  var note=await ApiFactory.Data(await a.PostAsJsonAsync("/api/v1/hidden-notes",new{title="Private from birth",content="Fixture content"}));a.DefaultRequestHeaders.Remove("Idempotency-Key");var id=note.GetProperty("id").GetGuid();
  var second=await f.LoginAsync();using var b=second.Client;await Unlock(b);Assert.Equal(HttpStatusCode.OK,(await a.GetAsync($"/api/v1/notes/{id}")).StatusCode);
  await ApiFactory.Data(await b.PostAsync("/api/v1/hidden-notes/reset-code",null));var code=Regex.Match(Assert.Single(f.Email.Messages).Body,@"\b\d{6}\b").Value;
  b.DefaultRequestHeaders.Remove("X-Note-Vault");await ApiFactory.Data(await b.PostAsJsonAsync("/api/v1/hidden-notes/reset",new{code,kind="pin",secret="654321"}));
  Assert.Equal(HttpStatusCode.Forbidden,(await a.GetAsync($"/api/v1/notes/{id}")).StatusCode);a.DefaultRequestHeaders.Remove("X-Note-Vault");await Unlock(a,"654321");Assert.Equal(HttpStatusCode.OK,(await a.GetAsync($"/api/v1/notes/{id}")).StatusCode);
 }
 [Fact] public async Task Reminder_dispatch_skips_hidden_notes_but_trash_retention_deletes_their_graph() {
  using var f=new ApiFactory();await f.InitializeAsync();var login=await f.LoginAsync();using var a=login.Client;
  var note=await ApiFactory.Note(a);var id=note.GetProperty("id").GetGuid();await ApiFactory.Data(await a.PostAsJsonAsync($"/api/v1/notes/{id}/reminders",new{reminderAt=f.Clock.GetUtcNow().AddMinutes(1),timeZoneId="Asia/Ho_Chi_Minh",sendEmail=true}));
  note=await ApiFactory.Data(await a.GetAsync($"/api/v1/notes/{id}"));await ApiFactory.Data(await a.PostAsJsonAsync("/api/v1/hidden-notes/configure",new{kind="pin",secret="123456"}));await Unlock(a);
  await ApiFactory.Data(await a.PatchAsJsonAsync($"/api/v1/hidden-notes/{id}/visibility",new{hidden=true,version=note.GetProperty("version").GetGuid()}));f.Clock.Advance(TimeSpan.FromMinutes(2));
  using(var scope=f.Services.CreateScope()){var jobs=scope.ServiceProvider.GetRequiredService<IBackgroundMaintenanceService>();Assert.Equal(0,await jobs.DispatchRemindersAsync());Assert.Equal(0,await jobs.DeliverEmailsAsync());}
  Assert.Empty(f.Email.Messages);await ApiFactory.Data(await a.PostAsync($"/api/v1/notes/{id}/trash",null));f.Clock.Advance(TimeSpan.FromDays(31));
  using(var scope=f.Services.CreateScope()){Assert.Equal(1,await scope.ServiceProvider.GetRequiredService<IBackgroundMaintenanceService>().PurgeTrashAsync());var db=scope.ServiceProvider.GetRequiredService<DatabaseContext>();Assert.False(await db.Notes.IgnoreQueryFilters().AnyAsync(x=>x.Id==id));Assert.False(await db.Reminders.IgnoreQueryFilters().AnyAsync(x=>x.NoteId==id));}
 }
 [Fact] public async Task Reset_code_expires_and_wrong_attempt_budget_cannot_be_reused() {
  using var f=new ApiFactory();await f.InitializeAsync();var login=await f.LoginAsync();using var a=login.Client;
  await ApiFactory.Data(await a.PostAsJsonAsync("/api/v1/hidden-notes/configure",new{kind="pin",secret="123456"}));await ApiFactory.Data(await a.PostAsync("/api/v1/hidden-notes/reset-code",null));var code=Regex.Match(Assert.Single(f.Email.Messages).Body,@"\b\d{6}\b").Value;
  var wrong=code=="111111"?"222222":"111111";for(var i=0;i<5;i++)Assert.Equal(HttpStatusCode.BadRequest,(await a.PostAsJsonAsync("/api/v1/hidden-notes/reset",new{code=wrong,kind="pin",secret="654321"})).StatusCode);
  Assert.Equal(HttpStatusCode.BadRequest,(await a.PostAsJsonAsync("/api/v1/hidden-notes/reset",new{code,kind="pin",secret="654321"})).StatusCode);
  f.Clock.Advance(TimeSpan.FromMinutes(2));await ApiFactory.Data(await a.PostAsync("/api/v1/hidden-notes/reset-code",null));code=Regex.Match(f.Email.Messages.Last().Body,@"\b\d{6}\b").Value;f.Clock.Advance(TimeSpan.FromMinutes(11));Assert.Equal(HttpStatusCode.BadRequest,(await a.PostAsJsonAsync("/api/v1/hidden-notes/reset",new{code,kind="pin",secret="654321"})).StatusCode);
 }
}
