[CmdletBinding()]
param([string]$OutputDirectory = '')
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path $PSScriptRoot -Parent
$taskProject = Get-Content -LiteralPath (Join-Path $taskRoot 'deploy/project.json') -Raw | ConvertFrom-Json
$taskArtifacts = [IO.Path]::GetFullPath((Join-Path $taskRoot 'artifacts'))
if (!$OutputDirectory) { $OutputDirectory = Join-Path $taskArtifacts 'deployment' }
$taskOutput = [IO.Path]::GetFullPath($OutputDirectory)
if (!$taskOutput.StartsWith($taskArtifacts + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Private export must stay inside the ignored repository artifacts directory.'
}
$taskApiPath = Join-Path $taskRoot $taskProject.apiProject
$taskXml = [xml](Get-Content -LiteralPath $taskApiPath -Raw)
$taskId = $taskXml.SelectSingleNode('//UserSecretsId').InnerText
$taskSecretsPath = Join-Path $env:APPDATA "Microsoft/UserSecrets/$taskId/secrets.json"
if (!(Test-Path -LiteralPath $taskSecretsPath)) { throw 'Configure the API User Secrets first.' }
$taskSecrets = Get-Content -LiteralPath $taskSecretsPath -Raw | ConvertFrom-Json
if ($taskSecrets.'Database:Provider' -ne 'PostgreSQL') { throw 'Expected the reviewed PostgreSQL User Secrets profile.' }
$taskConnection = New-Object System.Data.Common.DbConnectionStringBuilder
try { $taskConnection.set_ConnectionString([string]$taskSecrets.'ConnectionStrings:MyCnn') }
catch { throw 'Expected an Npgsql keyword connection string in User Secrets; do not paste a password into this script.' }
if ($taskConnection['Host'] -ne $taskProject.sessionPoolerHost -or
    $taskConnection['Username'] -ne ("postgres." + $taskProject.supabaseProjectRef) -or
    $taskConnection['Database'] -ne 'postgres' -or [string]$taskConnection['Port'] -ne '5432' -or
    $taskConnection['SSL Mode'] -ne 'VerifyFull' -or !$taskConnection['Password']) {
    throw 'Connection must match the reviewed project session endpoint and VerifyFull TLS.'
}
# This path exists in the Docker image, unlike the local Windows certificate path.
$taskConnection['Root Certificate'] = [string]'/app/certificates/supabase-prod-ca-2021.crt'
$taskConnection['Maximum Pool Size'] = [string]'10'
$taskConnection['Minimum Pool Size'] = [string]'0'
$taskConnection['Timeout'] = [string]'15'
$taskConnection['Command Timeout'] = [string]'60'
[IO.Directory]::CreateDirectory($taskOutput) | Out-Null
$taskProfilePath = Join-Path $taskOutput 'render-export-profile.local.json'
if (Test-Path -LiteralPath $taskProfilePath) {
    $taskJwt = (Get-Content -LiteralPath $taskProfilePath -Raw | ConvertFrom-Json).JwtSigningKey
    if (!$taskJwt -or [Text.Encoding]::UTF8.GetByteCount($taskJwt) -lt 32) { throw 'Existing private export signing key is invalid; it was not replaced.' }
} else {
    $taskBytes = New-Object byte[] 32
    $taskRng = [Security.Cryptography.RandomNumberGenerator]::Create()
    try { $taskRng.GetBytes($taskBytes); $taskJwt = [Convert]::ToBase64String($taskBytes) }
    finally { $taskRng.Dispose(); [Array]::Clear($taskBytes, 0, $taskBytes.Length) }
    @{JwtSigningKey=$taskJwt} | ConvertTo-Json | Set-Content -LiteralPath $taskProfilePath -Encoding UTF8
}
$taskRender = [ordered]@{
    ASPNETCORE_ENVIRONMENT='Production'; DATABASE__PROVIDER='PostgreSQL'
    CONNECTIONSTRINGS__MYCNN=$taskConnection.get_ConnectionString(); JWTSETTINGS__KEY=$taskJwt
    CORS__ALLOWEDORIGINS__0=[string]$taskProject.clientUrl; APPSETTINGS__CLIENTURL=[string]$taskProject.clientUrl
    BACKGROUNDJOBS__ENABLED='true'
}
if ($taskProject.supabaseStorage -or $taskProject.reserveSupabaseStorage) {
    $taskRender['SUPABASE__URL'] = 'https://' + $taskProject.supabaseProjectRef + '.supabase.co'
    $taskStorageKey = $taskSecrets.'Supabase:ServiceKey'
    if (!$taskStorageKey) { $taskStorageKey = $taskSecrets.'Supabase:Service_Key' }
    if ($taskStorageKey) { $taskRender['SUPABASE__SERVICE_KEY'] = [string]$taskStorageKey }
    else {
        Write-Warning 'No SUPABASE__SERVICE_KEY exported. Keep the valid key for this project in the hosting secret store.'
        if ($taskProject.reserveSupabaseStorage) { Write-Warning 'Reserved note Storage is not active yet; its missing key was not exported empty.' }
    }
}
$taskVercel = [ordered]@{ VITE_API_BASE_URL=[string]$taskProject.apiBaseUrl }
$taskEncoding = New-Object Text.UTF8Encoding($false)
function Write-TaskExport($taskName, $taskValues) {
    [IO.File]::WriteAllText((Join-Path $taskOutput "$taskName-environment.local.json"), ($taskValues | ConvertTo-Json -Depth 4), $taskEncoding)
    $taskEnvPath = Join-Path $taskOutput "$taskName.env.local"
    if (Test-Path -LiteralPath $taskEnvPath) { Remove-Item -LiteralPath $taskEnvPath }
    $taskLines = @()
    foreach ($taskKey in $taskValues.Keys) {
        $taskValue = [string]$taskValues[$taskKey]
        # Prefer literal quoting; never guess how an importer escapes both quote styles.
        if ($taskValue.Contains("`r") -or $taskValue.Contains("`n")) { throw 'Environment values must be single-line.' }
        if (!$taskValue.Contains("'")) { $taskQuoted = "'" + $taskValue + "'" }
        elseif (!$taskValue.Contains('"') -and !$taskValue.Contains('\')) { $taskQuoted = '"' + $taskValue + '"' }
        else {
            Write-Warning "$taskName .env export omitted because of quoting; use the private JSON values in the dashboard."
            return
        }
        $taskLines += "$taskKey=$taskQuoted"
    }
    [IO.File]::WriteAllText($taskEnvPath, (($taskLines -join "`n") + "`n"), $taskEncoding)
}
Write-TaskExport 'render' $taskRender
Write-TaskExport 'vercel' $taskVercel
$taskConnection.Clear(); $taskSecrets=$null; $taskJwt=$null
Write-Output "Cloud environment files prepared privately in: $taskOutput"
Write-Output ('Target: Render ' + $taskProject.renderServiceId + '; Vercel ' + $taskProject.vercelTeam + '/' + $taskProject.vercelProject + ' (Production only).')
Write-Output 'No dashboard changes, deployment, migration or email was triggered. Preserve an existing valid cloud JWT key when importing.'
