param([string]$PostgresBin = 'C:\Program Files\PostgreSQL\18\bin')
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
$devRoot = Join-Path $projectRoot '.tools\local-dev'
$dataDir = Join-Path $devRoot 'postgres-data'
$credentialsPath = Join-Path $devRoot 'database.json'
$bundledJava = Join-Path $projectRoot '.tools\jdk21\jdk-21.0.12.1+1'
if (Test-Path (Join-Path $bundledJava 'bin\java.exe')) { $env:JAVA_HOME = $bundledJava }
if (-not $env:JAVA_HOME -or -not (Test-Path "$env:JAVA_HOME\bin\java.exe")) { throw 'Configura JAVA_HOME con un JDK 21.' }
$javaVersion = (& "$env:JAVA_HOME\bin\java.exe" -version 2>&1 | Out-String)
if ($javaVersion -notmatch 'version "21[.]') { throw 'EduPlan necesita JDK 21.' }
foreach ($binary in @('initdb.exe', 'pg_ctl.exe', 'psql.exe')) {
    if (-not (Test-Path (Join-Path $PostgresBin $binary))) { throw "No existe $binary en PostgresBin. Indica la carpeta bin de PostgreSQL." }
}
New-Item -ItemType Directory -Force -Path $devRoot | Out-Null
if (-not (Test-Path $credentialsPath)) {
    if (Test-Path (Join-Path $dataDir 'PG_VERSION')) { throw 'La instancia existe pero faltan sus credenciales locales. No se modificó.' }
    $password = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
    @{ password = $password } | ConvertTo-Json | Set-Content -LiteralPath $credentialsPath
}
$env:PGPASSWORD = (Get-Content -LiteralPath $credentialsPath -Raw | ConvertFrom-Json).password
if (-not (Test-Path (Join-Path $dataDir 'PG_VERSION'))) {
    $passwordFile = Join-Path $devRoot 'initdb-password.tmp'
    [IO.File]::WriteAllText($passwordFile, $env:PGPASSWORD)
    try {
        & "$PostgresBin\initdb.exe" -D $dataDir -U eduplan_dev -A scram-sha-256 --pwfile=$passwordFile --encoding=UTF8
        if ($LASTEXITCODE -ne 0) { throw 'Falló initdb de la instancia aislada.' }
    } finally { Remove-Item -LiteralPath $passwordFile -ErrorAction SilentlyContinue }
}
& "$PostgresBin\pg_ctl.exe" -D $dataDir status *> $null
if ($LASTEXITCODE -ne 0) {
    & "$PostgresBin\pg_ctl.exe" -D $dataDir -l (Join-Path $devRoot 'postgres.log') -o '-h 127.0.0.1 -p 55432' -w start
    if ($LASTEXITCODE -ne 0) { throw 'No pudo arrancar PostgreSQL aislado. Consulta .tools/local-dev/postgres.log.' }
}
$exists = & "$PostgresBin\psql.exe" -h 127.0.0.1 -p 55432 -U eduplan_dev -d postgres -Atc "SELECT 1 FROM pg_database WHERE datname='eduplan_local'"
if ($LASTEXITCODE -ne 0) { throw 'No se pudo conectar a la instancia aislada.' }
if ($exists -ne '1') {
    & "$PostgresBin\psql.exe" -h 127.0.0.1 -p 55432 -U eduplan_dev -d postgres -v ON_ERROR_STOP=1 -c 'CREATE DATABASE eduplan_local'
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo crear eduplan_local.' }
}
$env:DB_URL = 'jdbc:postgresql://127.0.0.1:55432/eduplan_local'
$env:DB_USER = 'eduplan_dev'
$env:DB_PASSWORD = $env:PGPASSWORD
$env:DB_BASELINE_EXISTING = 'false'
$env:JWT_SECRET = [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
$env:SERVER_ADDRESS = '127.0.0.1'
$env:SERVER_PORT = '8080'
Write-Host 'PostgreSQL aislado: 127.0.0.1:55432/eduplan_local. Backend: 127.0.0.1:8080.'
Write-Host 'JWT generado solo en memoria; PostgreSQL conserva datos en .tools/local-dev (ignorado por Git).'
Push-Location (Join-Path $projectRoot 'backend\src')
try { & .\mvnw.cmd -B -ntp spring-boot:run; if ($LASTEXITCODE -ne 0) { throw 'El backend terminó con un error.' } }
finally { Pop-Location; Remove-Item Env:JWT_SECRET, Env:DB_PASSWORD, Env:PGPASSWORD -ErrorAction SilentlyContinue }
