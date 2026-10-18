using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using System.Text.Json;
using NTC.Core.Base;
using NTC.ModelViews.AuthModelView;

namespace NTC.Razor.Pages.Auth
{
    public class RegisterModel : PageModel
    {
        private readonly IConfiguration _configuration;
        private readonly IHttpClientFactory _httpClientFactory;

        public RegisterModel(IConfiguration configuration, IHttpClientFactory httpClientFactory)
        {
            _configuration = configuration;
            _httpClientFactory = httpClientFactory;
        }

        [BindProperty]
        public RegisterModelView Input { get; set; } = new();

        public string? SuccessMessage { get; set; }
        public string? ErrorMessage { get; set; }

        public void OnGet()
        {
        }

        // Submit => create user
        public async Task<IActionResult> OnPostSubmitAsync()
        {
            if (!ModelState.IsValid)
                return Page();

            try
            {
                var http = _httpClientFactory.CreateClient();
                string baseUrl = _configuration["Apisettings:BaseUrl"]!;
                if (!baseUrl.EndsWith("/")) baseUrl += "/";
                http.BaseAddress = new Uri(baseUrl);

                var response = await http.PostAsJsonAsync("api/auth/register", Input);

                if (response.IsSuccessStatusCode)
                {
                    SuccessMessage = "User created successfully!";
                    return Page();
                }

                var errText = await response.Content.ReadAsStringAsync();
                var errObj = JsonSerializer.Deserialize<BaseResponse<string>>(errText,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                ErrorMessage = errObj?.Message ?? "Submit failed.";
            }
            catch (Exception ex)
            {
                ErrorMessage = $"System error: {ex.Message}";
            }

            return Page();
        }
    }
}
