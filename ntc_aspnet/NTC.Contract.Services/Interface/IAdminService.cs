using NTC.ModelViews.Administration;
using NTC.Core.Base;
using NTC.Contract.Repositories.Entities.Identity;
namespace NTC.Contract.Services.Interface;
public interface IAdminService
{
    Task SetLockedAsync(Guid userId, bool locked);
    Task<AdminStatistics> GetStatisticsAsync();
    Task<BasePaginatedList<AdministrativeAuditResponse>> GetAuditEventsAsync(int page, int size, Guid? targetUserId, AdministrativeAction? action);
}
