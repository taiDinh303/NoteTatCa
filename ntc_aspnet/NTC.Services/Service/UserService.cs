using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using NTC.Contract.Repositories.Entities;
using NTC.Contract.Repositories.IUOW;
using NTC.Contract.Services.Interface;
using NTC.Core.Base;
using NTC.Core.Security;
using NTC.ModelViews.UserInfoModelView;
using NTC.ModelViews.UserModelView;
using NTC.Services.Mappings;
using NTC.Services.Security;
using NTC.Services.Shared;
using NTC.Contract.Repositories.Entities.Identity;
namespace NTC.Services.Service;
public sealed class UserService(IUnitOfWork work, ICurrentUser actor, TimeProvider clock,
    UserManager<ApplicationUser> users, IEmailService email)
    : BaseService(work, actor, clock), IUserService
{
    private async Task<ApplicationUser> Find(Guid id) => await users.Users.FirstOrDefaultAsync(x => x.Id == id && x.DeletedTime == null) ?? throw DomainErrors.NotFound("Account");
    public async Task<BasePaginatedList<UserResponseModelView>> GetAllAsync(int pageNumber, int pageSize, string? search = null, bool includeDeactivated = false)
    {
        RequireAdmin(); ValidatePage(pageNumber, pageSize); var query = users.Users.AsNoTracking();
        if (!includeDeactivated) query = query.Where(x => x.DeletedTime == null);
        if (search?.Length > 200) throw DomainErrors.Invalid("Search must be at most 200 characters.");
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            query = query.Where(x => x.UserName != null && x.UserName.ToLower().Contains(term) || x.Email != null && x.Email.ToLower().Contains(term));
        }
        var count = await query.CountAsync(); var result = await query.OrderBy(x => x.CreatedTime).ThenBy(x => x.Id).Skip((pageNumber - 1) * pageSize).Take(pageSize).ToListAsync();
        return new(result.Select(x => x.ToViewModel()).ToArray(), count, pageNumber, pageSize);
    }
    public async Task<UserResponseModelView> GetByIdAsync(Guid id)
    {
        if (id != UserId) RequireAdmin();
        var admin = CurrentUser.IsInRole("Admin");
        return (await users.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id && (x.DeletedTime == null || admin))
            ?? throw DomainErrors.NotFound("Account")).ToViewModel();
    }
    public async Task CreateAsync(CreateUserModelView model)
    {
        RequireAdmin(); if (model.Role is not ("User" or "Admin")) throw DomainErrors.Invalid("Unknown application role.");
        model.Email = AccountRules.Email(model.Email); AccountRules.NewPassword(model.Password);
        await InTransactionAsync(async () =>
        {
            var user = new ApplicationUser { Id = Guid.NewGuid(), UserName = string.IsNullOrWhiteSpace(model.Username) ? model.Email : model.Username.Trim(), Email = model.Email.Trim() };
            SessionSecurity.RequireSuccess(await users.CreateAsync(user, model.Password));
            SessionSecurity.RequireSuccess(await users.AddToRoleAsync(user, model.Role));
            await Repository<UserInfo>().InsertAsync(new() { Id = user.Id, GivenName = "User" });
            await RecordAdministrativeActionAsync(AdministrativeAction.AccountCreated, user.Id);
            await UnitOfWork.SaveAsync(); return true;
        });
    }
    public async Task UpdateAsync(UpdateUserModelView model)
    {
        RequireSelf(model.Id); var user = await Find(model.Id);
        if (model.Email != null && !string.Equals(model.Email.Trim(), user.Email, StringComparison.OrdinalIgnoreCase))
            throw DomainErrors.Invalid("Use the verified change-email flow.");
        if (model.PhoneNumber?.Length > 32) throw DomainErrors.Invalid("Phone number is too long.");
        user.PhoneNumber = model.PhoneNumber; user.LastUpdatedTime = UtcNow; user.LastUpdatedBy = CurrentUser.Name;
        SessionSecurity.RequireSuccess(await users.UpdateAsync(user));
    }
    public async Task PatchAccountAsync(PatchAccountRequest request)
    {
        var user = await Find(UserId);
        if (request.PhoneNumber?.Length > 32) throw DomainErrors.Invalid("Phone number is too long.");
        if (request.Includes(nameof(request.PhoneNumber)))
        { user.PhoneNumber = request.PhoneNumber; SessionSecurity.RequireSuccess(await users.UpdateAsync(user)); }
    }
    public async Task SoftDeleteAsync(Guid id)
    {
        RequireAdmin(); if (id == UserId) throw DomainErrors.Invalid("You cannot deactivate your current administrator account.");
        await InTransactionAsync(async () =>
        {
            var user = await users.FindByIdAsync(id.ToString()) ?? throw DomainErrors.NotFound("Account");
            if (user.DeletedTime != null) return true;
            user.DeletedTime = UtcNow; user.DeletedBy = CurrentUser.Name;
            SessionSecurity.RequireSuccess(await users.UpdateAsync(user)); await SessionSecurity.RevokeAllAsync(UnitOfWork, users, user, UtcNow);
            await RecordAdministrativeActionAsync(AdministrativeAction.AccountDeactivated, user.Id);
            await UnitOfWork.SaveAsync(); return true;
        });
    }
    public async Task RestoreAsync(Guid id)
    {
        RequireAdmin();
        await InTransactionAsync(async () =>
        {
            var user = await users.FindByIdAsync(id.ToString()) ?? throw DomainErrors.NotFound("Account");
            if (user.DeletedTime == null) return true;
            user.DeletedTime = null; user.DeletedBy = null;
            SessionSecurity.RequireSuccess(await users.UpdateAsync(user));
            await SessionSecurity.RevokeAllAsync(UnitOfWork, users, user, UtcNow);
            await RecordAdministrativeActionAsync(AdministrativeAction.AccountReactivated, user.Id);
            await UnitOfWork.SaveAsync(); return true;
        });
    }
    public Task DeleteAsync(Guid id)
    {
        RequireAdmin(); throw DomainErrors.Conflict("Permanent account deletion is not enabled. Deactivate or lock the account instead.");
    }
    public async Task SendChangeEmailAsync(UpdateEmailModelView request)
    {
        RequireSelf(request.Id); var user = await Find(request.Id);
        request.Email = AccountRules.Email(request.Email);
        var existing = await users.FindByEmailAsync(request.Email.Trim());
        if (existing != null && existing.Id != user.Id) throw DomainErrors.Invalid("Email cannot be used.");
        var token = await users.GenerateChangeEmailTokenAsync(user, request.Email.Trim());
        await email.SendChangeEmailConfirmationAsync(user, token, request.Email.Trim());
    }
    private static string Decode(string token)
    {
        if (string.IsNullOrWhiteSpace(token) || token.Length > 4096) throw DomainErrors.Invalid("Invalid confirmation token.");
        try
        {
            var decoded = Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(token));
            // Outer email-link encoding contains the textual Identity token. A raw Identity token
            // decodes to protected binary data and must not be decoded a second time by legacy clients.
            return decoded.Length > 32 && decoded.All(c => char.IsAsciiLetterOrDigit(c) || c is '+' or '/' or '=') ? decoded : token;
        }
        catch (FormatException) { return token; }
    }
    public async Task ConfirmChangeEmailAsync(Guid userId, string token, string newEmail)
    {
        newEmail = AccountRules.Email(newEmail);
        await InTransactionAsync(async () =>
        {
            var user = await Find(userId);
            if (user.IsLocked) throw DomainErrors.Forbidden();
            var existing = await users.FindByEmailAsync(newEmail);
            if (existing != null && existing.Id != userId) throw DomainErrors.Invalid("Email cannot be used.");
            SessionSecurity.RequireSuccess(await users.ChangeEmailAsync(user, newEmail, Decode(token)));
            await SessionSecurity.RevokeAllAsync(UnitOfWork, users, user, UtcNow); return true;
        });
    }
    public async Task SendSetPasswordLinkAsync(Guid userId)
    {
        RequireSelf(userId); var user = await Find(userId);
        var token = await users.GeneratePasswordResetTokenAsync(user); await email.SendSetPasswordLinkAsync(user, token);
    }
    public async Task SetPasswordAsync(Guid userId, string token, string newPassword)
    {
        AccountRules.NewPassword(newPassword);
        await InTransactionAsync(async () =>
        {
            var user = await Find(userId); if (user.IsLocked) throw DomainErrors.Forbidden();
            SessionSecurity.RequireSuccess(await users.ResetPasswordAsync(user, Decode(token), newPassword));
            user.EmailConfirmed = true; SessionSecurity.RequireSuccess(await users.UpdateAsync(user));
            await SessionSecurity.RevokeAllAsync(UnitOfWork, users, user, UtcNow); return true;
        });
    }
    public async Task ChangePasswordAsync(Guid userId, string currentPassword, string newPassword)
    {
        RequireSelf(userId);
        AccountRules.NewPassword(newPassword);
        if (string.IsNullOrEmpty(currentPassword) || currentPassword.Length > 1024) throw DomainErrors.Invalid("Invalid current password.");
        await InTransactionAsync(async () =>
        {
            var user = await Find(userId); SessionSecurity.RequireSuccess(await users.ChangePasswordAsync(user, currentPassword, newPassword));
            await SessionSecurity.RevokeAllAsync(UnitOfWork, users, user, UtcNow); return true;
        });
    }
}
