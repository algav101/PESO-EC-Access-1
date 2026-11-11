@echo off
setlocal
title PESO EC Access - Localhost
cd /d "%~dp0"
where node.exe >nul 2>&1
if errorlevel 1 (
  echo Node.js was not found. Install Node.js 20 or newer, then open this file again.
  pause
  exit /b 1
)
node.exe "%~dp0scripts\start-localhost.mjs" %*
set "LAUNCH_RESULT=%ERRORLEVEL%"
if not "%LAUNCH_RESULT%"=="0" pause
exit /b %LAUNCH_RESULT%
