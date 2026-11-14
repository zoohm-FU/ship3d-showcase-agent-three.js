@echo off
setlocal
cd /d "%~dp0"

echo ==================================================
echo   SHIP 3D V3.0  -  NINGYUAN DIANKUN
echo   Development server
echo ==================================================
echo.

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js / npm was not found.
  echo Install Node.js 20 or newer, then run this file again.
  echo https://nodejs.org/
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\three" (
  echo [1/2] Installing dependencies...
  call npm.cmd install
  if errorlevel 1 (
    echo.
    echo [ERROR] npm install failed.
    pause
    exit /b 1
  )
) else (
  echo [1/2] Dependencies found.
)

echo [2/2] Starting Vite on http://127.0.0.1:5174/
echo       Press Ctrl+C to stop.
echo.
start "" /min powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 2; Start-Process 'http://127.0.0.1:5174/'"
call npm.cmd run dev
if errorlevel 1 (
  echo.
  echo [ERROR] Development server stopped with an error.
  pause
)
