using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using System.Net.Http.Headers;
using System.Text.Json;
using NTC.Core.Base;
using NTC.ModelViews.UserModelView;

namespace NTC.Razor.Pages.Settings.Account.Edit
{
    public class PasswordModel : PageModel
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;

        public PasswordModel(IHttpClientFactory httpClientFactory, IConfiguration configuration)
        {
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
        }
        [BindProperty]
        public string CurrentPassword { get; set; } = string.Empty;
        [BindProperty]
        public string NewPassword { get; set; } = string.Empty;
        [BindProperty]
        public string ConfirmPassword { get; set; } = string.Empty;

        public void OnGet()
        {
            if (HttpContext.Session.GetString("VerifiedPassword") != "true")
            {
                // Store current URL to return after verification
                HttpContext.Session.SetString("ReturnUrl", "/settings/account/edit/password");
                Response.Redirect("/auth/verify-password");
            }
        }

        public async Task<IActionResult> OnPostAsync()
        {
            if (NewPassword != ConfirmPassword)
            {
                ViewData["ErrorMessage"] = "New password and confirmation do not match.";
                return Page();
            }

            string? userId = HttpContext.Session.GetString("UserId");
            string? token = HttpContext.Request.Cookies["JwtToken"] ?? HttpContext.Session.GetString("JwtToken");

            if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(token))
                return RedirectToPage("/auth/login");

            try
            {
                var client = _httpClientFactory.CreateClient();
                var baseUrl = _configuration["Apisettings:BaseUrl"];
                if (!baseUrl!.EndsWith("/")) baseUrl += "/";
                client.BaseAddress = new Uri(baseUrl);
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

                var changePasswordModel = new ChangePasswordModelView
                {
                    UserId = Guid.Parse(userId),
                    CurrentPassword = CurrentPassword,
                    NewPassword = NewPassword
                };

                var response = await client.PostAsJsonAsync("/api/user/change-password", changePasswordModel);

                if (response.IsSuccessStatusCode)
                {
                    ViewData["SuccessMessage"] = "Password changed successfully";
                }
                else
                {
                    var errJson = await response.Content.ReadAsStringAsync();

                    try
                    {
                        // Deserialize JSON according to BaseResponse
                        var errorObj = JsonSerializer.Deserialize<BaseResponse<string>>(errJson,
                            new JsonSerializerOptions
                            {
                                PropertyNameCaseInsensitive = true
                            });

                        ViewData["ErrorMessage"] = errorObj?.Message ?? "Password change failed";
                    }
                    catch
                    {
                        // Fallback if JSON is invalid
                        ViewData["ErrorMessage"] = errJson;
                    }
                }
            }
            catch (HttpRequestException ex)
            {
                ViewData["ErrorMessage"] = $"Cannot connect to API: {ex.Message}";
            }
            catch (Exception ex)
            {
                ViewData["ErrorMessage"] = $"System error: {ex.Message}";
            }

            return Page();
        }
    }
}
