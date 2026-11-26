@echo off
cd /d "%~dp0"
title Aman System
if not exist node_modules\electron (
  echo Run 1-install.bat first.
  pause
  exit /b 1
)
call npm run ui:build
call npm start
