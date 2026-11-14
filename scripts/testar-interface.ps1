$ErrorActionPreference='Stop'
$env:PLAYWRIGHT_BROWSERS_PATH=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../.local/browsers'))
Push-Location (Join-Path $PSScriptRoot '../frontend')
try {
    & npx.cmd playwright install chromium
    if($LASTEXITCODE -ne 0) { throw 'Não foi possível preparar o Chromium.' }
    & npm.cmd run test:e2e
    if($LASTEXITCODE -ne 0) { throw 'Os testes de interface falharam. Confira o log e test-results.' }
} finally { Pop-Location }
