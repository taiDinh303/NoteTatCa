using System.Net;
using System.Net.Http.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using NTC.Repositories.Context;
using NTC.Tests.Infrastructure;
namespace NTC.Tests.Integration;
public sealed class HiddenNotesTests {
 private static async Task<string> Unlock(HttpClient client,string secret="123456",string kind="pin") {
  var result=await ApiFactory.Data(await client.PostAsJsonAsync("/api/v1/hidden-notes/unlock",new {kind,secret}));
  var token=result.GetProperty("token").GetString()!;client.DefaultRequestHeaders.Remove("X-Note-Vault");client.DefaultRequestHeaders.Add("X-Note-Vault",token);return token;
 }
 [Fact] public async Task Locked_notes_are_absent_from_normal_legacy_search_history_links_and_export() {
  using var f=new ApiFactory();await f.InitializeAsync();var login=await f.LoginAsync();using var owner=login.Client;
  var note=await ApiFactory.Note(owner,"Secret fixture text");var id=note.GetProperty("id").GetGuid();
  var label=await ApiFactory.Data(await owner.PostAsJsonAsync("/api/v1/tags",new{name="Shared label"}));var tag=label.GetProperty("id").GetGuid();
  await ApiFactory.Data(await owner.PostAsJsonAsync("/api/v1/hidden-notes/configure",new{kind="pin",secret="123456"}));
  await Unlock(owner);await ApiFactory.Data(await owner.PatchAsJsonAsync($"/api/v1/hidden-notes/{id}/visibility",new{hidden=true,version=note.GetProperty("version").GetGuid()}));
  Assert.Single((await ApiFactory.Data(await owner.GetAsync("/api/v1/hidden-notes"))).GetProperty("items").EnumerateArray());
  Assert.Empty((await ApiFactory.Data(await owner.GetAsync("/api/v1/notes?q=Secret"))).GetProperty("items").EnumerateArray());
  Assert.Empty((await ApiFactory.Data(await owner.GetAsync("/api/v1/workspace/archive"))).GetProperty("notes").EnumerateArray());
  await ApiFactory.Data(await owner.PostAsync("/api/v1/hidden-notes/lock",null));owner.DefaultRequestHeaders.Remove("X-Note-Vault");
  foreach(var path in new[]{$"/api/v1/notes/{id}",$"/api/v1/notes/{id}/revisions",$"/api/Note/get-by-id/{id}"})Assert.Equal(HttpStatusCode.NotFound,(await owner.GetAsync(path)).StatusCode);
  Assert.Equal(HttpStatusCode.NotFound,(await owner.PatchAsJsonAsync($"/api/v1/notes/{id}",new{title="Intrusion",version=note.GetProperty("version").GetGuid()})).StatusCode);
  Assert.Equal(HttpStatusCode.NotFound,(await owner.PutAsync($"/api/v1/notes/{id}/tags/{tag}",null)).StatusCode);
  Assert.Equal(HttpStatusCode.NotFound,(await owner.PostAsJsonAsync($"/api/v1/notes/{id}/reminders",new{reminderAt=DateTimeOffset.UtcNow.AddDays(1),timeZoneId="Asia/Ho_Chi_Minh"})).StatusCode);
  Assert.Equal(HttpStatusCode.Forbidden,(await owner.GetAsync("/api/v1/hidden-notes")).StatusCode);
  Assert.Empty((await ApiFactory.Data(await owner.GetAsync("/api/Note/get-all"))).GetProperty("items").EnumerateArray());
  await Unlock(owner);Assert.Equal(HttpStatusCode.OK,(await owner.GetAsync($"/api/v1/notes/{id}")).StatusCode);
  var other=await f.LoginAsync("b@example.test");using var b=other.Client;Assert.Equal(HttpStatusCode.NotFound,(await b.GetAsync($"/api/v1/notes/{id}")).StatusCode);
  var administrator=await f.LoginAsync("admin@example.test");using var admin=administrator.Client;Assert.Equal(HttpStatusCode.Forbidden,(await admin.GetAsync("/api/v1/hidden-notes/status")).StatusCode);
 }
 [Fact] public async Task Grant_is_session_bound_and_expires_even_when_bearer_is_valid() {
  using var f=new ApiFactory();await f.InitializeAsync();var login=await f.LoginAsync();using var owner=login.Client;
  await ApiFactory.Data(await owner.PostAsJsonAsync("/api/v1/hidden-notes/configure",new{kind="pin",secret="123456"}));var token=await Unlock(owner);
  var again=await f.LoginAsync();using var second=again.Client;second.DefaultRequestHeaders.Add("X-Note-Vault",token);
  Assert.Equal(HttpStatusCode.Forbidden,(await second.GetAsync("/api/v1/hidden-notes")).StatusCode);
  f.Clock.Advance(TimeSpan.FromMinutes(6));Assert.Equal(HttpStatusCode.Forbidden,(await owner.GetAsync("/api/v1/hidden-notes")).StatusCode);
 }
 [Fact] public async Task Wrong_attempts_lock_out_and_reset_is_purpose_bound_single_use_and_preserves_notes() {
  using var f=new ApiFactory();await f.InitializeAsync();var login=await f.LoginAsync();using var owner=login.Client;
  await ApiFactory.Data(await owner.PostAsJsonAsync("/api/v1/hidden-notes/configure",new{kind="pin",secret="123456"}));var note=await ApiFactory.Note(owner);var id=note.GetProperty("id").GetGuid();await Unlock(owner);
  await ApiFactory.Data(await owner.PatchAsJsonAsync($"/api/v1/hidden-notes/{id}/visibility",new{hidden=true,version=note.GetProperty("version").GetGuid()}));owner.DefaultRequestHeaders.Remove("X-Note-Vault");
  for(var i=0;i<5;i++)Assert.Equal(HttpStatusCode.BadRequest,(await owner.PostAsJsonAsync("/api/v1/hidden-notes/unlock",new{kind="pin",secret="000000"})).StatusCode);
  Assert.Equal(HttpStatusCode.TooManyRequests,(await owner.PostAsJsonAsync("/api/v1/hidden-notes/unlock",new{kind="pin",secret="123456"})).StatusCode);
  await ApiFactory.Data(await owner.PostAsync("/api/v1/hidden-notes/reset-code",null));var email=Assert.Single(f.Email.Messages);Assert.Contains("hidden notes",email.Subject);
  var code=Regex.Match(email.Body,@"\b\d{6}\b").Value;Assert.Equal(6,code.Length);
  Assert.Equal(HttpStatusCode.TooManyRequests,(await owner.PostAsync("/api/v1/hidden-notes/reset-code",null)).StatusCode);
  await ApiFactory.Data(await owner.PostAsJsonAsync("/api/v1/hidden-notes/reset",new{code,kind="pattern",secret="0125"}));
  Assert.Equal(HttpStatusCode.BadRequest,(await owner.PostAsJsonAsync("/api/v1/hidden-notes/reset",new{code,kind="pin",secret="999999"})).StatusCode);
  await Unlock(owner,"0125","pattern");Assert.Equal(HttpStatusCode.OK,(await owner.GetAsync($"/api/v1/notes/{id}")).StatusCode);
 }
 [Fact] public async Task Pattern_crossings_and_bad_pin_are_rejected_without_setting_up_a_lock() {
  using var f=new ApiFactory();await f.InitializeAsync();var login=await f.LoginAsync();using var owner=login.Client;
  foreach(var value in new[]{new{kind="pattern",secret="0286"},new{kind="pin",secret="12345"},new{kind="pattern",secret="0112"}})
   Assert.Equal(HttpStatusCode.BadRequest,(await owner.PostAsJsonAsync("/api/v1/hidden-notes/configure",value)).StatusCode);
  Assert.False((await ApiFactory.Data(await owner.GetAsync("/api/v1/hidden-notes/status"))).GetProperty("configured").GetBoolean());
 }
 [Fact] public async Task Hidden_flag_defaults_false_and_cannot_be_set_through_regular_note_payload() {
  using var f=new ApiFactory();await f.InitializeAsync();var login=await f.LoginAsync();using var owner=login.Client;
  var note=await ApiFactory.Data(await owner.PostAsJsonAsync("/api/v1/notes",new{title="Ordinary",content="Fixture",isHidden=true}));
  using var scope=f.Services.CreateScope();var db=scope.ServiceProvider.GetRequiredService<DatabaseContext>();Assert.False((await db.Notes.SingleAsync(x=>x.Id==note.GetProperty("id").GetGuid())).IsHidden);
 }
}
