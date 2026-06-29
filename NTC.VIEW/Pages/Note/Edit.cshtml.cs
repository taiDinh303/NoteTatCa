using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using System.Net.Http.Headers;
using NTC.Core.Base;
using NTC.ModelViews.NoteModelView;

namespace NTC.Razor.Pages.Note
{
    public class EditModel : PageModel
    {
        private readonly IConfiguration _config;
        private readonly IHttpClientFactory _httpClientFactory;

        [BindProperty]
        public UpdateNoteModelView Note { get; set; } = new();

        public EditModel(IConfiguration config, IHttpClientFactory httpClientFactory)
        {
            _config = config;
            _httpClientFactory = httpClientFactory;
        }

        public async Task<IActionResult> OnGetAsync(Guid id)
        {
            string? token = HttpContext.Request.Cookies["JwtToken"];
            if (string.IsNullOrEmpty(token))
                return RedirectToPage("/Auth/Login");

            var client = _httpClientFactory.CreateClient();
            client.BaseAddress = new Uri(_config["ApiSettings:BaseUrl"]!);
            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", token);

            var res = await client.GetFromJsonAsync<
                BaseResponse<NoteResponseModelView>
            >($"api/note/get-by-id/{id}");

            if (res?.Data == null) return RedirectToPage("Index");

            Note = new UpdateNoteModelView
            {
                Id = res.Data.Id,
                Title = res.Data.Title,
                Content = res.Data.Content,
                IsCompleted = res.Data.IsCompleted,
                DueDate = res.Data.DueDate,
                IsPinned = res.Data.IsPinned,
                Priority = res.Data.Priority
            };

            return Page();
        }

        public async Task<IActionResult> OnPostAsync()
        {
            string? token = HttpContext.Request.Cookies["JwtToken"];
            if (string.IsNullOrEmpty(token))
                return RedirectToPage("/Auth/Login");

            var client = _httpClientFactory.CreateClient();
            client.BaseAddress = new Uri(_config["ApiSettings:BaseUrl"]!);
            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", token);

            var res = await client.PutAsJsonAsync("api/note/update", Note);

            if (res.IsSuccessStatusCode)
                return RedirectToPage("Index");

            ViewData["ErrorMessage"] = "Cannot update note.";
            return Page();
        }
    }
}
