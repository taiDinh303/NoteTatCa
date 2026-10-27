param()
$ErrorActionPreference = 'Stop'
$mascotRoot = Split-Path -Parent $PSScriptRoot
[xml]$mascotProject = Get-Content -LiteralPath (Join-Path $mascotRoot 'ntc_aspnet/NTC.API/NTC.API.csproj') -Raw
$mascotSecretsId = [string]($mascotProject.Project.PropertyGroup.UserSecretsId | Where-Object { $_ } | Select-Object -First 1)
if ($mascotSecretsId -notmatch '^[0-9a-fA-F-]{36}$') { throw 'The API User Secrets identifier is invalid.' }
$mascotFolder = Join-Path ([Environment]::GetFolderPath('ApplicationData')) "Microsoft/UserSecrets/$mascotSecretsId"
$mascotPath = Join-Path $mascotFolder 'secrets.json'
$mascotValues = [ordered]@{}
if (Test-Path -LiteralPath $mascotPath) {
    $mascotExisting = Get-Content -LiteralPath $mascotPath -Raw | ConvertFrom-Json
    foreach ($mascotProperty in $mascotExisting.PSObject.Properties) { $mascotValues[$mascotProperty.Name] = $mascotProperty.Value }
}
$mascotSecureKey = Read-Host 'OpenAI API key (hidden; stored only in the local API User Secrets)' -AsSecureString
$mascotKeyPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($mascotSecureKey)
$mascotTemporaryPath = $null
try {
    $mascotPlainKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($mascotKeyPointer)
    if ([string]::IsNullOrWhiteSpace($mascotPlainKey)) { throw 'The key cannot be empty.' }
    if ($mascotValues.Contains('MascotAi') -and $mascotValues['MascotAi'] -is [pscustomobject]) {
        $mascotValues['MascotAi'].PSObject.Properties.Remove('OpenAiApiKey')
    }
    $mascotValues['MascotAi:OpenAiApiKey'] = $mascotPlainKey
    New-Item -ItemType Directory -Force -Path $mascotFolder | Out-Null
    $mascotTemporaryPath = Join-Path $mascotFolder ('mascot-key-' + [Guid]::NewGuid().ToString('N') + '.tmp')
    [IO.File]::WriteAllText($mascotTemporaryPath, ($mascotValues | ConvertTo-Json -Depth 30), [Text.UTF8Encoding]::new($false))
    Move-Item -LiteralPath $mascotTemporaryPath -Destination $mascotPath -Force
    Write-Output 'OpenAI key saved in the API User Secrets. No server was started and no AI request was sent.'
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($mascotKeyPointer)
    if ($mascotTemporaryPath -and (Test-Path -LiteralPath $mascotTemporaryPath)) { Remove-Item -LiteralPath $mascotTemporaryPath -Force }
    $mascotPlainKey = $null
    $mascotValues = $null
    $mascotSecureKey.Dispose()
}
