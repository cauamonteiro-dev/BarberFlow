param([string]$JavaHome = $env:JAVA_HOME)
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
. (Join-Path $PSScriptRoot 'demo-versao.ps1')
$runtimeDir = Join-Path $projectRoot '.local\demo-runtime'
$stageDir = Join-Path $runtimeDir 'classes'
$libDir = Join-Path $runtimeDir 'lib'
if (-not $JavaHome -and (Test-Path 'C:\Program Files\Java\jdk-21')) { $JavaHome = 'C:\Program Files\Java\jdk-21' }
if (-not $JavaHome) { throw 'Configure JAVA_HOME com um JDK 21.' }
$env:JAVA_HOME = $JavaHome
$javac = Join-Path $JavaHome 'bin\javac.exe'
$jar = Join-Path $JavaHome 'bin\jar.exe'
New-Item -ItemType Directory -Force $runtimeDir, $libDir | Out-Null
if (-not (Get-ChildItem $libDir -Filter '*.jar')) {
    Push-Location (Join-Path $projectRoot 'backend')
    try {
        & .\mvnw.cmd dependency:copy-dependencies '-DincludeScope=test' "-DoutputDirectory=$libDir"
        if ($LASTEXITCODE -ne 0) { throw 'Não foi possível baixar as dependências do backend.' }
    } finally { Pop-Location }
}
Push-Location (Join-Path $projectRoot 'frontend')
try {
    if (-not (Test-Path node_modules)) { & npm.cmd ci; if ($LASTEXITCODE -ne 0) { throw 'Falha ao instalar as dependências da interface.' } }
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao compilar a interface.' }
} finally { Pop-Location }
if (Test-Path $stageDir) {
    # Este caminho é fixo, interno ao pacote local, e nunca é o diretório do banco.
    if ([IO.Path]::GetFullPath($stageDir) -ne [IO.Path]::GetFullPath((Join-Path $projectRoot '.local\demo-runtime\classes'))) { throw 'Diretório de compilação inesperado.' }
    Remove-Item -LiteralPath $stageDir -Recurse -Force
}
New-Item -ItemType Directory -Force $stageDir | Out-Null
$sources = @(Get-ChildItem (Join-Path $projectRoot 'backend\src\main\java') -Filter '*.java' -Recurse | ForEach-Object { '"' + $_.FullName.Replace('\','/') + '"' })
$sources += '"' + (Join-Path $projectRoot 'backend\src\test\java\br\com\barberflow\LocalDemoApplication.java').Replace('\','/') + '"'
$sourceFile = Join-Path $runtimeDir 'fontes.args'
[IO.File]::WriteAllLines($sourceFile, $sources, (New-Object Text.UTF8Encoding($false)))
& $javac --release 21 -parameters -encoding UTF-8 -cp "$libDir\*" -d $stageDir "@$sourceFile"
if ($LASTEXITCODE -ne 0) { throw 'Falha ao compilar o backend local.' }
Copy-Item -Path (Join-Path $projectRoot 'backend\src\main\resources\*') -Destination $stageDir -Recurse -Force
$staticDir = Join-Path $stageDir 'static'
New-Item -ItemType Directory -Force $staticDir | Out-Null
Copy-Item -Path (Join-Path $projectRoot 'frontend\dist\*') -Destination $staticDir -Recurse -Force
$build = @{buildId=[Guid]::NewGuid().ToString(); sourceHash=(Get-DemoSourceHash $projectRoot); description='BarberFlow - demonstração local integrada'; builtAt=[DateTimeOffset]::Now.ToString('o')}
[IO.File]::WriteAllText((Join-Path $staticDir 'barberflow-local.json'), ($build | ConvertTo-Json), (New-Object Text.UTF8Encoding($false)))
& $jar --create --file (Join-Path $runtimeDir 'barberflow-local.jar') -C $stageDir .
if ($LASTEXITCODE -ne 0) { throw 'Falha ao empacotar o BarberFlow local. Encerre a execução anterior antes de recompilar.' }
$build | ConvertTo-Json | Set-Content (Join-Path $runtimeDir 'build.json') -Encoding UTF8
Write-Host 'Pacote preparado. Agora use INICIAR-BARBERFLOW.cmd, inclusive sem internet.' -ForegroundColor Green
