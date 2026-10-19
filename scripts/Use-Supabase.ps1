#requires -Version 5.1
[CmdletBinding()]
param(
    [switch]$Configure,
    [switch]$Initialize,
    [switch]$SeedTestAccounts,
    [switch]$Check,
    [string]$CertificatePath
)
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskProject = Join-Path $taskRoot 'ntc_aspnet/NTC.API/NTC.API.csproj'
$taskSettingsPath = Join-Path $taskRoot 'ntc_aspnet/NTC.API/appsettings.Supabase.Local.json'
$taskProjectRef = 'nxqupzwqawujtgeuvvcj'
$taskHostName = 'aws-0-ap-northeast-1.pooler.supabase.com'

function New-TaskSecret {
    $taskBytes = New-Object byte[] 32
    $taskRng = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $taskRng.GetBytes($taskBytes) } finally { $taskRng.Dispose() }
    return [Convert]::ToBase64String($taskBytes)
}
function Read-TaskPrivateSettings {
    if (!(Test-Path -LiteralPath $taskSettingsPath)) { return $null }
    return (Get-Content -LiteralPath $taskSettingsPath -Raw | ConvertFrom-Json)
}

$taskSettings = Read-TaskPrivateSettings
if ($Configure) {
    $taskSecure = Read-Host 'Supabase DATABASE password (input is hidden)' -AsSecureString
    $taskPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($taskSecure)
    try {
        $taskPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($taskPointer)
        if ([string]::IsNullOrWhiteSpace($taskPassword)) { throw 'Database password cannot be empty.' }
        # DbConnectionStringBuilder quotes semicolons/quotes safely; no URI password escaping is needed.
        $taskConnection = New-Object System.Data.Common.DbConnectionStringBuilder
        $taskConnection['Host'] = $taskHostName
        $taskConnection['Port'] = '5432'
        $taskConnection['Database'] = 'postgres'
        $taskConnection['Username'] = "postgres.$taskProjectRef"
        $taskConnection['Password'] = $taskPassword
        $taskConnection['SSL Mode'] = 'VerifyFull'
        $taskConnection['Pooling'] = 'true'
        $taskConnection['Minimum Pool Size'] = '0'
        $taskConnection['Maximum Pool Size'] = '10'
        $taskConnection['Timeout'] = '15'
        $taskConnection['Command Timeout'] = '60'
        if ($CertificatePath) {
            $taskConnection['Root Certificate'] = (Resolve-Path -LiteralPath $CertificatePath).Path
        } elseif ($taskSettings) {
            $taskPrevious = New-Object System.Data.Common.DbConnectionStringBuilder
            $taskPrevious.set_ConnectionString($taskSettings.ConnectionStrings.MyCnn)
            if ($taskPrevious.ContainsKey('Root Certificate')) { $taskConnection['Root Certificate'] = $taskPrevious['Root Certificate'] }
        }
        $taskJwt = if ($taskSettings -and $taskSettings.Jwtsettings.Key) { $taskSettings.Jwtsettings.Key } else { New-TaskSecret }
        $taskDemo = if ($taskSettings -and $taskSettings.DemoAccounts.Password) { $taskSettings.DemoAccounts.Password } else { 'Ntc!' + (New-TaskSecret) }
        $taskPayload = [ordered]@{
            Supabase = @{ ProjectRef=$taskProjectRef; ProjectUrl="https://$taskProjectRef.supabase.co"; SessionPoolerHost=$taskHostName }
            Database = @{ Provider='PostgreSQL' }
            ConnectionStrings = @{ MyCnn=$taskConnection.ConnectionString }
            Jwtsettings = @{ Key=$taskJwt; Issuer='NoteTatCa'; Audience='NoteTatCa.Web'; ExpirationMinutes=15 }
            DemoAccounts = @{ Enabled=$false; Password=$taskDemo }
        }
        [IO.File]::WriteAllText($taskSettingsPath, ($taskPayload | ConvertTo-Json -Depth 8), (New-Object Text.UTF8Encoding($false)))
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($taskPointer)
        $taskPassword = $null
        if ($taskConnection) { $taskConnection.Clear() }
        $taskSecure.Dispose()
    }
    $taskSettings = Read-TaskPrivateSettings
    Write-Host 'Saved private Supabase profile. Existing SQL Server settings were not changed.'
}
if (!$taskSettings) { throw 'Configure first: .\scripts\Use-Supabase.ps1 -Configure -Initialize -SeedTestAccounts' }
if ($taskSettings.Supabase.ProjectRef -ne $taskProjectRef) { throw 'Unexpected project reference in private profile.' }

# Override only this child process. Restore all caller environment values afterwards.
$taskVariables = @{
    ASPNETCORE_ENVIRONMENT='Development'; DOTNET_ENVIRONMENT='Development'
    Database__Provider='PostgreSQL'; ConnectionStrings__MyCnn=[string]$taskSettings.ConnectionStrings.MyCnn
    Jwtsettings__Key=[string]$taskSettings.Jwtsettings.Key; Jwtsettings__Issuer='NoteTatCa'; Jwtsettings__Audience='NoteTatCa.Web'
    Supabase__ProjectRef=$taskProjectRef; Supabase__SessionPoolerHost=$taskHostName
    BackgroundJobs__Enabled='false'; DemoAccounts__Enabled=([string][bool]$SeedTestAccounts).ToLowerInvariant()
    DemoAccounts__Password=[string]$taskSettings.DemoAccounts.Password
    AppSettings__ClientUrl='http://127.0.0.1:5173'
    Cors__AllowedOrigins__0='http://127.0.0.1:5173'; Cors__AllowedOrigins__1='http://localhost:5173'
    Logging__LogLevel__Microsoft='Warning'
}
$taskOld = @{}
Push-Location $taskRoot
try {
    foreach ($taskKey in $taskVariables.Keys) {
        $taskOld[$taskKey] = [Environment]::GetEnvironmentVariable($taskKey, 'Process')
        [Environment]::SetEnvironmentVariable($taskKey, $taskVariables[$taskKey], 'Process')
    }
    if ($Initialize -or $SeedTestAccounts -or $Check) {
        $taskArguments = @('run','--project',$taskProject,'-c','Release','--no-launch-profile','--','--check-supabase')
        if ($Initialize) { $taskArguments += '--initialize-supabase' }
        if ($SeedTestAccounts) { $taskArguments += '--seed-test-accounts' }
        & dotnet @taskArguments
        if ($LASTEXITCODE -ne 0) { throw 'Supabase operation failed. Check database password, TLS certificate and network; no success was recorded.' }
        if ($SeedTestAccounts) {
            $taskAccounts = @('admin@ntc.example.test','user01@ntc.example.test','user02@ntc.example.test','user03@ntc.example.test','user04@ntc.example.test') | ForEach-Object {
                [ordered]@{ Email=$_; Role=$(if ($_ -like 'admin@*') {'Admin'} else {'User'}); Password=$taskSettings.DemoAccounts.Password }
            }
            $taskOutputDirectory = Join-Path $taskRoot 'artifacts/supabase'
            [IO.Directory]::CreateDirectory($taskOutputDirectory) | Out-Null
            $taskAccountsPath = Join-Path $taskOutputDirectory 'test-accounts.local.json'
            [IO.File]::WriteAllText($taskAccountsPath, ($taskAccounts | ConvertTo-Json -Depth 5), (New-Object Text.UTF8Encoding($false)))
            Write-Host 'Five test accounts are ready. Emails:'
            $taskAccounts | ForEach-Object { Write-Host ('  ' + $_.Email + ' [' + $_.Role + ']') }
            Write-Host ('Login passwords are in this ignored local file: ' + $taskAccountsPath)
        }
    } else {
        # Development API against Supabase. The ordinary dotnet launch profile still uses SQL Server.
        & dotnet run --project $taskProject -c Release --no-launch-profile --urls 'http://localhost:5032'
        if ($LASTEXITCODE -ne 0) { throw 'API stopped with an error.' }
    }
} finally {
    foreach ($taskKey in $taskOld.Keys) {
        if ($null -eq $taskOld[$taskKey]) { Remove-Item -LiteralPath ("Env:" + $taskKey) -ErrorAction SilentlyContinue }
        else { [Environment]::SetEnvironmentVariable($taskKey, $taskOld[$taskKey], 'Process') }
    }
    Pop-Location
}
