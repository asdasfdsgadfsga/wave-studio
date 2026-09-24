@echo off
echo =======================================
echo    Starting WaveMusic Studio...
echo =======================================
echo.
echo [1/3] Starting Backend server...
start "WaveMusic Backend" cmd /k "node backend/server.js"

echo [2/3] Starting Frontend server...
start "WaveMusic Frontend" cmd /k "node serve.js"

echo.
echo Waiting for servers to start (3 seconds)...
timeout /t 3 /nobreak > nul

echo [3/3] Opening site in browser...
start http://localhost:5050

echo.
echo All done! You can close this window.
timeout /t 5 > nul
