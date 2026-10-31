using Microsoft.OpenApi.Models;
using NTC.API.Configuration;
using NTC.API.Jobs;
using NTC.Contract.Services.Interface;
using NTC.Core.Security;
using NTC.Repositories;
using NTC.Services.Infrastructure;
using NTC.Services.Jobs;
using NTC.Services.Notifications;
using NTC.Services.Security;
using NTC.Services.Service;
namespace NTC.API;
public static class DependencyInjection
{
    public static void AddConfig(this IServiceCollection services, IConfiguration config)
    {
        services.AddHttpContextAccessor(); services.AddSingleton(TimeProvider.System);
        services.AddScoped<ICurrentUser, HttpCurrentUser>(); services.AddDatabase(config); services.AddPersistence();
        services.AddIdentityAndBearer(); services.AddRequestPolicies(config);
        services.AddScoped<IAuthService, AuthService>(); services.AddScoped<IUserService, UserService>();
        services.AddScoped<IUserInfoService, UserInfoService>(); services.AddScoped<IUserLoginService, UserLoginService>();
        services.AddScoped<IRoleService, RoleService>(); services.AddScoped<IUserRoleService, UserRoleService>();
        services.AddScoped<INoteService, NoteService>(); services.AddScoped<IWorkspaceArchiveService, WorkspaceArchiveService>(); services.AddScoped<ITagService, TagService>();
        services.AddScoped<INoteTagService, NoteTagService>(); services.AddScoped<IReminderService, ReminderService>();
        services.AddScoped<IAdminService, AdminService>(); services.AddScoped<IInboxService, InboxService>();
        services.AddScoped<ISessionService, SessionService>();
        services.AddScoped<IFeedbackService, FeedbackService>();
        services.AddScoped<Operations.DemoAccountSeeder>();
        services.AddScoped<IBackgroundMaintenanceService, BackgroundMaintenanceService>();
        services.AddScoped<IGoogleIdentityValidator, GoogleIdentityValidator>();
        services.AddScoped<IOtpService, OtpService>(); services.AddScoped<EmailTemplateRenderer>();
        if (string.Equals(config["Email:Provider"], "Brevo", StringComparison.OrdinalIgnoreCase))
            services.AddHttpClient<IEmailSender, BrevoEmailSender>()
                .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler { AllowAutoRedirect = false });
        else
            services.AddScoped<IEmailSender, SmtpEmailSender>();
        services.AddScoped<IEmailService, EmailService>();
        services.AddEndpointsApiExplorer(); services.AddSwaggerGen(options =>
        {
            options.SwaggerDoc("v1", new OpenApiInfo { Title = "NoteTatCa API", Version = "v1" });
            options.MapType<DateOnly>(() => new OpenApiSchema { Type = "string", Format = "date" });
            options.OperationFilter<ApiAccessOperationFilter>();
            options.OperationFilter<ApiResponseOperationFilter>();
            options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme { Type = SecuritySchemeType.Http, Scheme = "bearer", BearerFormat = "JWT" });
            options.AddSecurityRequirement(new OpenApiSecurityRequirement { { new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } }, Array.Empty<string>() } });
        });
        if (bool.TryParse(config["BackgroundJobs:Enabled"], out var jobsEnabled) && jobsEnabled) services.AddHostedService<MaintenanceWorker>();
    }
}
