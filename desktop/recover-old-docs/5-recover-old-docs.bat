@echo off
cd /d "%~dp0"
title Recover old documents
set OLD=%APPDATA%\InsuranceSystem
set EL=%~dp0node_modules\electron\dist\electron.exe
if not exist "%OLD%" goto noold
if not exist "%EL%" goto noelectron
if not exist "%~dp0tools\recover-old\main.js" goto notool
echo.
echo 1) Close the Aman System program completely.
echo 2) This tool COPIES the old data folder (it never changes the original).
echo.
pause
rmdir /s /q "%TEMP%\aman-old-copy" 2>nul
xcopy "%OLD%" "%TEMP%\aman-old-copy" /E /I /Y /Q >nul
"%EL%" "%~dp0tools\recover-old" "--old-copy=%TEMP%\aman-old-copy"
echo.
echo Done. Open Aman System now.
pause
goto :eof
:noold
echo Old data folder not found: %OLD%
pause
goto :eof
:noelectron
echo Electron not found at: %EL%
echo Run 1-install.bat first, or tell me what is inside node_modules\electron
pause
goto :eof
:notool
echo Folder tools\recover-old is missing next to this file. Unzip recover-old-docs.zip into this folder.
pause
