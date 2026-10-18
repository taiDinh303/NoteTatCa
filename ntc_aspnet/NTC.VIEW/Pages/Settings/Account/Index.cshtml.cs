using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using System.Net.Http.Headers;
using NTC.Core.Base;
using NTC.ModelViews.UserInfoModelView; // For user info

namespace NTC.Razor.Pages.Settings.Account
{
    public class IndexModel : PageModel
    {
        private readonly IConfiguration _configuration;
        private readonly IHttpClientFactory _httpClientFactory;

        public IndexModel(IConfiguration configuration, IHttpClientFactory httpClientFactory)
        {
            _configuration = configuration;
            _httpClientFactory = httpClientFactory;
        }

        public bool IsGoogleConnected { get; set; }

        // User data to display email, phone, etc.
        public UserResponseModelView? UserData { get; set; }

        public string PasswordStatus => UserData?.HasPassword == true ? "Set" : "Not Set";

        public async Task<IActionResult> OnGetAsync()
        {
            string? userId = HttpContext.Session.GetString("UserId");
            string? token = HttpContext.Request.Cookies["JwtToken"] ?? HttpContext.Session.GetString("JwtToken");

            if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(token))
                return RedirectToPage("/auth/login");

            try
            {
                var client = _httpClientFactory.CreateClient();
                client.BaseAddress = new Uri(_configuration["Apisettings:BaseUrl"]!);
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

                // 1. Get user info
                var userResponse = await client.GetAsync($"/api/user/get-by-id/{userId}");
                if (userResponse.IsSuccessStatusCode)
                {
                    var result = await userResponse.Content.ReadFromJsonAsync<BaseResponse<UserResponseModelView>>();
                    UserData = result?.Data;
                }
                else if (userResponse.StatusCode == System.Net.HttpStatusCode.Unauthorized)
                {
                    HttpContext.Session.Clear();
                    Response.Cookies.Delete("JwtToken");
                    return RedirectToPage("/auth/login");
                }

                // 2. Check Google connection status
                var googleResponse = await client.GetAsync($"/api/userlogin/is-connected?userId={userId}&provider=Google");
                if (googleResponse.IsSuccessStatusCode)
                {
                    var result = await googleResponse.Content.ReadFromJsonAsync<BaseResponse<bool>>();
                    IsGoogleConnected = result?.Data ?? false;
                }
                else if (googleResponse.StatusCode == System.Net.HttpStatusCode.Unauthorized)
                {
                    HttpContext.Session.Clear();
                    Response.Cookies.Delete("JwtToken");
                    return RedirectToPage("/auth/login");
                }
                else
                {
                    ViewData["ErrorMessage"] = "Unable to check Google connection status.";
                }
            }
            catch (Exception ex)
            {
                ViewData["ErrorMessage"] = $"Error calling API: {ex.Message}";
            }

            return Page();
        }

        // Send set-password email
        public async Task<IActionResult> OnPostSendSetPasswordEmailAsync()
        {
            string? userId = HttpContext.Session.GetString("UserId");
            string? token = HttpContext.Request.Cookies["JwtToken"];

            if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(token))
                return RedirectToPage("/auth/login");

            var client = _httpClientFactory.CreateClient();
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var baseUrl = _configuration["Apisettings:BaseUrl"];
            if (!baseUrl!.EndsWith("/")) baseUrl += "/";
            client.BaseAddress = new Uri(baseUrl);

            var response = await client.PostAsync($"/api/user/send-set-password-email/{userId}", null);

            if (response.IsSuccessStatusCode)
            {
                ViewData["SuccessMessage"] = "Set-password email has been sent. Please check your inbox!";
            }
            else
            {
                ViewData["ErrorMessage"] = "Failed to send set-password email.";
            }

            return RedirectToPage();
        }



        // Connect Google account
        public async Task<IActionResult> OnPostConnectGoogleAsync()
        {
            string? userId = HttpContext.Session.GetString("UserId");
            string? token = HttpContext.Request.Cookies["JwtToken"] ?? HttpContext.Session.GetString("JwtToken");

            if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(token))
                return RedirectToPage("/auth/login");

            try
            {
                var client = _httpClientFactory.CreateClient();
                client.BaseAddress = new Uri(_configuration["Apisettings:BaseUrl"]!);
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

                var providerKey = $"Google_{userId}";
                var response = await client.PostAsync($"/api/userlogin/connect?userId={userId}&provider=Google&providerKey={providerKey}", null);

                if (response.IsSuccessStatusCode)
                {
                    TempData["SuccessMessage"] = "Google connected successfully!";
                }
                else
                {
                    ViewData["ErrorMessage"] = "Failed to connect Google account.";
                }
            }
            catch (Exception ex)
            {
                ViewData["ErrorMessage"] = $"Error calling API: {ex.Message}";
            }

            return RedirectToPage();
        }

        // Disconnect Google account
        public async Task<IActionResult> OnPostDisconnectGoogleAsync()
        {
            string? userId = HttpContext.Session.GetString("UserId");
            string? token = HttpContext.Request.Cookies["JwtToken"] ?? HttpContext.Session.GetString("JwtToken");

            if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(token))
                return RedirectToPage("/auth/login");

            try
            {
                var client = _httpClientFactory.CreateClient();
                client.BaseAddress = new Uri(_configuration["Apisettings:BaseUrl"]!);
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

                var response = await client.DeleteAsync($"/api/userlogin/disconnect?userId={userId}&provider=Google");

                if (response.IsSuccessStatusCode)
                {
                    TempData["SuccessMessage"] = "Google disconnected successfully!";
                }
                else
                {
                    ViewData["ErrorMessage"] = "Failed to disconnect Google account.";
                }
            }
            catch (Exception ex)
            {
                ViewData["ErrorMessage"] = $"Error calling API: {ex.Message}";
            }

            return RedirectToPage();
        }


    }
}
