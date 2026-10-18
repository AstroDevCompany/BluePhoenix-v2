@echo off
REM Double-click to launch BluePhoenix in development mode.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0dev.ps1" %*
if errorlevel 1 pause
