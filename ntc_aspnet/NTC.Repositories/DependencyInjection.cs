using Microsoft.Extensions.DependencyInjection;
using NTC.Contract.Repositories.IUOW;
using NTC.Repositories.UOW;
namespace NTC.Repositories;
public static class DependencyInjection
{
    public static IServiceCollection AddPersistence(this IServiceCollection services) => services.AddScoped<IUnitOfWork, UnitOfWork>();
}
