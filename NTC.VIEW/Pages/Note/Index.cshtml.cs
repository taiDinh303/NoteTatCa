using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using System.Net.Http.Headers;
using NTC.Core.Base;
using NTC.ModelViews.TagModelView;
using NTC.ModelViews.NoteModelView;
using NTC.ModelViews.ReminderModelView;

namespace NTC.Razor.Pages.Note
{
    public class IndexModel : PageModel
    {
        private readonly IConfiguration _config;
        private readonly IHttpClientFactory _httpClientFactory;

        public BasePaginatedList<NoteResponseModelView>? Notes { get; set; }

        public BasePaginatedList<TagResponseModelView>? Tags { get; set; }

        //public BasePaginatedList<ReminderResponseModelView>? Reminders { get; set; }

        public IndexModel(IConfiguration config, IHttpClientFactory httpClientFactory)
        {
            _config = config;
            _httpClientFactory = httpClientFactory;
        }



        // Load notes and tags
        public async Task<IActionResult> OnGetAsync(Guid? tagId, int pageNumber = 1, int pageSize = 10)
        {
            string? token = HttpContext.Request.Cookies["JwtToken"];
            if (string.IsNullOrEmpty(token))
                return RedirectToPage("/Auth/Login");

            var client = _httpClientFactory.CreateClient();
            client.BaseAddress = new Uri(_config["ApiSettings:BaseUrl"]!);
            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", token);

            // ===== Get all or get by tag =====
            string noteUrl = tagId.HasValue
                ? $"api/note/get-by-tag?tagId={tagId}&pageNumber={pageNumber}&pageSize={pageSize}"
                : $"api/note/get-all?pageNumber={pageNumber}&pageSize={pageSize}";

            var noteRes = await client.GetFromJsonAsync<BaseResponse<BasePaginatedList<NoteResponseModelView>>>(noteUrl);

            Notes = noteRes?.Data;

            // ===== Get tags =====
            var tagRes = await client.GetFromJsonAsync<BaseResponse<BasePaginatedList<TagResponseModelView>>>($"api/tag/get-all?pageNumber=1&pageSize=50");
            Tags = tagRes?.Data;

            //// ==== Get reminders =====
            //var reminderRes = await client.GetFromJsonAsync<BaseResponse<BasePaginatedList<ReminderResponseModelView>>>($"api/reminder/get-all?pageNumber=1&pageSize=50");
            //Reminders = reminderRes?.Data;

            return Page();
        }


        // Load notes partial for pagination and filtering
        public async Task<IActionResult> OnGetNotesPartialAsync(Guid? tagId, int pageNumber = 1, int pageSize = 10)
        {
            string? token = HttpContext.Request.Cookies["JwtToken"];
            if (string.IsNullOrEmpty(token))
                return Unauthorized();

            var client = _httpClientFactory.CreateClient();
            client.BaseAddress = new Uri(_config["ApiSettings:BaseUrl"]!);
            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", token);

            string noteUrl = tagId.HasValue
                ? $"api/note/get-by-tag?tagId={tagId}&pageNumber={pageNumber}&pageSize={pageSize}"
                : $"api/note/get-all?pageNumber={pageNumber}&pageSize={pageSize}";

            var res = await client.GetFromJsonAsync<
                BaseResponse<BasePaginatedList<NoteResponseModelView>>
            >(noteUrl);

            return Partial("_NoteListPartial", res?.Data);
        }


        public async Task<IActionResult> OnGetReminderPartialAsync(int pageNumber = 1, int pageSize = 10)
        {
            string? token = HttpContext.Request.Cookies["JwtToken"];
            if (string.IsNullOrEmpty(token))
                return Unauthorized();

            var client = _httpClientFactory.CreateClient();
            client.BaseAddress = new Uri(_config["ApiSettings:BaseUrl"]!);
            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", token);

            var res = await client.GetFromJsonAsync<
                BaseResponse<BasePaginatedList<NoteResponseModelView>>
            >($"api/note/get-by-reminder?pageNumber={pageNumber}&pageSize={pageSize}");

            return Partial("_NoteListPartial", res?.Data);
        }





        // Delete note
        public async Task<IActionResult> OnPostDeleteAsync(Guid id)
        {
            string? token = HttpContext.Request.Cookies["JwtToken"];
            if (string.IsNullOrEmpty(token))
                return Unauthorized();

            var client = _httpClientFactory.CreateClient();
            client.BaseAddress = new Uri(_config["ApiSettings:BaseUrl"]!);
            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", token);

            var res = await client.DeleteAsync($"api/note/delete/{id}");

            if (!res.IsSuccessStatusCode)
            {
                return BadRequest(new { success = false });
            }

            return new JsonResult(new { success = true });
        }



        // Toggle pin note
        public async Task<IActionResult> OnPostTogglePinAsync(Guid id)
        {
            string? token = HttpContext.Request.Cookies["JwtToken"];
            if (string.IsNullOrEmpty(token))
                return RedirectToPage("/Auth/Login");

            var client = _httpClientFactory.CreateClient();
            client.BaseAddress = new Uri(_config["ApiSettings:BaseUrl"]!);
            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", token);

            var res = await client.PutAsync($"api/note/toggle-pin/{id}", null);

            if (!res.IsSuccessStatusCode)
            {
                TempData["ErrorMessage"] = "Cannot toggle pin.";
            }

            // reload lại trang để cập nhật thứ tự ghim
            return RedirectToPage();
        }


        // Update tag
        public async Task<IActionResult> OnPutUpdateTagAsync([FromBody] UpdateTagModelView model)
        {
            string? token = HttpContext.Request.Cookies["JwtToken"];
            if (string.IsNullOrEmpty(token))
                return Unauthorized();

            var client = _httpClientFactory.CreateClient();
            client.BaseAddress = new Uri(_config["ApiSettings:BaseUrl"]!);
            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", token);

            var res = await client.PutAsJsonAsync("api/tag/update", model);

            if (!res.IsSuccessStatusCode)
                return BadRequest();

            return new JsonResult(new { success = true });
        }







        // Create tag
        public async Task<IActionResult> OnPostCreateTagAsync(
            [FromBody] CreateTagModelView model)
        {
            string? token = HttpContext.Request.Cookies["JwtToken"];
            string? userId = HttpContext.Session.GetString("UserId");

            if (string.IsNullOrEmpty(token) || string.IsNullOrEmpty(userId))
                return Unauthorized();

            var client = _httpClientFactory.CreateClient();
            client.BaseAddress = new Uri(_config["ApiSettings:BaseUrl"]!);
            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", token);

            var res = await client.PostAsJsonAsync("api/tag/create", model);

            if (!res.IsSuccessStatusCode)
                return BadRequest();

            var apiResponse =
                await res.Content.ReadFromJsonAsync<
                    BaseResponse<TagResponseModelView>>();

            if (apiResponse?.Data == null)
                return BadRequest();


            return new JsonResult(new
            {
                success = true,
                id = apiResponse.Data.Id
            });
        }


        // Delete tag
        public async Task<IActionResult> OnPostDeleteTagAsync(Guid id)
        {
            string? token = HttpContext.Request.Cookies["JwtToken"];
            if (string.IsNullOrEmpty(token))
                return Unauthorized();

            var client = _httpClientFactory.CreateClient();
            client.BaseAddress = new Uri(_config["ApiSettings:BaseUrl"]!);
            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", token);

            var res = await client.DeleteAsync($"api/tag/delete/{id}");

            if (!res.IsSuccessStatusCode)
                return BadRequest(new { success = false });

            return new JsonResult(new
            {
                success = true,
                id = id
            });
        }








        // Add tag to note
        public async Task<IActionResult> OnPostAddTagToNoteAsync(Guid noteId, Guid tagId)
        {
            string? token = HttpContext.Request.Cookies["JwtToken"];
            if (string.IsNullOrEmpty(token))
                return Unauthorized();

            var client = _httpClientFactory.CreateClient();
            client.BaseAddress = new Uri(_config["ApiSettings:BaseUrl"]!);
            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", token);

            var res = await client.PostAsync(
                $"api/notetag/add?noteId={noteId}&tagId={tagId}",
                null
            );

            if (!res.IsSuccessStatusCode)
                return BadRequest();

            return new JsonResult(new { success = true });
        }
        // Remove tag from note
        public async Task<IActionResult> OnPostRemoveTagFromNoteAsync(Guid noteId, Guid tagId)
        {
            string? token = HttpContext.Request.Cookies["JwtToken"];
            if (string.IsNullOrEmpty(token))
                return Unauthorized();

            var client = _httpClientFactory.CreateClient();
            client.BaseAddress = new Uri(_config["ApiSettings:BaseUrl"]!);
            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", token);

            var res = await client.DeleteAsync(
                $"api/notetag/remove?noteId={noteId}&tagId={tagId}"
            );

            if (!res.IsSuccessStatusCode)
                return BadRequest();

            return new JsonResult(new { success = true });
        }


        // Toggle reminder for note
        // Create reminder
        public async Task<IActionResult> OnPostCreateReminderAsync([FromBody] CreateReminderModelView model)
        {
            string? token = HttpContext.Request.Cookies["JwtToken"];
            if (string.IsNullOrEmpty(token))
                return Unauthorized();

            var client = _httpClientFactory.CreateClient();
            client.BaseAddress = new Uri(_config["ApiSettings:BaseUrl"]!);
            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", token);

            var res = await client.PostAsJsonAsync("api/reminder/create", model);

            if (!res.IsSuccessStatusCode)
                return BadRequest(new { success = false });

            var apiResponse = await res.Content.ReadFromJsonAsync<
                BaseResponse<ReminderResponseModelView>>();

            return new JsonResult(new
            {
                success = true,
                data = apiResponse?.Data
            });
        }

        // Delete reminder
        public async Task<IActionResult> OnPostDeleteReminderAsync(Guid id)
        {
            string? token = HttpContext.Request.Cookies["JwtToken"];
            if (string.IsNullOrEmpty(token))
                return Unauthorized();

            var client = _httpClientFactory.CreateClient();
            client.BaseAddress = new Uri(_config["ApiSettings:BaseUrl"]!);
            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", token);

            var res = await client.DeleteAsync($"api/reminder/delete/{id}");

            if (!res.IsSuccessStatusCode)
                return BadRequest(new { success = false });

            return new JsonResult(new
            {
                success = true,
                id = id
            });
        }


        // Update reminder
        public async Task<IActionResult> OnPostUpdateReminderAsync([FromBody] UpdateReminderModelView model)
        {
            string? token = HttpContext.Request.Cookies["JwtToken"];
            if (string.IsNullOrEmpty(token))
                return Unauthorized();

            var client = _httpClientFactory.CreateClient();
            client.BaseAddress = new Uri(_config["ApiSettings:BaseUrl"]!);
            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", token);

            var res = await client.PutAsJsonAsync("api/reminder/update", model);

            if (!res.IsSuccessStatusCode)
                return BadRequest();

            return new JsonResult(new { success = true });
        }



        // Get reminders by note
        public async Task<IActionResult> OnGetGetReminderByNoteAsync(Guid noteId)
        {
            string? token = HttpContext.Request.Cookies["JwtToken"];
            if (string.IsNullOrEmpty(token))
                return Unauthorized();

            var client = _httpClientFactory.CreateClient();
            client.BaseAddress = new Uri(_config["ApiSettings:BaseUrl"]!);
            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", token);

            var res = await client.GetFromJsonAsync<
                BaseResponse<List<ReminderResponseModelView>>
            >($"api/reminder/get-by-note/{noteId}");

            if (res == null)
                return BadRequest(new { success = false });

            return new JsonResult(new
            {
                success = true,
                data = res.Data ?? new List<ReminderResponseModelView>()
            });
        }



        public async Task<IActionResult> OnPostCreateNoteAsync([FromBody] CreateNoteModelView model)
        {
            string? token = HttpContext.Request.Cookies["JwtToken"];
            string? userId = HttpContext.Session.GetString("UserId");

            if (string.IsNullOrEmpty(token) ||
                string.IsNullOrEmpty(userId))
                return Unauthorized();

            model.UserId = Guid.Parse(userId);

            var client = _httpClientFactory.CreateClient();
            client.BaseAddress = new Uri(_config["ApiSettings:BaseUrl"]!);
            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", token);

            var res = await client.PostAsJsonAsync("api/note/create", model);

            if (!res.IsSuccessStatusCode)
                return BadRequest();

            var apiResponse =
                await res.Content.ReadFromJsonAsync<
                    BaseResponse<NoteResponseModelView>>();


            if (apiResponse?.Data == null)
                return BadRequest();


            return new JsonResult(new
            {
                success = true,
                id = apiResponse.Data.Id
            });
        }

        public async Task<IActionResult> OnPutUpdateNoteAsync([FromBody] UpdateNoteModelView model)
        {
            string? token = HttpContext.Request.Cookies["JwtToken"];

            if (string.IsNullOrEmpty(token))
                return Unauthorized();

            var client = _httpClientFactory.CreateClient();

            client.BaseAddress =
                new Uri(_config["ApiSettings:BaseUrl"]!);

            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", token);

            var res = await client.PutAsJsonAsync(
                "api/note/update",
                model);

            if (!res.IsSuccessStatusCode)
                return BadRequest(new { success = false });

            return new JsonResult(new
            {
                success = true
            });
        }



    }
}
