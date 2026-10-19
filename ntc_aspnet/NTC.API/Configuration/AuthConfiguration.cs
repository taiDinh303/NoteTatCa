using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using NTC.Contract.Repositories.Entities;
using NTC.Repositories.Context;
namespace NTC.API.Configuration;
public static class AuthConfiguration
{
    public const string WorkspacePolicy = "CustomerWorkspace";
    public static void AddIdentityAndBearer(this IServiceCollection services)
    {
        services.AddIdentityCore<ApplicationUser>(options =>
        {
            options.Password.RequiredLength = 8; options.Password.RequireDigit = false; options.Password.RequireLowercase = false;
            options.Password.RequireUppercase = false; options.Password.RequireNonAlphanumeric = false;
            options.User.RequireUniqueEmail = true; options.SignIn.RequireConfirmedEmail = true;
            options.Lockout.AllowedForNewUsers = true; options.Lockout.MaxFailedAccessAttempts = 5; options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(5);
        }).AddRoles<ApplicationRole>().AddEntityFrameworkStores<DatabaseContext>().AddDefaultTokenProviders();
        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer();
        services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme).Configure<IConfiguration>((options, config) =>
        {
            var key = config["Jwtsettings:Key"];
            if (string.IsNullOrWhiteSpace(key) || Encoding.UTF8.GetByteCount(key) < 32 || string.IsNullOrWhiteSpace(config["Jwtsettings:Issuer"]) || string.IsNullOrWhiteSpace(config["Jwtsettings:Audience"]))
                throw new InvalidOperationException("JWT signing key (at least 32 bytes), issuer and audience are required.");
            options.MapInboundClaims = true;
            options.TokenValidationParameters = new()
            {
                ValidateIssuer = true, ValidIssuer = config["Jwtsettings:Issuer"], ValidateAudience = true, ValidAudience = config["Jwtsettings:Audience"],
                ValidateLifetime = true, ClockSkew = TimeSpan.FromSeconds(30), ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)), ValidAlgorithms = [SecurityAlgorithms.HmacSha256]
            };
            options.Events = new JwtBearerEvents
            {
                OnTokenValidated = async context =>
                {
                    var principal = context.Principal!;
                    if (!Guid.TryParse(principal.FindFirstValue(ClaimTypes.NameIdentifier), out var userId)
                        || !Guid.TryParse(principal.FindFirstValue("sid"), out var sid)) { context.Fail("Invalid session."); return; }
                    var db = context.HttpContext.RequestServices.GetRequiredService<DatabaseContext>();
                    var now = context.HttpContext.RequestServices.GetRequiredService<TimeProvider>().GetUtcNow();
                    var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == userId, context.HttpContext.RequestAborted);
                    var session = await db.RefreshSessions.AsNoTracking().FirstOrDefaultAsync(x => x.Id == sid && x.UserId == userId, context.HttpContext.RequestAborted);
                    if (user == null || user.IsLocked || user.DeletedTime != null || !user.EmailConfirmed || user.LockoutEnd > now
                        || session == null || session.RevokedAt != null || session.ExpiresAt <= now || session.SecurityStamp != user.SecurityStamp
                        || principal.FindFirstValue("stamp") != user.SecurityStamp) { context.Fail("Session is unavailable."); return; }
                    var roles = await (from link in db.UserRoles where link.UserId == userId
                        join role in db.Roles.Where(x => x.DeletedTime == null) on link.RoleId equals role.Id
                        select role.Name!).ToListAsync(context.HttpContext.RequestAborted);
                    var identity = (ClaimsIdentity)principal.Identity!;
                    foreach (var claim in identity.FindAll(identity.RoleClaimType).ToArray()) identity.RemoveClaim(claim);
                    foreach (var role in roles) identity.AddClaim(new(identity.RoleClaimType, role));
                },
                OnChallenge = async context =>
                {
                    context.HandleResponse(); context.Response.StatusCode = 401;
                    await context.Response.WriteAsJsonAsync(new { statusCode = 401, code = "UNAUTHORIZED", message = "Authentication required.", data = (object?)null, traceId = context.HttpContext.TraceIdentifier });
                },
                OnForbidden = async context =>
                {
                    context.Response.StatusCode = 403;
                    await context.Response.WriteAsJsonAsync(new { statusCode = 403, code = "FORBIDDEN", message = "Access denied.", data = (object?)null, traceId = context.HttpContext.TraceIdentifier });
                }
            };
        }).ValidateOnStart();
        services.AddAuthorization(options =>
        {
            options.FallbackPolicy = new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build();
            // Existing accounts may have both Admin and User. Admin always remains administration-only.
            options.AddPolicy(WorkspacePolicy, policy => policy.RequireAuthenticatedUser()
                .RequireAssertion(context => !context.User.IsInRole("Admin")));
        });
    }
}
