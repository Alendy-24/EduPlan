param([string]$PostgresBin = 'C:\Program Files\PostgreSQL\18\bin')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$dataDir = Join-Path $projectRoot '.tools\local-dev\postgres-data'
if (-not (Test-Path (Join-Path $dataDir 'PG_VERSION'))) { throw 'La instancia aislada no existe.' }
& "$PostgresBin\pg_ctl.exe" -D $dataDir -m fast -w stop
if ($LASTEXITCODE -ne 0) { throw 'No se pudo detener la instancia aislada.' }
