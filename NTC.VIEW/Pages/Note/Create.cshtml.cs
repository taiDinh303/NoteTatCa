using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using System.Net.Http.Headers;
using NTC.ModelViews.NoteModelView;

namespace NTC.Razor.Pages.Note
{
    public class CreateModel : PageModel
    {
        private readonly IConfiguration _config;
        private readonly IHttpClientFactory _httpClientFactory;

        [BindProperty]
        public CreateNoteModelView Note { get; set; } = new();

        public CreateModel(IConfiguration config, IHttpClientFactory httpClientFactory)
        {
            _config = config;
            _httpClientFactory = httpClientFactory;
        }

        public IActionResult OnGet() => Page();

        public async Task<IActionResult> OnPostAsync()
        {
            string? token = HttpContext.Request.Cookies["JwtToken"];
            string? userId = HttpContext.Session.GetString("UserId");

            if (string.IsNullOrEmpty(token) || string.IsNullOrEmpty(userId))
                return RedirectToPage("/Auth/Login");

            Note.UserId = Guid.Parse(userId);

            var client = _httpClientFactory.CreateClient();
            client.BaseAddress = new Uri(_config["ApiSettings:BaseUrl"]!);
            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", token);

            var res = await client.PostAsJsonAsync("api/note/create", Note);

            if (res.IsSuccessStatusCode)
                return RedirectToPage("Index");

            ViewData["ErrorMessage"] = "Cannot create note.";
            return Page();
        }
    }
}
