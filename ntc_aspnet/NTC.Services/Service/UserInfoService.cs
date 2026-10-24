using Microsoft.EntityFrameworkCore;
using NTC.Contract.Repositories.Entities;
using NTC.Contract.Repositories.IUOW;
using NTC.Contract.Services.Interface;
using NTC.Core.Base;
using NTC.Core.Security;
using NTC.ModelViews.UserInfoModelView;
using NTC.Services.Mappings;
using NTC.Services.Notes;
using NTC.Services.Shared;
namespace NTC.Services.Service;
public sealed class UserInfoService(IUnitOfWork work, ICurrentUser actor, TimeProvider clock)
    : BaseService(work, actor, clock), IUserInfoService
{
    private async Task<UserInfo> Find(Guid id)
    { RequireSelf(id); return await Repository<UserInfo>().Entities.Include(x => x.User).FirstOrDefaultAsync(x => x.Id == id && x.DeletedTime == null) ?? throw DomainErrors.NotFound("Profile"); }
    public async Task<BasePaginatedList<UserInfoResponseModelView>> GetAllAsync(int pageNumber, int pageSize)
    {
        ValidatePage(pageNumber, pageSize); var profile = await Find(UserId);
        var response = profile.ToViewModel(); response.TimeZoneId = profile.User?.TimeZoneId;
        return new(pageNumber == 1 ? [response] : [], 1, pageNumber, pageSize);
    }
    public async Task<UserInfoResponseModelView> GetByIdAsync(Guid id)
    { var profile = await Find(id); var response = profile.ToViewModel(); response.TimeZoneId = profile.User?.TimeZoneId; return response; }
    public async Task<UserInfoResponseModelView?> GetCurrentAsync()
    {
        var id = UserId;
        var profile = await Repository<UserInfo>().Entities.AsNoTracking().Include(x => x.User)
            .FirstOrDefaultAsync(x => x.Id == id && x.DeletedTime == null);
        if (profile == null) return null;
        var response = profile.ToViewModel(); response.TimeZoneId = profile.User?.TimeZoneId; return response;
    }
    public async Task CreateAsync(CreateUserInfoModelView model)
    {
        RequireSelf(model.UserId);
        if (await Repository<UserInfo>().Entities.AnyAsync(x => x.Id == model.UserId)) throw DomainErrors.Conflict("Profile already exists.");
        if (string.IsNullOrWhiteSpace(model.GivenName) || model.GivenName.Length > 25 || model.FamilyName?.Length > 25
            || !Enum.IsDefined(model.Gender) || model.BirthDate > UtcNow.UtcDateTime) throw DomainErrors.Invalid("Invalid profile fields.");
        var profile = new UserInfo { Id = UserId, GivenName = model.GivenName.Trim(), FamilyName = model.FamilyName, Gender = model.Gender,
            BirthDate = model.BirthDate.HasValue ? DateTime.SpecifyKind(model.BirthDate.Value, DateTimeKind.Unspecified) : null };
        await Repository<UserInfo>().InsertAsync(profile); await UnitOfWork.SaveAsync();
    }
    public async Task UpdateAsync(UpdateUserInfoModelView model)
    {
        var profile = await Find(model.UserId);
        if (model.Version.HasValue) RequireVersion(model.Version.Value, profile.Version);
        if (model.GivenName != null && (string.IsNullOrWhiteSpace(model.GivenName) || model.GivenName.Length > 25) || model.FamilyName?.Length > 25
            || model.Address?.Length > 500 || model.Locale?.Length > 10 || model.BirthDate > UtcNow.UtcDateTime || model.Gender.HasValue && !Enum.IsDefined(model.Gender.Value))
            throw DomainErrors.Invalid("Invalid profile fields.");
        if (model.Email != null && !string.Equals(model.Email, profile.User?.Email, StringComparison.OrdinalIgnoreCase)) throw DomainErrors.Invalid("Use the verified change-email flow.");
        ProfilePicture.Validate(model.Picture);
        if (model.GivenName != null) profile.GivenName = model.GivenName.Trim();
        if (model.FamilyName != null) profile.FamilyName = model.FamilyName.Trim();
        if (model.Picture != null) profile.Picture = model.Picture;
        if (model.Address != null) profile.Address = model.Address;
        if (model.Locale != null) profile.Locale = model.Locale;
        if (model.BirthDate.HasValue) profile.BirthDate = DateTime.SpecifyKind(model.BirthDate.Value, DateTimeKind.Unspecified);
        if (model.Gender.HasValue) profile.Gender = model.Gender.Value;
        if (model.TimeZoneId != null) { _ = ReminderSchedule.Zone(model.TimeZoneId); profile.User!.TimeZoneId = model.TimeZoneId; profile.Version = Guid.NewGuid(); }
        await UnitOfWork.SaveAsync();
    }
    public async Task PatchAsync(PatchProfileRequest request)
    {
        await InTransactionAsync(async () =>
        {
            var profile = await Find(UserId); RequireVersion(request.Version, profile.Version);
            if (request.Includes(nameof(request.GivenName)) && string.IsNullOrWhiteSpace(request.GivenName)
                || request.Includes(nameof(request.TimeZoneId)) && string.IsNullOrWhiteSpace(request.TimeZoneId)
                || request.Includes(nameof(request.Gender)) && request.Gender == null)
                throw DomainErrors.Invalid("Required profile fields cannot be cleared.");
            if (request.BirthDate > UtcNow.UtcDateTime || request.Gender.HasValue && !Enum.IsDefined(request.Gender.Value))
                throw DomainErrors.Invalid("Invalid profile fields.");
            if (request.GivenName?.Length > 25 || request.FamilyName?.Length > 25 || request.Address?.Length > 500 || request.Locale?.Length > 10)
                throw DomainErrors.Invalid("Invalid profile field length.");
            ProfilePicture.Validate(request.Picture);
            if (request.Includes(nameof(request.GivenName))) profile.GivenName = request.GivenName!.Trim();
            if (request.Includes(nameof(request.FamilyName))) profile.FamilyName = request.FamilyName?.Trim();
            if (request.Includes(nameof(request.Picture))) profile.Picture = string.IsNullOrEmpty(request.Picture) ? null : request.Picture;
            if (request.Includes(nameof(request.Locale))) profile.Locale = request.Locale;
            if (request.Includes(nameof(request.Address))) profile.Address = request.Address;
            if (request.Includes(nameof(request.BirthDate))) profile.BirthDate = request.BirthDate.HasValue ? DateTime.SpecifyKind(request.BirthDate.Value, DateTimeKind.Unspecified) : null;
            if (request.Gender.HasValue) profile.Gender = request.Gender.Value;
            if (request.TimeZoneId != null) { _ = ReminderSchedule.Zone(request.TimeZoneId); profile.User!.TimeZoneId = request.TimeZoneId; }
            // Bump only this entity, without marking the included Identity user graph as modified.
            profile.Version = Guid.NewGuid(); await UnitOfWork.SaveAsync(); return true;
        });
    }
    public Task UpdateNameAsync(UpdateNameModelView m) => UpdateAsync(new() { UserId = m.UserId, GivenName = m.GivenName, FamilyName = m.FamilyName });
    public Task UpdateGenderAsync(UpdateGenderModelView m) => UpdateAsync(new() { UserId = m.UserId, Gender = m.Gender });
    public Task UpdateBirthdayAsync(UpdateBirthdayModelView m) => UpdateAsync(new() { UserId = m.UserId, BirthDate = m.BirthDate });
    public async Task SoftDeleteAsync(Guid id) { var p = await Find(id); p.DeletedTime = UtcNow; await UnitOfWork.SaveAsync(); }
    public async Task DeleteAsync(Guid id) { var p = await Find(id); await Repository<UserInfo>().DeleteAsync(p); await UnitOfWork.SaveAsync(); }
}
