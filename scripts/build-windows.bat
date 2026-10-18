@echo off
REM Double-click to build the BluePhoenix Windows installers (.exe and .msi).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-windows.ps1" %*
echo.
pause
