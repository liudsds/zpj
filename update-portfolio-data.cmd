@echo off
setlocal

set "ROOT=%~dp0"
set "NODE_EXE="

where node >nul 2>nul
if %errorlevel%==0 set "NODE_EXE=node"

if not defined NODE_EXE if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" set "NODE_EXE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"

if not defined NODE_EXE (
  echo Node.js not found.
  echo Install Node.js or keep using the Codex bundled runtime.
  pause
  exit /b 1
)

"%NODE_EXE%" "%ROOT%update-portfolio-data.mjs"
set "EXIT_CODE=%errorlevel%"

if not "%EXIT_CODE%"=="0" (
  echo.
  echo Update failed.
  pause
  exit /b %EXIT_CODE%
)

echo.
echo Project data updated successfully.
pause
