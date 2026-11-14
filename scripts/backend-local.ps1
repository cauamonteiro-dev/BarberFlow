param([string]$JavaHome=$env:JAVA_HOME)
$ErrorActionPreference='Stop'
if (-not $JavaHome -and (Test-Path 'C:\Program Files\Java\jdk-21')) { $JavaHome='C:\Program Files\Java\jdk-21' }
if ($JavaHome) { $env:JAVA_HOME=$JavaHome }
Push-Location (Join-Path $PSScriptRoot '../backend')
try {
    & ./mvnw.cmd spring-boot:test-run '-Dspring-boot.run.main-class=br.com.barberflow.LocalDemoApplication'
    if($LASTEXITCODE -ne 0) { throw 'O backend não iniciou. Confira o log acima e a disponibilidade das portas 8080 e 55432.' }
} finally { Pop-Location }
