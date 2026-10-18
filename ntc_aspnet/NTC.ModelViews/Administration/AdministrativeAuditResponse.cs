using NTC.Contract.Repositories.Entities.Identity;

namespace NTC.ModelViews.Administration;

public sealed record AdministrativeAuditResponse(Guid Id, Guid? ActorUserId, Guid? TargetUserId,
    Guid? RoleId, AdministrativeAction Action, DateTimeOffset OccurredAt);
