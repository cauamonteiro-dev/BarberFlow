$ErrorActionPreference='Stop'
Push-Location (Join-Path $PSScriptRoot '../frontend')
try {
    if(-not (Test-Path 'node_modules')) { & npm.cmd ci; if($LASTEXITCODE -ne 0) { throw 'Falha ao instalar as dependências.' } }
    & npm.cmd run dev
    if($LASTEXITCODE -ne 0) { throw 'O frontend não iniciou. Confira o log acima.' }
} finally { Pop-Location }
