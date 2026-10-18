using NTC.Core.Base;
using NTC.ModelViews.AuthModelView;

namespace NTC.Contract.Services.Interface;

public interface ISessionService
{
    Task<BasePaginatedList<SessionResponse>> GetAsync(int page, int size);
    Task RevokeAsync(Guid sessionId);
}
