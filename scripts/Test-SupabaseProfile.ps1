#requires -Version 5.1
# Isolated script smoke test: fake dotnet and fake password; no database or network calls.
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskFixtureRoot = Join-Path $taskRoot ('artifacts/supabase-script-test-' + [Guid]::NewGuid().ToString('N'))
[IO.Directory]::CreateDirectory((Join-Path $taskFixtureRoot 'scripts')) | Out-Null
[IO.Directory]::CreateDirectory((Join-Path $taskFixtureRoot 'ntc_aspnet/NTC.API')) | Out-Null
$taskScript = Join-Path $taskFixtureRoot 'scripts/Use-Supabase.ps1'
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'Use-Supabase.ps1') -Destination $taskScript
function global:Read-Host { return (ConvertTo-SecureString 'synthetic;quoted"password!#' -AsPlainText -Force) }
function global:dotnet {
    if ($env:Database__Provider -ne 'PostgreSQL') { throw 'Provider not passed to child.' }
    if ($env:DemoAccounts__Enabled -ne 'true') { throw 'Explicit demo flag missing.' }
    if ($env:ConnectionStrings__MyCnn -notmatch 'pooler.supabase.com') { throw 'Wrong host.' }
    if ($args -notcontains '--initialize-supabase' -or $args -notcontains '--seed-test-accounts') { throw 'Missing explicit CLI operation.' }
    $global:LASTEXITCODE = 0
}
$taskOriginal = [Environment]::GetEnvironmentVariable('Database__Provider', 'Process')
& $taskScript -Configure -Initialize -SeedTestAccounts
if ([Environment]::GetEnvironmentVariable('Database__Provider', 'Process') -ne $taskOriginal) { throw 'Environment was not restored.' }
$taskConfig = Get-Content -LiteralPath (Join-Path $taskFixtureRoot 'ntc_aspnet/NTC.API/appsettings.Supabase.Local.json') -Raw | ConvertFrom-Json
$taskRoundTrip = New-Object System.Data.Common.DbConnectionStringBuilder
$taskRoundTrip.set_ConnectionString($taskConfig.ConnectionStrings.MyCnn)
if ($taskRoundTrip.get_Item('Password') -ne 'synthetic;quoted"password!#') { throw 'Special-character password did not round trip.' }
if ($taskConfig.Jwtsettings.Key.Length -lt 32 -or $taskConfig.DemoAccounts.Password.Length -lt 16) { throw 'Missing generated secret.' }
$taskAccounts = Get-Content -LiteralPath (Join-Path $taskFixtureRoot 'artifacts/supabase/test-accounts.local.json') -Raw | ConvertFrom-Json
if ($taskAccounts.Count -ne 5) { throw 'Wrong number of demo accounts.' }
Write-Host 'PASS: isolated script config, quoting, explicit operations, five-account manifest and environment restoration. No network/database calls.'
