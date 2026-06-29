using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

public class ConfirmChangeEmailModel : PageModel
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;

    public ConfirmChangeEmailModel(IHttpClientFactory httpClientFactory, IConfiguration configuration)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
    }

    public async Task<IActionResult> OnGetAsync(Guid userId, string token, string newEmail)
    {
        if (string.IsNullOrEmpty(newEmail))
        {
            ViewData["ErrorMessage"] = "Missing new email information in the confirmation link.";
            return Page();
        }

        try
        {
            var client = _httpClientFactory.CreateClient();
            var baseUrl = _configuration["Apisettings:BaseUrl"];
            if (!baseUrl!.EndsWith("/")) baseUrl += "/";
            client.BaseAddress = new Uri(baseUrl);

            string encodedEmail = Uri.EscapeDataString(newEmail);
            string url = $"/api/user/confirm-change-email?userId={userId}&token={token}&newEmail={encodedEmail}";

            var response = await client.GetAsync(url);

            if (response.IsSuccessStatusCode)
            {
                ViewData["SuccessMessage"] = "Email change confirmed successfully!";
            }
            else
            {
                var err = await response.Content.ReadAsStringAsync();
                ViewData["ErrorMessage"] = $"Confirmation failed: {err}";
            }
        }
        catch (Exception ex)
        {
            ViewData["ErrorMessage"] = $"System error: {ex.Message}";
        }

        return Page();
    }
}
