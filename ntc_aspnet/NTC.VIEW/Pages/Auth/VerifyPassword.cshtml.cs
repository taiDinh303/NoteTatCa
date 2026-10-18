using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using System.Net.Http.Headers;

namespace NTC.Razor.Pages.Auth
{
    public class VerifyPasswordModel : PageModel
    {
        private readonly IConfiguration _configuration;
        private readonly IHttpClientFactory _httpClientFactory;

        [BindProperty]
        public string? Password { get; set; }

        public VerifyPasswordModel(IConfiguration configuration, IHttpClientFactory httpClientFactory)
        {
            _configuration = configuration;
            _httpClientFactory = httpClientFactory;
        }

        public void OnGet()
        {
        }

        public async Task<IActionResult> OnPostAsync()
        {
            string? userId = HttpContext.Session.GetString("UserId");
            string? token = HttpContext.Request.Cookies["JwtToken"]
                            ?? HttpContext.Session.GetString("JwtToken");

            if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(token))
                return RedirectToPage("/auth/login");

            try
            {
                HttpClient client = _httpClientFactory.CreateClient();
                var baseUrl = _configuration["Apisettings:BaseUrl"];
                if (!baseUrl!.EndsWith("/")) baseUrl += "/";
                client.BaseAddress = new Uri(baseUrl);
                client.DefaultRequestHeaders.Authorization =
                    new AuthenticationHeaderValue("Bearer", token);

                var body = new { UserId = userId, Password };
                var response = await client.PostAsJsonAsync("/api/auth/verify-password", body);

                if (response.IsSuccessStatusCode)
                {
                    HttpContext.Session.SetString("VerifiedPassword", "true");

                    string? returnUrl = HttpContext.Session.GetString("ReturnUrl") ?? "/";
                    HttpContext.Session.Remove("ReturnUrl");

                    return Redirect(returnUrl);
                }
                else
                {
                    ViewData["ErrorMessage"] = "Incorrect password.";

                }
            }
            catch (Exception ex)
            {
                ViewData["ErrorMessage"] = $"System error: {ex.Message}";
            }

            return Page();
        }

    }
}
