using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace NTC.Razor.Middlewares
{
    public class JwtSessionMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<JwtSessionMiddleware> _logger;

        public JwtSessionMiddleware(RequestDelegate next, ILogger<JwtSessionMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                if (string.IsNullOrEmpty(context.Session.GetString("UserId")) &&
                    context.Request.Cookies.TryGetValue("JwtToken", out var token))
                {
                    var handler = new JwtSecurityTokenHandler();
                    var jwt = handler.ReadJwtToken(token);

                    if (jwt.ValidTo < DateTime.UtcNow)
                    {
                        _logger.LogWarning("JWT token expired at {exp}", jwt.ValidTo);
                        context.Response.Cookies.Delete("JwtToken");
                        await _next(context);
                        return;
                    }

                    void SetSessionClaim(string key, string? claimType)
                    {
                        var value = jwt.Claims.FirstOrDefault(c => c.Type == claimType)?.Value ?? string.Empty;
                        context.Session.SetString(key, value);
                    }

                    SetSessionClaim("UserId", JwtRegisteredClaimNames.Sub);
                    SetSessionClaim("UserName", ClaimTypes.Name);
                    SetSessionClaim("FullName", "fullName");
                    SetSessionClaim("Picture", "picture");
                    context.Session.SetString("JwtToken", token);


                    _logger.LogInformation("✅ Session restored from JWT for user {user}",
                        context.Session.GetString("UserName"));
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error parsing JWT token. Cookie deleted.");
                context.Response.Cookies.Delete("JwtToken");
            }

            await _next(context);
        }
    }
}
