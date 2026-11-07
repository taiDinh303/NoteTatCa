using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using NTC.Contract.Repositories.Entities;
using NTC.Contract.Repositories.Entities.Identity;
using NTC.Contract.Repositories.Entities.Tasks;
using NTC.Contract.Repositories.IUOW;
using NTC.Contract.Services.Interface;
using NTC.Core.Base;
using NTC.Core.Security;
using NTC.ModelViews.Notes;
using NTC.Services.Shared;
using NTC.Services.Notes;
using NTC.Services.Infrastructure;
namespace NTC.Services.Security;

public sealed class NoteVaultService(IUnitOfWork work, ICurrentUser actor, TimeProvider clock,
 UserManager<ApplicationUser> users, INoteAccess access, IEmailSender email, IConfiguration config)
 : BaseService(work, actor, clock), INoteVaultService {
 private readonly PasswordHasher<NoteVault> hasher = new();
 private IQueryable<NoteVault> Vaults => Repository<NoteVault>().Entities.Where(x => x.UserId == UserId);
 private static string Hash(string value) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
 private string ResetHash(string code, ApplicationUser user) => Convert.ToHexString(HMACSHA256.HashData(
  Encoding.UTF8.GetBytes(config["Jwtsettings:Key"] ?? throw new InvalidOperationException("JWT key required.")),
  Encoding.UTF8.GetBytes($"vault-reset:{UserId}:{user.SecurityStamp}:{user.NormalizedEmail}:{code}")));
 private static bool Equal(string a, string b) => CryptographicOperations.FixedTimeEquals(Encoding.ASCII.GetBytes(a), Encoding.ASCII.GetBytes(b));
 private static void Validate(string kind, string secret) {
  if (kind == "pin" && secret.Length == 6 && secret.All(c => c is >= '0' and <= '9')) return;
  if (kind == "pattern" && secret.Length is >= 4 and <= 9 && secret.All(c => c is >= '0' and <= '8') && secret.Distinct().Count() == secret.Length) {
   var seen = new HashSet<int>();
   foreach (var c in secret) { var n = c - '0'; if (seen.Count > 0) {
    var previous = secret[seen.Count - 1] - '0'; var dx = Math.Abs(previous % 3 - n % 3); var dy = Math.Abs(previous / 3 - n / 3);
    if ((dx == 2 && dy == 0 || dx == 0 && dy == 2 || dx == 2 && dy == 2) && !seen.Contains((previous + n) / 2)) throw DomainErrors.Invalid("Connect the middle point before crossing it.");
   } seen.Add(n); } return;
  }
  throw DomainErrors.Invalid("Use a six-digit PIN or a pattern with four to nine distinct points.");
 }
 private async Task<ApplicationUser> User() => await users.FindByIdAsync(UserId.ToString()) ?? throw DomainErrors.Unauthorized();
 private async Task<ApplicationUser> Verified() { var user = await User(); if (!user.EmailConfirmed || string.IsNullOrWhiteSpace(user.Email)) throw DomainErrors.Invalid("Verify your email before setting up hidden notes."); return user; }
 private Guid Session() => CurrentUser.SessionId ?? throw DomainErrors.Unauthorized();
 public async Task<VaultStatus> StatusAsync() { var user = await User(); var vault = await Vaults.AsNoTracking().SingleOrDefaultAsync(); return new(vault != null, vault?.Kind, user.EmailConfirmed); }
 public async Task ConfigureAsync(VaultSecretRequest request) {
  _ = Session(); await Verified(); Validate(request.Kind, request.Secret);
  var vault = await Vaults.SingleOrDefaultAsync();
  if (vault != null && !access.HiddenNotesUnlocked) throw DomainErrors.Forbidden();
  if (vault == null) { vault = new() { UserId = UserId }; await Repository<NoteVault>().InsertAsync(vault); }
  vault.CredentialVersion = Guid.NewGuid(); vault.Kind = request.Kind; vault.SecretHash = hasher.HashPassword(vault, request.Secret); vault.FailedAttempts = 0; vault.LockedUntil = null;
  vault.ResetHash = null; vault.ResetExpiresAt = null;
  await UnitOfWork.SaveAsync(); access.HiddenNotesUnlocked = false;
 }
 public async Task<VaultUnlock> UnlockAsync(VaultSecretRequest request) {
  var sid = Session(); var vault = await Vaults.SingleOrDefaultAsync() ?? throw DomainErrors.NotFound("Hidden notes lock");
  if (vault.LockedUntil > UtcNow) throw new BaseException.ErrorException(429, "VAULT_LOCKED", "Too many attempts. Try again in fifteen minutes.");
  // Reserve an attempt before checking the secret. Optimistic concurrency prevents parallel guesses bypassing the account budget.
  vault.FailedAttempts++; if (vault.FailedAttempts >= 5) { vault.LockedUntil = UtcNow.AddMinutes(15); vault.FailedAttempts = 0; }
  await UnitOfWork.SaveAsync();
  var valid = request.Secret.Length <= 9 && request.Kind == vault.Kind && hasher.VerifyHashedPassword(vault, vault.SecretHash, request.Secret) != PasswordVerificationResult.Failed;
  if (!valid) throw new BaseException.ErrorException(400,"INVALID_VAULT_SECRET","Incorrect lock.");
  vault.FailedAttempts = 0; vault.LockedUntil = null; await UnitOfWork.SaveAsync();
  var token = Convert.ToHexString(RandomNumberGenerator.GetBytes(32)); var expires = UtcNow.AddMinutes(5);
  foreach (var old in await Repository<NoteVaultGrant>().Entities.Where(x => x.UserId == UserId && (x.SessionId == sid || x.ExpiresAt <= UtcNow)).ToListAsync()) await Repository<NoteVaultGrant>().DeleteAsync(old);
  await Repository<NoteVaultGrant>().InsertAsync(new() { UserId = UserId, SessionId = sid, VaultVersion = vault.CredentialVersion, TokenHash = Hash(token), ExpiresAt = expires });
  await UnitOfWork.SaveAsync(); return new(token, expires);
 }
 public async Task<bool> AuthorizeAsync(string token) {
  if (token.Length != 64 || CurrentUser.SessionId == null) return false;
  var hash = Hash(token); var sid = Session(); var grant = await Repository<NoteVaultGrant>().Entities.SingleOrDefaultAsync(x => x.TokenHash == hash && x.UserId == UserId && x.SessionId == sid);
  if (grant == null || grant.ExpiresAt <= UtcNow) return false;
  var vault = await Vaults.AsNoTracking().SingleOrDefaultAsync(); if (vault == null || vault.CredentialVersion != grant.VaultVersion || vault.LockedUntil > UtcNow) return false;
  grant.ExpiresAt = UtcNow.AddMinutes(5); await UnitOfWork.SaveAsync(); access.HiddenNotesUnlocked = true; return true;
 }
 public async Task LockAsync(string token) {
  access.HiddenNotesUnlocked = false;
  if (token.Length != 64) return;
  var hash = Hash(token); var grant = await Repository<NoteVaultGrant>().Entities.SingleOrDefaultAsync(x => x.TokenHash == hash && x.UserId == UserId && x.SessionId == CurrentUser.SessionId);
  if (grant != null) { await Repository<NoteVaultGrant>().DeleteAsync(grant); await UnitOfWork.SaveAsync(); }
 }
 public async Task SendResetAsync() {
  var user = await Verified(); var vault = await Vaults.SingleOrDefaultAsync() ?? throw DomainErrors.NotFound("Hidden notes lock");
  if (vault.ResetSentAt > UtcNow.AddSeconds(-60)) throw new BaseException.ErrorException(429,"RATE_LIMITED","Wait before requesting another code.");
  var code = RandomNumberGenerator.GetInt32(100000,1000000).ToString(System.Globalization.CultureInfo.InvariantCulture);
  vault.ResetHash = ResetHash(code,user); vault.ResetSentAt = UtcNow; vault.ResetExpiresAt = UtcNow.AddMinutes(10); vault.ResetAttempts = 0; await UnitOfWork.SaveAsync();
  await email.SendEmailAsync(user.Email!, "Reset your NoteTatCa hidden notes lock", $"<p>Your hidden notes lock reset code is <strong>{code}</strong>.</p><p>It expires in 10 minutes. Resetting the lock keeps your hidden notes. Never share this code. If you did not request it, ignore this email.</p>");
 }
 public async Task ResetAsync(VaultResetRequest request) {
  var user = await Verified(); Validate(request.Kind,request.Secret); var vault = await Vaults.SingleOrDefaultAsync() ?? throw DomainErrors.NotFound("Hidden notes lock");
  if (vault.ResetHash == null || vault.ResetExpiresAt == null || vault.ResetExpiresAt <= UtcNow || vault.ResetAttempts >= 5) throw DomainErrors.Invalid("Invalid or expired reset code.");
  vault.ResetAttempts++; await UnitOfWork.SaveAsync(); var valid = request.Code.Length == 6 && Equal(vault.ResetHash, ResetHash(request.Code,user));
  if (!valid) throw DomainErrors.Invalid("Invalid or expired reset code.");
  vault.CredentialVersion = Guid.NewGuid(); vault.Kind = request.Kind; vault.SecretHash = hasher.HashPassword(vault,request.Secret); vault.ResetHash = null; vault.ResetExpiresAt = null;
  vault.FailedAttempts = 0; vault.LockedUntil = null; await UnitOfWork.SaveAsync(); access.HiddenNotesUnlocked = false;
 }
 public async Task SetHiddenAsync(Guid id, VaultNoteRequest request) {
  if (!access.HiddenNotesUnlocked) throw DomainErrors.Forbidden();
  await InTransactionAsync(async () => {
   var note = await Repository<Note>().Entities.SingleOrDefaultAsync(x => x.Id == id && x.UserId == UserId && x.DeletedTime == null) ?? throw DomainErrors.NotFound("Note");
   RequireVersion(request.Version,note.Version);
   if (await Repository<ReminderDelivery>().Entities.AnyAsync(x=>x.NoteId==id && x.SentAt==null && x.LeaseUntil>UtcNow)) throw DomainErrors.Conflict("Wait for the current reminder delivery to finish before hiding this note.");
   note.IsHidden = request.Hidden;
   if (!request.Hidden) foreach(var reminder in await Repository<Reminder>().Entities.Where(x=>x.NoteId==id && x.IsActive && x.DeletedTime==null).ToListAsync()) ReminderSchedule.AdvancePast(reminder,UtcNow);
   if (request.Hidden) foreach(var delivery in await Repository<ReminderDelivery>().Entities.Where(x=>x.NoteId==id && x.SentAt==null).ToListAsync()) { delivery.Abandoned=true; }
   await UnitOfWork.SaveAsync(); return true;
  });
 }
}
