@echo off
cd /d "%~dp0"
title Aman System - Install
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Download the LTS version from https://nodejs.org then run this file again.
  pause
  exit /b 1
)
echo Installing dependencies (needs internet, one time only)...
call npm install
if errorlevel 1 (
  echo.
  echo Install failed. Check your internet connection and try again.
  pause
  exit /b 1
)
echo.
echo Done. Now run 2-run.bat to start the program.
pause
