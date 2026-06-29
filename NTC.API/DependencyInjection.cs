using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;
using NTC.Contract.Repositories.Entities;
using NTC.Contract.Services.Interface;
using NTC.Repositories.Context;
using NTC.Services;
using NTC.Services.Infrastructure;
using NTC.Services.Notifications;
using NTC.Services.Service;


namespace NTC.API
{
    public static class DependencyInjection
    {
        public static void AddConfig(this IServiceCollection services, IConfiguration configuration)
        {
            services.ConfigRoute();
            services.AddDatabase(configuration);
            services.AddIdentity();
            services.AddInfrastructure(configuration);
            services.AddServices();
            services.AddJwtAuthentication(configuration);
            services.AddAuthorization();
            services.AddHttpContextAccessor();
            services.AddGoogleAuthentication(configuration);
            services.AddMemoryCache();

            //services.AddSwaggerGen(options =>
            //{
            //    options.IncludeXmlComments(Path.Combine(AppContext.BaseDirectory, $"{Assembly.GetExecutingAssembly().GetName().Name}.xml"));
            //});


            services.AddCors(options =>
            {
                options.AddPolicy("AllowRazor", policy =>
                {
                    policy.WithOrigins("https://localhost:5037")   // Razor App
                          .AllowAnyHeader()
                          .AllowAnyMethod()
                          .AllowCredentials();
                });
            });

        }
        public static void ConfigRoute(this IServiceCollection services)
        {
            services.Configure<RouteOptions>(options =>
            {
                options.LowercaseUrls = true;
            });
        }
        public static void AddDatabase(this IServiceCollection services, IConfiguration configuration)
        {
            services.AddDbContext<DatabaseContext>(options =>
            {
                //options.UseLazyLoadingProxies().UseSqlServer(configuration.GetConnectionString("MyCnn"));
                options.UseSqlServer(configuration.GetConnectionString("MyCnn"));

            });
        }

        public static void AddIdentity(this IServiceCollection services)
        {
            services.AddIdentity<ApplicationUser, ApplicationRole>(options =>
            {
                options.Password.RequireDigit = false;
                options.Password.RequireLowercase = false;
                options.Password.RequireUppercase = false;
                options.Password.RequireNonAlphanumeric = false;
                options.Password.RequiredLength = 6;

                options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(5);
                options.Lockout.MaxFailedAccessAttempts = 5;
                options.Lockout.AllowedForNewUsers = true;

                options.User.RequireUniqueEmail = false;
            })
             .AddEntityFrameworkStores<DatabaseContext>()
             .AddDefaultTokenProviders();
        }
        public static void AddServices(this IServiceCollection services)
        {
            services
                .AddScoped<IAuthService, AuthService>()
                .AddScoped<IUserService, UserService>()
                .AddScoped<IRoleService, RoleService>()
                .AddScoped<IUserRoleService, UserRoleService>()
                .AddScoped<IUserInfoService, UserInfoService>()
                .AddScoped<IUserLoginService, UserLoginService>()
                .AddScoped<EmailTemplateRenderer>()
                .AddScoped<IEmailSender, SmtpEmailSender>()
                .AddScoped<IEmailService, EmailService>()
                .AddScoped<IOtpService, OtpService>()

                //
                .AddScoped<INoteService, NoteService>()
                .AddScoped<ITagService, TagService>()
                .AddScoped<INoteTagService, NoteTagService>()
                .AddScoped<IReminderService, ReminderService>()


                .AddHttpContextAccessor();
        }

        //JWT
        public static void AddJwtAuthentication(this IServiceCollection services, IConfiguration configuration)
        {
            var secret = configuration.GetValue<string>("Jwtsettings:Key");
            var key = Encoding.UTF8.GetBytes(secret ?? throw new InvalidOperationException("JWT Key not found"));


            services.AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidIssuer = configuration["Jwtsettings:Issuer"],
                    ValidateAudience = true,
                    ValidAudience = configuration["Jwtsettings:Audience"],
                    ValidateLifetime = true,
                    IssuerSigningKey = new SymmetricSecurityKey(key),
                    ValidateIssuerSigningKey = true
                };
            });
        }
        //Author
        public static void AddAuthorization(this IServiceCollection services)
        {
            services.AddSwaggerGen(c =>
            {
                c.SwaggerDoc("v1", new OpenApiInfo { Title = "API", Version = "v1" });

                // Cấu hình để Swagger hỗ trợ DateOnly
                c.MapType<DateOnly>(() => new OpenApiSchema
                {
                    Type = "string",
                    Format = "date", // Đảm bảo Swagger hiểu rằng đây là định dạng ngày
                });

                // Cấu hình Authorization
                c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
                {
                    Name = "Authorization",
                    Type = SecuritySchemeType.Http,
                    Scheme = "Bearer",
                    BearerFormat = "JWT",
                    In = ParameterLocation.Header,
                    Description = "Enter your token"
                });

                c.AddSecurityRequirement(new OpenApiSecurityRequirement
                {
                    {
                        new OpenApiSecurityScheme
                        {
                            Reference = new OpenApiReference
                            {
                                Type = ReferenceType.SecurityScheme,
                                Id = "Bearer"
                            }
                        },
                        new string[] {}
                    }
                });
            });
        }

        public static void AddGoogleAuthentication(this IServiceCollection services, IConfiguration configuration)
        {
            var clientId = configuration["Authentication:Google:ClientId"];
            var clientSecret = configuration["Authentication:Google:ClientSecret"];

            if (string.IsNullOrWhiteSpace(clientId) || string.IsNullOrWhiteSpace(clientSecret))
                throw new InvalidOperationException("Google Authentication configuration is missing (ClientId or ClientSecret).");

            services.AddAuthentication()
                .AddGoogle(options =>
                {
                    options.ClientId = clientId;
                    options.ClientSecret = clientSecret;
                });
        }




    }
}
