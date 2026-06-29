using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using System.Net.Http.Headers;
using NTC.Core.Base;
using NTC.ModelViews.UserInfoModelView;

namespace NTC.Razor.Pages.Settings.Profile.Edit
{
    public class NameModel : PageModel
    {
        private readonly IConfiguration _configuration;
        private readonly IHttpClientFactory _httpClientFactory;

        [BindProperty]
        public string? FamilyName { get; set; }

        [BindProperty]
        public string? GivenName { get; set; }

        public NameModel(IConfiguration configuration, IHttpClientFactory httpClientFactory)
        {
            _configuration = configuration;
            _httpClientFactory = httpClientFactory;
        }

        public async Task<IActionResult> OnGetAsync()
        {
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
                client.DefaultRequestHeaders.Authorization =
                    new AuthenticationHeaderValue("Bearer", token);

                var response = await client.GetAsync($"/api/userinfo/get-by-id/{userId}");

                if (response.IsSuccessStatusCode)
                {
                    var result = await response.Content.ReadFromJsonAsync<BaseResponse<UserInfoResponseModelView>>();

                    if (result?.Data != null)
                    {
                        GivenName = result.Data.GivenName ?? "";
                        FamilyName = result.Data.FamilyName ?? "";

                        // Ghi session
                        string fullName = string.IsNullOrWhiteSpace(FamilyName)
                            ? GivenName
                            : $"{GivenName} {FamilyName}".Trim();
                        HttpContext.Session.SetString("FullName", fullName);
                    }
                    else
                    {
                        ViewData["ErrorMessage"] = "Cannot load user information.";
                    }
                }
                else
                {
                    ViewData["ErrorMessage"] = "Cannot load user information.";
                }
            }
            catch (Exception ex)
            {
                ViewData["ErrorMessage"] = $"System error: {ex.Message}";
            }

            return Page();
        }


        public async Task<IActionResult> OnPostAsync()
        {
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
                client.DefaultRequestHeaders.Authorization =
                    new AuthenticationHeaderValue("Bearer", token);

                var updateModel = new UpdateNameModelView
                {
                    UserId = Guid.Parse(userId),
                    GivenName = GivenName ?? string.Empty,
                    FamilyName = FamilyName ?? string.Empty
                };

                var response = await client.PutAsJsonAsync("/api/userinfo/update-name", updateModel);

                if (response.IsSuccessStatusCode)
                {
                    return RedirectToPage("/settings/profile/index");
                }
                else
                {
                    var errorResponse = await response.Content.ReadFromJsonAsync<BaseResponse<object>>();
                    ViewData["ErrorMessage"] = errorResponse?.Message ?? "An error occurred.";
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
