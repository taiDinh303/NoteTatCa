$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path $PSScriptRoot -Parent
$taskTest = Join-Path $taskRoot ('artifacts/cloud-export-test-' + [Guid]::NewGuid().ToString('N'))
$taskPreviousAppData = $env:APPDATA
try {
    $env:APPDATA = Join-Path $taskTest 'appdata'
    $taskProject = Get-Content (Join-Path $taskRoot 'deploy/project.json') -Raw | ConvertFrom-Json
    $taskXml = [xml](Get-Content (Join-Path $taskRoot $taskProject.apiProject) -Raw)
    $taskSecretsDirectory = Join-Path $env:APPDATA ('Microsoft/UserSecrets/' + $taskXml.SelectSingleNode('//UserSecretsId').InnerText)
    [IO.Directory]::CreateDirectory($taskSecretsDirectory) | Out-Null
    $taskConnection = New-Object System.Data.Common.DbConnectionStringBuilder
    $taskConnection['Host'] = [string]$taskProject.sessionPoolerHost
    $taskConnection['Port'] = [string]'5432'
    $taskConnection['Database'] = [string]'postgres'
    $taskConnection['Username'] = [string]('postgres.' + $taskProject.supabaseProjectRef)
    $taskConnection['SSL Mode'] = [string]'VerifyFull'
    $taskPassword = [string]'Synthetic-demo;#-password-123!'
    $taskConnection['Password'] = $taskPassword
    $taskSyntheticSecrets = @{ 'Database:Provider'='PostgreSQL'; 'ConnectionStrings:MyCnn'=$taskConnection.get_ConnectionString() }
    if ($taskProject.supabaseStorage -or $taskProject.reserveSupabaseStorage) { $taskSyntheticSecrets['Supabase:Service_Key'] = 'synthetic-storage-key' }
    $taskSecretPath = Join-Path $taskSecretsDirectory 'secrets.json'
    $taskSyntheticSecrets | ConvertTo-Json | Set-Content -LiteralPath $taskSecretPath -Encoding UTF8
    $taskOutput = Join-Path $taskTest 'export'
    & (Join-Path $PSScriptRoot 'Export-CloudEnvironment.ps1') -OutputDirectory $taskOutput
    $taskRenderPath = Join-Path $taskOutput 'render-environment.local.json'
    $taskFirst = Get-Content -LiteralPath $taskRenderPath -Raw | ConvertFrom-Json
    if (!(Test-Path (Join-Path $taskOutput 'render.env.local'))) { throw 'Expected an importable .env for the normal quoting case.' }
    $taskConnection.set_ConnectionString([string]$taskFirst.CONNECTIONSTRINGS__MYCNN)
    if ($taskConnection['Password'] -ne $taskPassword -or $taskConnection['Root Certificate'] -ne '/app/certificates/supabase-prod-ca-2021.crt') { throw 'Password or Linux certificate path changed.' }
    $taskExpectedCount = if ($taskProject.supabaseStorage -or $taskProject.reserveSupabaseStorage) { 9 } else { 7 }
    if (@($taskFirst.PSObject.Properties).Count -ne $taskExpectedCount) { throw 'Unexpected hosting key count.' }
    if ($taskFirst.APPSETTINGS__CLIENTURL -ne $taskProject.clientUrl -or $taskFirst.CORS__ALLOWEDORIGINS__0 -ne $taskProject.clientUrl) { throw 'Incorrect frontend origin.' }
    if (($taskProject.supabaseStorage -or $taskProject.reserveSupabaseStorage) -and $taskFirst.SUPABASE__SERVICE_KEY -ne 'synthetic-storage-key') { throw 'Legacy storage alias lost.' }
    $taskProduction = Get-Content (Join-Path (Split-Path (Join-Path $taskRoot $taskProject.apiProject) -Parent) 'appsettings.Production.json') -Raw | ConvertFrom-Json
    if ($taskProduction.BackgroundJobs.Enabled -ne $true -or $taskProduction.Swagger.Enabled -ne $false) { throw 'Unsafe production defaults.' }
    if ($taskFirst.BACKGROUNDJOBS__ENABLED -ne 'true') { throw 'Expected the approved enabled jobs override.' }
    foreach ($taskJsonOnly in @('JWTSETTINGS__ISSUER','JWTSETTINGS__AUDIENCE','JWTSETTINGS__EXPIRATIONMINUTES','DEMOACCOUNTS__ENABLED','SWAGGER__ENABLED')) {
        if ($taskFirst.PSObject.Properties.Name -contains $taskJsonOnly) { throw 'JSON-owned policy leaked into the hosting export.' }
    }
    $taskVercel = Get-Content (Join-Path $taskOutput 'vercel-environment.local.json') -Raw | ConvertFrom-Json
    if (@($taskVercel.PSObject.Properties).Count -ne 1 -or $taskVercel.VITE_API_BASE_URL -ne $taskProject.apiBaseUrl) { throw 'Incorrect public frontend export.' }
    if ([Text.Encoding]::UTF8.GetByteCount($taskFirst.JWTSETTINGS__KEY) -lt 32) { throw 'Export signing key too short.' }
    & (Join-Path $PSScriptRoot 'Export-CloudEnvironment.ps1') -OutputDirectory $taskOutput
    $taskSecond = Get-Content -LiteralPath $taskRenderPath -Raw | ConvertFrom-Json
    if ($taskSecond.JWTSETTINGS__KEY -ne $taskFirst.JWTSETTINGS__KEY) { throw 'Rerun rotated the export signing key.' }
    # A value containing both quote styles must not leave a stale, incorrect .env behind.
    $taskConnection['Password'] = [string]'Synthetic-both-quote''"#-123!'
    $taskSyntheticSecrets['ConnectionStrings:MyCnn'] = $taskConnection.get_ConnectionString()
    $taskSyntheticSecrets | ConvertTo-Json | Set-Content -LiteralPath $taskSecretPath -Encoding UTF8
    & (Join-Path $PSScriptRoot 'Export-CloudEnvironment.ps1') -OutputDirectory $taskOutput
    if (Test-Path (Join-Path $taskOutput 'render.env.local')) { throw 'Stale .env was not removed for ambiguous quotes.' }
    if ($taskProject.reserveSupabaseStorage) {
        $taskSyntheticSecrets.Remove('Supabase:Service_Key')
        $taskSyntheticSecrets | ConvertTo-Json | Set-Content -LiteralPath $taskSecretPath -Encoding UTF8
        & (Join-Path $PSScriptRoot 'Export-CloudEnvironment.ps1') -OutputDirectory $taskOutput
        $taskReserved = Get-Content -LiteralPath $taskRenderPath -Raw | ConvertFrom-Json
        if ($taskReserved.PSObject.Properties.Name -contains 'SUPABASE__SERVICE_KEY') { throw 'An unconfigured reserved key must not be exported empty.' }
    }
    $taskFirst.CONNECTIONSTRINGS__MYCNN=$null; $taskFirst.JWTSETTINGS__KEY=$null; $taskSecond=$null
    Write-Output 'PASS: synthetic export preserves special characters, Linux TLS path, stable signing key, safe production defaults and safe quoting fallback.'
    Write-Output 'No real secret store, database, dashboard or email was used.'
} finally {
    if ($null -eq $taskPreviousAppData) { Remove-Item Env:APPDATA -ErrorAction SilentlyContinue }
    else { $env:APPDATA=$taskPreviousAppData }
}
