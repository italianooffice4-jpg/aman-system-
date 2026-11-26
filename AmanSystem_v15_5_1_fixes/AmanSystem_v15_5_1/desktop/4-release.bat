@echo off
chcp 65001 >nul
cd /d "%~dp0.."
echo ===== نشر تحديث جديد على GitHub =====
set /p VER=رقم الإصدار (مثال 15.3.0):
if "%VER%"=="" exit /b
if not exist "RELEASES\v%VER%.md" (
  echo.
  echo أنشئ أولًا ملف ملاحظات الإصدار: RELEASES\v%VER%.md  ^(اكتب فيه ما الجديد بالعربي^)
  pause & exit /b
)
git add -A
git commit -m "v%VER%"
git tag v%VER%
git push
git push origin v%VER%
echo.
echo تم الدفع. تابع البناء في تبويب Actions على GitHub (دقيقتان تقريبًا)، وبعدها يصل الإشعار داخل البرنامج.
pause
