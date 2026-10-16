using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using NTC.Core.Base;
using NTC.ModelViews.NoteModelView;
using NTC.ModelViews.TagModelView;

namespace NTC.Razor.Pages.Note
{
    public class TrashModel : PageModel
    {
        private readonly IConfiguration _config;
        private readonly IHttpClientFactory _httpClientFactory;

        public BasePaginatedList<NoteResponseModelView>? Notes { get; set; }
        public BasePaginatedList<TagResponseModelView>? Tags { get; set; }

        public TrashModel(IConfiguration config, IHttpClientFactory httpClientFactory)
        {
            _config = config;
            _httpClientFactory = httpClientFactory;
        }
        //
        public async Task<IActionResult> OnGetAsync(int pageNumber = 1, int pageSize = 50)
        {
            string? token = HttpContext.Request.Cookies["JwtToken"];

            if (string.IsNullOrEmpty(token))
                return RedirectToPage("/Auth/Login");

            var client = _httpClientFactory.CreateClient();
            client.BaseAddress = new Uri(_config["ApiSettings:BaseUrl"]!);
            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", token);

            var noteRes = await client.GetFromJsonAsync<
                BaseResponse<BasePaginatedList<NoteResponseModelView>>
            >($"api/note/get-trash?pageNumber={pageNumber}&pageSize={pageSize}");

            Notes = noteRes?.Data;

            var tagRes = await client.GetFromJsonAsync<
                BaseResponse<BasePaginatedList<TagResponseModelView>>
            >("api/tag/get-all?pageNumber=1&pageSize=50");

            Tags = tagRes?.Data;

            return Page();
        }

        //
        public async Task<IActionResult> OnGetNotesPartialAsync(int pageNumber = 1, int pageSize = 50)
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
            >($"api/note/get-trash?pageNumber={pageNumber}&pageSize={pageSize}");

            return Partial(
                "~/Pages/Note/Partials/_NoteTrashListPartial.cshtml",
                res?.Data
            );
        }

        // Restore note
        public async Task<IActionResult> OnPostRestoreAsync(Guid id)
        {
            string? token = HttpContext.Request.Cookies["JwtToken"];
            if (string.IsNullOrEmpty(token))
                return Unauthorized();

            var client = _httpClientFactory.CreateClient();
            client.BaseAddress = new Uri(_config["ApiSettings:BaseUrl"]!);
            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", token);

            var res = await client.DeleteAsync($"api/note/restore/{id}");

            if (!res.IsSuccessStatusCode)
                return BadRequest(new { success = false });

            return new JsonResult(new { success = true });
        }

    }
}