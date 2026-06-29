using NTC.API;
using NTC.API.Middleware;

var builder = WebApplication.CreateBuilder(args);

// config appsettings by env
builder.Configuration
    .SetBasePath(Directory.GetCurrentDirectory())
    .AddJsonFile("appsettings.json", optional: false, reloadOnChange: true)
    .AddJsonFile($"appsettings.{builder.Environment.EnvironmentName}.json", optional: true, reloadOnChange: true)
    .AddEnvironmentVariables();

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add all services to this
builder.Services.AddConfig(builder.Configuration);


var app = builder.Build();

//Catch error
//app.UseDeveloperExceptionPage();

app.UseMiddleware<ExceptionMiddleware>();


// Swagger
app.UseSwagger();
app.UseSwaggerUI();


// Another middleware

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();
app.UseCors("AllowRazor");

app.UseAuthentication();
app.UseAuthorization();



// Call controller/action
app.MapControllers();

app.Run();
