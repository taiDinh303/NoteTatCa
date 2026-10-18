using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
namespace NTC.Services;
// Compatibility extension; persistence is registered by the API composition root.
public static class DependencyInjection
{
    public static void AddInfrastructure(this IServiceCollection services, IConfiguration configuration) { }
}
