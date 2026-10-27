using NTC.ModelViews.Mascots;
namespace NTC.Contract.Services.Interface;
public interface IMascotAiService
{
    Task<MascotAiStatus> StatusAsync(CancellationToken token);
    Task<MascotJobView> CreateAsync(CreateMascotRequest request, CancellationToken token);
    Task<MascotAiResult> ResultAsync(Guid id, CancellationToken token);
    Task ApplyAsync(Guid id, ApplyMascotRequest request, CancellationToken token);
    Task DeleteAsync(Guid id, CancellationToken token);
    Task<SavedMascotResult> SavedAsync(CancellationToken token);
}
