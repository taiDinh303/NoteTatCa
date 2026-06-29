using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using NTC.Contract.Repositories.IUOW;
using NTC.Repositories.UOW;

namespace NTC.Services
{
    public static class DependencyInjection
    {
        public static void AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
        {
            services.AddRepositories();
        }
        public static void AddRepositories(this IServiceCollection services)
        {
            services.AddScoped<IUnitOfWork, UnitOfWork>();
        }
    }
}
