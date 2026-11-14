@echo off
setlocal
cd /d "%~dp0"

echo ==================================================
echo   SHIP 3D V3.0  -  NINGYUAN DIANKUN
echo   Production build + preview
echo ==================================================
echo.

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js / npm was not found.
  echo Install Node.js 20 or newer, then run this file again.
  pause
  exit /b 1
)

if not exist "node_modules\three" (
  echo [1/3] Installing dependencies...
  call npm.cmd install
  if errorlevel 1 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
  )
) else (
  echo [1/3] Dependencies found.
)

echo [2/3] Building production bundle...
call npm.cmd run build
if errorlevel 1 (
  echo.
  echo [ERROR] Build failed.
  pause
  exit /b 1
)

echo [3/3] Starting preview on http://127.0.0.1:4174/
echo       Press Ctrl+C to stop.
echo.
start "" /min powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://127.0.0.1:4174/'"
call npm.cmd run preview
if errorlevel 1 (
  echo.
  echo [ERROR] Preview stopped with an error.
  pause
)
