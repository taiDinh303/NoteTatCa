using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using NTC.Core.Base;
using NTC.ModelViews.AuthModelView;
using NTC.Razor.Middleware;

namespace NTC.Razor.Pages.Auth
{
    public class LoginModel : PageModel
    {
        private readonly IConfiguration _configuration;
        private readonly IHttpClientFactory _httpClientFactory;

        public LoginModel(IConfiguration configuration, IHttpClientFactory httpClientFactory)
        {
            _configuration = configuration;
            _httpClientFactory = httpClientFactory;
        }

        [BindProperty]
        public LoginModelView Input { get; set; } = new();

        public string? ErrorMessage { get; set; }

        public void OnGet()
        {
            // Clear any existing session if the user logs out or revisits the login page
            HttpContext.Session.Clear();
        }

        public async Task<IActionResult> OnPostAsync()
        {
            if (!ModelState.IsValid)
                return Page();

            var client = _httpClientFactory.CreateClient();
            client.BaseAddress = new Uri(_configuration["Apisettings:BaseUrl"]!);

            try
            {
                // Call Login API
                HttpResponseMessage response = await client.PostAsJsonAsync("/api/auth/login", Input);

                if (!response.IsSuccessStatusCode)
                {
                    ErrorMessage = "Incorrect username or password.";
                    return Page();
                }

                var result = await response.Content.ReadFromJsonAsync<BaseResponse<AuthResponseModelView>>();

                if (result?.Data == null)
                {
                    ErrorMessage = "Invalid response from the server.";
                    return Page();
                }

                // 🔹 Save JWT to cookie (token only)
                var cookieOptions = new CookieOptions
                {
                    Expires = result.Data.ExpiredAt,
                    HttpOnly = true,
                    Secure = true, // enable if the site runs on HTTPS
                    IsEssential = true
                };

                Response.Cookies.Append("JwtToken", result.Data.Token, cookieOptions);

                // 🔹 Save user info in session
                HttpContext.Session.SetUserInfo(result.Data);

                await HttpContext.Session.CommitAsync();

                return RedirectToPage("/Index");
            }
            catch (HttpRequestException httpEx)
            {
                ErrorMessage = $"Unable to connect to the API: {httpEx.Message}";
                return Page();
            }
            catch (Exception ex)
            {
                ErrorMessage = $"Unexpected error: {ex.Message}";
                return Page();
            }
        }
    }
}
