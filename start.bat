@echo off
chcp 65001 > nul
echo =======================================
echo    Starting WaveMusic Studio Suite...
echo =======================================
echo.

echo [1/4] Starting Studio Backend (Port 3000)...
start "WaveMusic Backend" cmd /k "node backend/server.js"

echo [2/4] Starting AI Chatbot Server (Port 3005)...
start "Wave AI Chatbot" cmd /k "node server/index.js"

echo [3/4] Starting Frontend Server (Port 5050 / 8080)...
start "WaveMusic Frontend" cmd /k "node serve.js"

echo.
echo Waiting for servers to start (3 seconds)...
timeout /t 3 /nobreak > nul

echo [4/4] Opening site in browser...
start http://localhost:5050

echo.
echo =======================================
echo    All services are running!
echo    - Site:    http://localhost:5050
echo    - Chatbot: http://localhost:3005
echo =======================================
timeout /t 5 > nul
