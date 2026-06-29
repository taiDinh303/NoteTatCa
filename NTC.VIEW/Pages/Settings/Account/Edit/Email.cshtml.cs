using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;
using System.Net.Http.Headers;
using NTC.Core.Base;
using NTC.ModelViews.UserModelView; // hoặc nơi bạn đặt UpdateEmailModelView


namespace NTC.Razor.Pages.Settings.Account.Edit
{
    public class EmailModel : PageModel
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _configuration;

        public EmailModel(IHttpClientFactory httpClientFactory, IConfiguration configuration)
        {
            _httpClientFactory = httpClientFactory;
            _configuration = configuration;
        }

        [BindProperty]
        public string? Email { get; set; }


        public void OnGet()
        {
            if (HttpContext.Session.GetString("VerifiedPassword") != "true")
            {
                // Lưu URL hiện tại
                HttpContext.Session.SetString("ReturnUrl", "/settings/account/edit/email");
                Response.Redirect("/auth/verify-password");
            }
        }


        public async Task<IActionResult> OnPostAsync()
        {
            string? userId = HttpContext.Session.GetString("UserId");
            string? token = HttpContext.Request.Cookies["JwtToken"] ?? HttpContext.Session.GetString("JwtToken");

            if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(token))
                return RedirectToPage("/Auth/Login");

            try
            {
                var client = _httpClientFactory.CreateClient();
                var baseUrl = _configuration["Apisettings:BaseUrl"];
                if (!baseUrl!.EndsWith("/")) baseUrl += "/";
                client.BaseAddress = new Uri(baseUrl);
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

                var updateModel = new UpdateEmailModelView
                {
                    Id = Guid.Parse(userId),
                    Email = Email?.Trim() ?? string.Empty
                };

                var response = await client.PostAsJsonAsync("/api/user/send-change-email", updateModel);

                if (response.IsSuccessStatusCode)
                {
                    ViewData["SuccessMessage"] = "Confirmation email has been sent. Please check your inbox.";
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
