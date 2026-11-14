@echo off
chcp 65001 > nul
cd /d "%~dp0"
if not exist "node_modules\hono\package.json" (
  call npm ci
  if errorlevel 1 exit /b 1
)
if not defined BOOKING_PORT set "BOOKING_PORT=3000"
echo Starting WaveMusic site and Hono API on port %BOOKING_PORT%...
start "WaveMusic Hono" cmd /k "npm start"
timeout /t 2 /nobreak > nul
start "" "http://127.0.0.1:%BOOKING_PORT%"
