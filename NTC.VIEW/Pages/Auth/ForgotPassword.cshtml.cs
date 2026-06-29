using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace NTC.Razor.Pages.Auth
{
    public class ForgotPasswordModel : PageModel
    {
        private readonly IConfiguration _config;
        private readonly IHttpClientFactory _httpClientFactory;

        public ForgotPasswordModel(IConfiguration config, IHttpClientFactory factory)
        {
            _config = config;
            _httpClientFactory = factory;
        }

        [BindProperty]
        public string Email { get; set; } = string.Empty;

        public string? ErrorMessage { get; set; }
        public string? SuccessMessage { get; set; }

        public async Task<IActionResult> OnPostAsync()
        {
            try
            {
                var client = _httpClientFactory.CreateClient();
                var baseUrl = _config["Apisettings:BaseUrl"];
                if (!baseUrl.EndsWith("/")) baseUrl += "/";

                client.BaseAddress = new Uri(baseUrl);

                var response = await client.PostAsJsonAsync("api/auth/send-forgot-password-link", Email);

                if (response.IsSuccessStatusCode)
                {
                    SuccessMessage = "A password reset link has been sent to your email!";
                    return Page();
                }

                ErrorMessage = await response.Content.ReadAsStringAsync();
            }
            catch (Exception ex)
            {
                ErrorMessage = $"System error: {ex.Message}";
            }

            return Page();
        }
    }
}
