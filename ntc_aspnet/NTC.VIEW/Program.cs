using System.Text.Json;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddRazorPages();
builder.Services.AddHttpClient();
builder.Services.AddSession();


builder.Services
    .AddRazorPages()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    });




// ✅ Cấu hình Authentication phải đặt TRƯỚC app.Build()
builder.Services.AddAuthentication(options =>
{
    options.DefaultScheme = "Cookies";
    options.DefaultChallengeScheme = "Google";
})
.AddCookie("Cookies")
.AddGoogle("Google", options =>
{
    var configuration = builder.Configuration.GetSection("Authentication:Google");
    options.ClientId = configuration["ClientId"]!;
    options.ClientSecret = configuration["ClientSecret"]!;
    options.CallbackPath = "/signin-google"; // Mặc định, có thể đổi nếu muốn
});

var app = builder.Build();

// Middleware
app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseSession();

app.UseMiddleware<NTC.Razor.Middlewares.JwtSessionMiddleware>();


app.UseRouting();
app.UseAuthentication(); //
app.UseAuthorization();

app.MapRazorPages();

app.Run();
