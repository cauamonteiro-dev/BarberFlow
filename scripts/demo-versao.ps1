function Get-DemoSourceHash([string]$ProjectRoot) {
    $files = @()
    foreach ($relative in @('backend\src\main', 'frontend\src', 'frontend\public')) {
        $files += Get-ChildItem (Join-Path $ProjectRoot $relative) -File -Recurse
    }
    $files += Get-Item (Join-Path $ProjectRoot 'backend\src\test\java\br\com\barberflow\LocalDemoApplication.java')
    $files += Get-Item (Join-Path $ProjectRoot 'frontend\package-lock.json')
    $files += Get-Item (Join-Path $ProjectRoot 'frontend\index.html')
    $files += Get-Item (Join-Path $ProjectRoot 'scripts\preparar-demo.ps1')
    $files += Get-Item (Join-Path $ProjectRoot 'scripts\demo-versao.ps1')
    $entries = $files | Sort-Object FullName | ForEach-Object {
        $fileHash = [Security.Cryptography.SHA256]::Create()
        $stream = [IO.File]::OpenRead($_.FullName)
        try { $_.FullName.Substring($ProjectRoot.Length) + ':' + [BitConverter]::ToString($fileHash.ComputeHash($stream)).Replace('-', '') } finally { $stream.Dispose(); $fileHash.Dispose() }
    }
    $hash = [Security.Cryptography.SHA256]::Create()
    try { return [BitConverter]::ToString($hash.ComputeHash([Text.Encoding]::UTF8.GetBytes(($entries -join "`n")))).Replace('-', '') } finally { $hash.Dispose() }
}
