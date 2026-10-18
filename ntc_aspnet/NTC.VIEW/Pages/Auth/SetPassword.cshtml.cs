using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.AspNetCore.WebUtilities;
using System.Text;

namespace NTC.Razor.Pages.Auth
{
    public class SetPasswordModel : PageModel
    {
        private readonly IConfiguration _configuration;
        private readonly IHttpClientFactory _httpClientFactory;

        public SetPasswordModel(IConfiguration configuration, IHttpClientFactory httpClientFactory)
        {
            _configuration = configuration;
            _httpClientFactory = httpClientFactory;
        }

        [BindProperty(SupportsGet = true)]
        public Guid UserId { get; set; }

        [BindProperty(SupportsGet = true)]
        public string? Token { get; set; }

        [BindProperty]
        public string? NewPassword { get; set; }

        [BindProperty]
        public string? ConfirmPassword { get; set; }

        public string? ErrorMessage { get; set; }
        public string? SuccessMessage { get; set; }

        public void OnGet()
        {
        }

        public async Task<IActionResult> OnPostAsync()
        {
            if (NewPassword != ConfirmPassword)
            {
                ErrorMessage = "Password confirmation does not match.";
                return Page();
            }

            if (UserId == Guid.Empty || string.IsNullOrEmpty(Token))
            {
                ErrorMessage = "Invalid link.";
                return Page();
            }

            try
            {
                var client = _httpClientFactory.CreateClient();

                var baseUrl = _configuration["Apisettings:BaseUrl"];
                if (!baseUrl!.EndsWith("/")) baseUrl += "/";

                client.BaseAddress = new Uri(baseUrl);

                var request = new
                {
                    userId = UserId,
                    token = Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(Token)),
                    newPassword = NewPassword
                };

                var response = await client.PostAsJsonAsync("api/user/set-password", request);

                if (response.IsSuccessStatusCode)
                {
                    SuccessMessage = "Password has been successfully set! You can now log in with your new password.";
                }
                else
                {
                    ErrorMessage = await response.Content.ReadAsStringAsync();
                }
            }
            catch (Exception ex)
            {
                ErrorMessage = $"System error: {ex.Message}";
            }

            return Page();
        }
    }
}