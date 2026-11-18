param([switch]$SemNavegador, [switch]$ManterAberto, [int]$Porta = 8181)
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
. (Join-Path $PSScriptRoot 'demo-versao.ps1')
$localDir = Join-Path $projectRoot '.local'
$runtimeDir = Join-Path $localDir 'demo-runtime'
$url = "http://localhost:$Porta"
$apiUrl = "http://127.0.0.1:$Porta"
$buildFile = Join-Path $runtimeDir 'build.json'
$stateFile = Join-Path $localDir 'demo-processo.json'

function Test-Porta {
    $socket = New-Object Net.Sockets.TcpClient
    try { $socket.Connect('127.0.0.1', $Porta); return $true } catch { return $false } finally { $socket.Dispose() }
}
function Test-LoginDemo([string]$Email, [string]$Perfil) {
    $loginSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    $csrf = Invoke-RestMethod "$apiUrl/api/auth/csrf" -WebSession $loginSession -TimeoutSec 10
    $body = @{email=$Email; senha='BarberFlow!2026'} | ConvertTo-Json -Compress
    $headers = @{}; $headers[$csrf.header] = $csrf.token
    $user = Invoke-RestMethod "$apiUrl/api/auth/login" -Method Post -WebSession $loginSession -ContentType 'application/json' -Body $body -Headers $headers -TimeoutSec 15
    $validProfile = if ($Perfil -eq 'CLIENTE') { $null -ne $user.clienteId } else { [bool]($user.papeis | Where-Object { $_.perfil -eq $Perfil }) }
    if (-not $validProfile) { throw "Perfil inesperado para $Email." }
    # A sessão de teste não é compartilhada com o navegador e é encerrada aqui.
    $csrf = Invoke-RestMethod "$apiUrl/api/auth/csrf" -WebSession $loginSession -TimeoutSec 10
    $headers = @{}; $headers[$csrf.header] = $csrf.token
    Invoke-WebRequest "$apiUrl/api/auth/logout" -UseBasicParsing -Method Post -WebSession $loginSession -Headers $headers -TimeoutSec 10 | Out-Null
}

try {
    if (-not (Test-Path $buildFile)) {
        Write-Host 'Preparando o BarberFlow para a primeira execução...'
        & (Join-Path $PSScriptRoot 'preparar-demo.ps1')
    }
    $build = Get-Content $buildFile -Raw | ConvertFrom-Json
    if ($build.sourceHash -ne (Get-DemoSourceHash $projectRoot)) {
        if (Test-Porta) { throw 'Há alterações novas no projeto. Use ENCERRAR-BARBERFLOW.cmd e depois inicie novamente para preparar a versão atual.' }
        Write-Host 'Preparando as alterações mais recentes...'
        & (Join-Path $PSScriptRoot 'preparar-demo.ps1')
        $build = Get-Content $buildFile -Raw | ConvertFrom-Json
    }
    $javaCommand = Get-Command java.exe -ErrorAction SilentlyContinue
    $javaExe = if (Test-Path 'C:\Program Files\Java\jdk-21\bin\java.exe') { 'C:\Program Files\Java\jdk-21\bin\java.exe' } elseif ($javaCommand) { $javaCommand.Source } else { throw 'Instale o Java 21 para executar o BarberFlow.' }
    if (Test-Porta) {
        try { $running = Invoke-RestMethod "$apiUrl/barberflow-local.json" -TimeoutSec 5 } catch { throw "A porta $Porta está ocupada por outro programa. Nenhum processo foi encerrado." }
        if ($running.buildId -ne $build.buildId) { throw "Já há outra versão usando a porta $Porta. Encerre o BarberFlow anterior antes de iniciar a versão atual." }
        Write-Host 'O BarberFlow já está aberto. Conferindo a conexão...' -ForegroundColor Cyan
    } else {
        Write-Host 'Iniciando o BarberFlow atualizado e seu banco local...' -ForegroundColor Cyan
        $log = Join-Path $localDir 'demo-servidor.log'
        $errLog = Join-Path $localDir 'demo-erros.log'
        $dbDir = Join-Path $localDir 'demo-dados'
        $appJar = Join-Path $runtimeDir 'barberflow-local.jar'
        $libDir = Join-Path $runtimeDir 'lib\*'
        $controlToken = [Guid]::NewGuid().ToString('N') + [Guid]::NewGuid().ToString('N')
        $javaArgs = @('"-Dfile.encoding=UTF-8"', "`"-Dbarberflow.port=$Porta`"", '"-Dbarberflow.dbPort=55441"', "`"-Dbarberflow.data=$dbDir`"", "`"-Dbarberflow.controlToken=$controlToken`"", '-cp', "`"$appJar;$libDir`"", 'br.com.barberflow.LocalDemoApplication')
        $javaProcess = Start-Process -FilePath $javaExe -ArgumentList $javaArgs -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput $log -RedirectStandardError $errLog -PassThru
        @{processId=$javaProcess.Id; inicio=$javaProcess.StartTime.ToUniversalTime().ToString('o'); url=$url; buildId=$build.buildId; controlToken=$controlToken} | ConvertTo-Json | Set-Content $stateFile -Encoding UTF8
        $ready = $false
        for ($attempt=0; $attempt -lt 90; $attempt++) {
            $javaProcess.Refresh()
            if ($javaProcess.HasExited) { throw "O servidor parou. Consulte $errLog e $log." }
            try {
                $csrf = Invoke-RestMethod "$apiUrl/api/auth/csrf" -TimeoutSec 2
                if ($csrf.token) { $ready = $true; break }
            } catch { }
            Start-Sleep -Seconds 1
            if ($attempt % 15 -eq 14) { Write-Host 'Preparando o banco e a aplicação, aguarde...' }
        }
        if (-not $ready) { throw "A inicialização demorou mais que o esperado. Consulte $log." }
    }
    $running = Invoke-RestMethod "$apiUrl/barberflow-local.json" -TimeoutSec 5
    if ($running.buildId -ne $build.buildId) { throw 'A página e o servidor não pertencem à mesma versão.' }
    $html = (Invoke-WebRequest "$apiUrl/" -UseBasicParsing -TimeoutSec 5).Content
    if (-not $html.Contains('id="root"')) { throw 'A interface do BarberFlow não foi encontrada.' }
    Write-Host 'Conferindo os quatro perfis da demonstração...'
    # O Tomcat responde antes do fim do povoamento transacional das contas.
    # Aguarde a autenticação real, e não apenas a abertura da porta HTTP.
    $loginReady = $false
    for ($attempt=0; $attempt -lt 60; $attempt++) {
        try { Test-LoginDemo 'admin@barberflow.local' 'ADMIN'; $loginReady = $true; break } catch {
            if ($attempt -eq 59) { throw }
            Start-Sleep -Seconds 1
        }
    }
    if (-not $loginReady) { throw 'O banco abriu, mas o login de demonstração não ficou disponível.' }
    Test-LoginDemo 'barbearia1@barberflow.local' 'BARBEARIA'
    Test-LoginDemo 'barbeiro@barberflow.local' 'BARBEIRO'
    Test-LoginDemo 'cliente@barberflow.local' 'CLIENTE'
    Write-Host "`nBarberFlow pronto: $url" -ForegroundColor Green
    Write-Host 'Login conferido: administrador, barbearia, barbeiro e cliente.'
    Write-Host 'Senha das contas de demonstração: BarberFlow!2026'
    Write-Host 'Use sempre INICIAR-BARBERFLOW.cmd. Não é necessário abrir front e backend separadamente.'
    if ($ManterAberto -and $javaProcess) { Write-Host 'Mantenha esta janela aberta durante o uso. Para encerrar, use ENCERRAR-BARBERFLOW.cmd.' }
    if (-not $SemNavegador) { Start-Process $url }
    if ($ManterAberto -and $javaProcess) { Wait-Process -Id $javaProcess.Id }
} catch {
    Write-Host "`nNão foi possível preparar o acesso: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Os dados locais foram preservados. Registros: $localDir"
    exit 1
}
