@echo off
chcp 65001 >nul
cd /d "%~dp0"
set "PSModulePath=%SystemRoot%\System32\WindowsPowerShell\v1.0\Modules"
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\iniciar-demo.ps1" -ManterAberto %*
if errorlevel 1 pause
