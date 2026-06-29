using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace NTC.Razor.Pages.Auth
{
    public class LogoutModel : PageModel
    {
        public IActionResult OnGet()
        {
            HttpContext.Session.Clear();
            Response.Cookies.Delete("JwtToken");

            // Xoá thêm các cookie khác liên quan user (nếu có)
            Response.Cookies.Delete(".AspNetCore.Session");

            return RedirectToPage("/auth/login");
        }

    }
}
