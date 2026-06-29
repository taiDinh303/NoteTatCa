using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using NTC.Core.Base;
using NTC.ModelViews.AuthModelView;
using NTC.Razor.Middleware;

namespace NTC.Razor.Pages.Auth.External
{
    public class GoogleCallbackModel : PageModel
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;

        public GoogleCallbackModel(IHttpClientFactory httpClientFactory, IConfiguration configuration)
        {
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
        }

        public async Task<IActionResult> OnGetAsync(string id_token)
        {
            if (string.IsNullOrEmpty(id_token))
                return RedirectToPage("/auth/login", new { error = "Missing Google token" });

            var client = _httpClientFactory.CreateClient();
            client.BaseAddress = new Uri(_configuration["Apisettings:BaseUrl"]);

            var response = await client.PostAsJsonAsync("/api/auth/google-login", new { IdToken = id_token });

            if (!response.IsSuccessStatusCode)
                return RedirectToPage("/auth/login", new { error = "Google login failed" });

            var result = await response.Content.ReadFromJsonAsync<BaseResponse<AuthResponseModelView>>();
            if (result?.Data == null)
                return RedirectToPage("/auth/login", new { error = "Invalid Google login response" });

            var authResult = result.Data;

            // 🔹 Lưu JWT cookie
            var cookieOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = true, // nếu localhost, có thể tạm thời false
                IsEssential = true,
                Expires = DateTimeOffset.UtcNow.AddHours(1) // hoặc dựa vào RememberMe
            };
            Response.Cookies.Append("JwtToken", authResult.Token, cookieOptions);

            // 🔹 Lưu session ngay
            HttpContext.Session.SetUserInfo(authResult);

            return RedirectToPage("/Index");
        }
    }
}
