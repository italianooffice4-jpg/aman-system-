@echo off
cd /d "%~dp0.."
echo ===== Publish a new release to GitHub =====
set /p VER=Version number (example 15.2.1): 
if "%VER%"=="" goto :eof
if not exist "RELEASES\v%VER%.md" goto nonotes
git add -A
git commit -m "v%VER%"
git tag v%VER%
git push
git push origin v%VER%
echo.
echo Done. Open the Actions tab on GitHub; after about 2 minutes the release is published.
pause
goto :eof
:nonotes
echo.
echo Create the notes file first: RELEASES\v%VER%.md
echo Write what is new inside it, save it, then run this file again.
pause
