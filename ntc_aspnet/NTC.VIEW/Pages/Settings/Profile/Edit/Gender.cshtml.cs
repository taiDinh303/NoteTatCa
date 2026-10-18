using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using System.Net.Http.Headers;
using NTC.Contract.Repositories.Entities;
using NTC.Core.Base;
using NTC.ModelViews.UserInfoModelView;

namespace NTC.Razor.Pages.Settings.Profile.Edit
{
    public class GenderModel : PageModel
    {
        private readonly IConfiguration _configuration;
        private readonly IHttpClientFactory _httpClientFactory;

        [BindProperty]
        public GenderType Gender { get; set; }

        public GenderModel(IConfiguration configuration, IHttpClientFactory httpClientFactory)
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
            string? token = HttpContext.Request.Cookies["JwtToken"] ?? HttpContext.Session.GetString("JwtToken");

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

                var updateModel = new UpdateUserInfoModelView
                {
                    UserId = Guid.Parse(userId),
                    Gender = Gender
                };

                HttpResponseMessage response = await client.PutAsJsonAsync("/api/userinfo/update", updateModel);

                if (response.IsSuccessStatusCode)
                {
                    HttpContext.Session.SetString("Gender", Gender.ToString());
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
