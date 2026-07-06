@echo off
setlocal

set "ROOT=%~dp0"
powershell -ExecutionPolicy Bypass -File "%ROOT%prepare-netlify-drop.ps1"
set "EXIT_CODE=%errorlevel%"

if not "%EXIT_CODE%"=="0" (
  echo.
  echo Netlify bundle build failed.
  pause
  exit /b %EXIT_CODE%
)

echo.
echo Netlify bundle ready in netlify-drop-build.
pause
