using NTC.ModelViews.Backup;

namespace NTC.Contract.Services.Interface;

public interface IWorkspaceArchiveService
{
    Task<WorkspaceArchive> ExportAsync();
    Task<ImportArchiveResult> ImportAsync(WorkspaceArchive archive);
}
