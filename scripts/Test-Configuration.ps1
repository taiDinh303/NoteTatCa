[CmdletBinding()]
param([ValidateSet('Development','Production')][string]$Environment = 'Development')
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path $PSScriptRoot -Parent
$taskProject = Get-Content -LiteralPath (Join-Path $taskRoot 'deploy/project.json') -Raw | ConvertFrom-Json
$taskPrevious = $env:ASPNETCORE_ENVIRONMENT
$taskPreviousDotnet = $env:DOTNET_ENVIRONMENT
try {
    $env:ASPNETCORE_ENVIRONMENT = $Environment
    $env:DOTNET_ENVIRONMENT = $Environment
    if ($Environment -eq 'Production') {
        $taskPublish = Join-Path $taskRoot ('artifacts/configuration-check-' + [Guid]::NewGuid().ToString('N') + '/publish')
        & dotnet publish (Join-Path $taskRoot $taskProject.apiProject) -c Release -p:TreatWarningsAsErrors=true -p:UseAppHost=false -o $taskPublish
        if ($LASTEXITCODE -ne 0) { throw 'Clean Production publish failed.' }
        Push-Location $taskPublish
        try { & dotnet ([IO.Path]::GetFileNameWithoutExtension($taskProject.apiProject) + '.dll') --check-config }
        finally { Pop-Location }
    } else {
        & dotnet run --project (Join-Path $taskRoot $taskProject.apiProject) -c Release --no-launch-profile -- --check-config
    }
    if ($LASTEXITCODE -ne 0) { throw 'Configuration check failed. Review the named keys above; do not paste secrets into logs.' }
} finally {
    if ($null -eq $taskPrevious) { Remove-Item Env:ASPNETCORE_ENVIRONMENT -ErrorAction SilentlyContinue } else { $env:ASPNETCORE_ENVIRONMENT = $taskPrevious }
    if ($null -eq $taskPreviousDotnet) { Remove-Item Env:DOTNET_ENVIRONMENT -ErrorAction SilentlyContinue } else { $env:DOTNET_ENVIRONMENT = $taskPreviousDotnet }
}
