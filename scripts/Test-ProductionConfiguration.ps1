[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path $PSScriptRoot -Parent
$taskProject = Get-Content -LiteralPath (Join-Path $taskRoot 'deploy/project.json') -Raw | ConvertFrom-Json
$taskPublish = Join-Path $taskRoot ('artifacts/configuration-test-' + [Guid]::NewGuid().ToString('N') + '/publish')
& dotnet publish (Join-Path $taskRoot $taskProject.apiProject) -c Release --no-restore -p:TreatWarningsAsErrors=true -p:UseAppHost=false -o $taskPublish
if ($LASTEXITCODE -ne 0) { throw 'Publish failed.' }
$taskJson = @(Get-ChildItem -LiteralPath $taskPublish -Filter 'appsettings*.json')
if ($taskJson.Count -ne 1 -or $taskJson[0].Name -ne 'appsettings.Production.json') { throw 'Publish must contain only the reviewed Production appsettings.' }
$taskDll = [IO.Path]::GetFileNameWithoutExtension($taskProject.apiProject) + '.dll'
function Invoke-TaskCheck([hashtable]$taskOverrides) {
    $taskStart = New-Object Diagnostics.ProcessStartInfo
    $taskStart.FileName = 'dotnet'
    $taskStart.Arguments = '"' + $taskDll + '" --check-config'
    $taskStart.WorkingDirectory = $taskPublish
    $taskStart.UseShellExecute = $false
    $taskStart.CreateNoWindow = $true
    $taskStart.RedirectStandardOutput = $true
    $taskStart.RedirectStandardError = $true
    # Ignore ambient owner settings in the child; all supplied inputs below are synthetic.
    foreach ($taskKey in @($taskStart.EnvironmentVariables.Keys)) {
        if ($taskKey -match '^(DATABASE|CONNECTIONSTRINGS|JWTSETTINGS|CORS|APPSETTINGS|STORAGE|SUPABASE|BACKGROUNDJOBS|SWAGGER|DATABASEINITIALIZATION|SEED|DEMOACCOUNTS|RATELIMITING|AUTHENTICATION|SMTPSETTINGS|DATAPROTECTION|BOOTSTRAP)__') {
            $taskStart.EnvironmentVariables.Remove($taskKey)
        }
    }
    $taskValues = @{
        DOTNET_ENVIRONMENT='Production'; ASPNETCORE_ENVIRONMENT='Production'
        DATABASE__PROVIDER='PostgreSQL'
        CONNECTIONSTRINGS__MYCNN='Host=127.0.0.1;Port=65431;Database=synthetic;Username=synthetic;Password=synthetic;SSL Mode=Disable;Timeout=1'
        JWTSETTINGS__KEY='Synthetic-signing-key-not-used-outside-tests-123456789'
        CORS__ALLOWEDORIGINS__0='https://client.example.test'; APPSETTINGS__CLIENTURL='https://client.example.test'
        BACKGROUNDJOBS__ENABLED='false'; STORAGE__PROVIDER='Local'
        DATABASEINITIALIZATION__ENABLED='false'; SEED__ENABLED='false'; DEMOACCOUNTS__ENABLED='false'
    }
    foreach ($taskKey in $taskOverrides.Keys) { $taskValues[$taskKey]=$taskOverrides[$taskKey] }
    foreach ($taskKey in $taskValues.Keys) { $taskStart.EnvironmentVariables[$taskKey]=[string]$taskValues[$taskKey] }
    $taskProcess = New-Object Diagnostics.Process
    $taskProcess.StartInfo=$taskStart
    try {
        [void]$taskProcess.Start()
        $taskStdout = $taskProcess.StandardOutput.ReadToEndAsync()
        $taskStderr = $taskProcess.StandardError.ReadToEndAsync()
        if (!$taskProcess.WaitForExit(30000)) { $taskProcess.Kill(); throw 'Configuration-only check timed out; it must not wait for a database.' }
        return @{ ExitCode=$taskProcess.ExitCode; Text=$taskStdout.GetAwaiter().GetResult()+$taskStderr.GetAwaiter().GetResult() }
    } finally { $taskProcess.Dispose() }
}
$taskPostgres=Invoke-TaskCheck @{}
if ($taskPostgres.ExitCode -ne 0 -or $taskPostgres.Text -notmatch 'CONFIGURATION_OK') { throw ('PostgreSQL static check failed: '+$taskPostgres.Text) }
$taskSql=Invoke-TaskCheck @{ DATABASE__PROVIDER='SqlServer'; CONNECTIONSTRINGS__MYCNN='Server=127.0.0.1,65431;Database=synthetic;User ID=synthetic;Password=synthetic;Encrypt=true;Connect Timeout=1' }
if ($taskSql.ExitCode -ne 0 -or $taskSql.Text -notmatch 'CONFIGURATION_OK') { throw ('SQL Server static check failed: '+$taskSql.Text) }
$taskInvalid=Invoke-TaskCheck @{ JWTSETTINGS__KEY='private-marker'; APPSETTINGS__CLIENTURL=''; CONNECTIONSTRINGS__MYCNN='Host=127.0.0.1;UnknownSecret=private-marker' }
if ($taskInvalid.ExitCode -eq 0 -or $taskInvalid.Text -notmatch 'CONFIGURATION_INVALID' -or $taskInvalid.Text -notmatch 'CONNECTIONSTRINGS__MYCNN' -or $taskInvalid.Text -notmatch 'JWTSETTINGS__KEY' -or $taskInvalid.Text -notmatch 'APPSETTINGS__CLIENTURL' -or $taskInvalid.Text -match 'private-marker') { throw 'Invalid config must fail with sanitized, actionable key names.' }
$taskInvalidProvider=Invoke-TaskCheck @{ DATABASE__PROVIDER='invalid-provider' }
if ($taskInvalidProvider.ExitCode -eq 0 -or $taskInvalidProvider.Text -notmatch 'CONFIGURATION_INVALID' -or $taskInvalidProvider.Text -notmatch 'DATABASE__PROVIDER') { throw 'Invalid provider must use the common configuration error before DI registration.' }
Write-Output 'PASS: clean Production publish, static checks for both providers, actionable errors without credentials.'
Write-Output 'No owner secret store, database connection, worker, migration, seed, dashboard or email was used.'
