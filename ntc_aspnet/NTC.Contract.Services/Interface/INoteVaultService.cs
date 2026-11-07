using NTC.ModelViews.Notes;
namespace NTC.Contract.Services.Interface;
public interface INoteVaultService {
 Task<VaultStatus> StatusAsync();
 Task ConfigureAsync(VaultSecretRequest request);
 Task<VaultUnlock> UnlockAsync(VaultSecretRequest request);
 Task<bool> AuthorizeAsync(string token);
 Task LockAsync(string token);
 Task SendResetAsync();
 Task ResetAsync(VaultResetRequest request);
 Task SetHiddenAsync(Guid id, VaultNoteRequest request);
}
