param([string]$PostgresBin = $env:POSTGRES_BIN)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$dataDir = Join-Path $projectRoot '.tools\local-dev\postgres-data'
if (-not $PostgresBin) {
    $existingEmbedded = Get-ChildItem (Join-Path $env:TEMP 'embedded-pg') -Directory -ErrorAction SilentlyContinue |
        Where-Object { Test-Path (Join-Path $_.FullName 'bin\pg_ctl.exe') } | Select-Object -First 1
    if (Test-Path 'C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe') { $PostgresBin = 'C:\Program Files\PostgreSQL\18\bin' }
    elseif ($existingEmbedded) { $PostgresBin = Join-Path $existingEmbedded.FullName 'bin' }
    else { $PostgresBin = Join-Path $projectRoot '.tools\postgres\bin' }
}
if (-not (Test-Path (Join-Path $dataDir 'PG_VERSION'))) { throw 'La instancia aislada no existe.' }
& "$PostgresBin\pg_ctl.exe" -D $dataDir -m fast -w stop
if ($LASTEXITCODE -ne 0) { throw 'No se pudo detener la instancia aislada.' }
