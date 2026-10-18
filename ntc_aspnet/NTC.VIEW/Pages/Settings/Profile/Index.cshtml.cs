using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using System.Net.Http.Headers;
using NTC.Core.Base;
using NTC.ModelViews.UserInfoModelView;

namespace NTC.Razor.Pages.Settings.Profile
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

        public UserInfoResponseModelView? UserInfoData { get; set; }

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
                client.DefaultRequestHeaders.Authorization =
                    new AuthenticationHeaderValue("Bearer", token);

                var response = await client.GetAsync($"/api/userinfo/get-by-id/{userId}");

                if (response.IsSuccessStatusCode)
                {
                    var result = await response.Content.ReadFromJsonAsync<BaseResponse<UserInfoResponseModelView>>();
                    UserInfoData = result?.Data;

                    if (UserInfoData != null)
                    {
                        string givenName = UserInfoData.GivenName ?? "";
                        string familyName = UserInfoData.FamilyName ?? "";

                        string fullName = string.IsNullOrWhiteSpace(familyName)
                            ? givenName
                            : $"{givenName} {familyName}".Trim();
                        HttpContext.Session.SetString("FullName", fullName);
                    }
                }
                else if (response.StatusCode == System.Net.HttpStatusCode.Unauthorized)
                {
                    HttpContext.Session.Clear();
                    Response.Cookies.Delete("JwtToken");
                    return RedirectToPage("/auth/login");
                }
                else
                {
                    ViewData["ErrorMessage"] = "Unable to load user information.";


                }
            }
            catch (Exception ex)
            {
                ViewData["ErrorMessage"] = $"Error calling the API: {ex.Message}";
            }

            return Page();
        }
    }
}
