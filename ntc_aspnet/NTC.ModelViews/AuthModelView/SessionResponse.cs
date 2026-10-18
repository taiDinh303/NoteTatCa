namespace NTC.ModelViews.AuthModelView;

public sealed record SessionResponse(Guid Id, DateTimeOffset CreatedAt, DateTimeOffset ExpiresAt, bool IsCurrent);
