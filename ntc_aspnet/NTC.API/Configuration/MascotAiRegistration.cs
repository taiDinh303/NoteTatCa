using NTC.API.Jobs;
using NTC.Contract.Repositories;
using NTC.Contract.Services.Interface;
using NTC.Repositories.Mascots;
using NTC.Services.Mascots;
namespace NTC.API;
public static class MascotAiRegistration
{
    public static void AddMascotAi(this IServiceCollection services, IConfiguration config)
    {
        services.Configure<MascotAiOptions>(config.GetSection("MascotAi"));
        services.AddScoped<IMascotGenerationStore, MascotGenerationStore>();
        services.AddScoped<IMascotAiService, MascotAiService>();
        services.AddScoped<MascotGenerationProcessor>();
        services.AddHttpClient<IMascotImageGenerator, OpenAiMascotGenerator>(client => client.Timeout = TimeSpan.FromMinutes(10))
            .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler { AllowAutoRedirect = false });
        services.AddHostedService<MascotGenerationWorker>();
    }
}
