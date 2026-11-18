$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$stateFile = Join-Path $projectRoot '.local\demo-processo.json'
try {
    if (-not (Test-Path $stateFile)) { Write-Host 'Não há execução local registrada.'; exit 0 }
    $state = Get-Content $stateFile -Raw | ConvertFrom-Json
    $address = [Uri]$state.url
    if ($address.Host -ne 'localhost' -or $address.Scheme -ne 'http' -or $address.AbsolutePath -ne '/') { throw 'Endereço local inesperado. Nenhuma ação foi executada.' }
    $apiUrl = "http://127.0.0.1:$($address.Port)"
    try { $running = Invoke-RestMethod "$apiUrl/barberflow-local.json" -TimeoutSec 3 } catch {
        $socket = New-Object Net.Sockets.TcpClient
        try { $socket.Connect('127.0.0.1',$address.Port); throw 'A porta está ocupada, mas o aplicativo não pôde ser identificado.' } catch [Net.Sockets.SocketException] {
            Write-Host 'O BarberFlow já está encerrado.'
            Remove-Item -LiteralPath $stateFile
            exit 0
        } finally { $socket.Dispose() }
    }
    if ($running.buildId -ne $state.buildId) { throw 'A execução atual não corresponde à registrada. Nenhum programa foi encerrado.' }
    $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    $csrf = Invoke-RestMethod "$apiUrl/api/auth/csrf" -WebSession $session -TimeoutSec 10
    $headers=@{}; $headers[$csrf.header]=$csrf.token
    Invoke-RestMethod "$apiUrl/api/auth/login" -Method Post -WebSession $session -Headers $headers -ContentType 'application/json' -Body '{"email":"admin@barberflow.local","senha":"BarberFlow!2026"}' -TimeoutSec 15 | Out-Null
    $csrf = Invoke-RestMethod "$apiUrl/api/auth/csrf" -WebSession $session -TimeoutSec 10
    $headers=@{'X-BarberFlow-Local-Control'=$state.controlToken}; $headers[$csrf.header]=$csrf.token
    Invoke-WebRequest "$apiUrl/api/local-demo/encerrar" -UseBasicParsing -Method Post -WebSession $session -Headers $headers -TimeoutSec 10 | Out-Null
    for ($attempt=0; $attempt -lt 30; $attempt++) {
        Start-Sleep -Milliseconds 500
        $socket = New-Object Net.Sockets.TcpClient
        try { $socket.Connect('127.0.0.1',$address.Port) } catch {
            Remove-Item -LiteralPath $stateFile
            Write-Host 'BarberFlow encerrado. Os dados foram preservados.' -ForegroundColor Green
            exit 0
        } finally { $socket.Dispose() }
    }
    throw 'O encerramento ainda está em andamento. Confira .local\demo-servidor.log.'
} catch { Write-Host $_.Exception.Message -ForegroundColor Red; exit 1 }
