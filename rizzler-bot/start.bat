 @echo off
title Rizzler Launcher
color 0A
echo ====================================
echo    RIZZLER CHATBOT LAUNCHER
echo ====================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python nahi mila! Install karo: python.org
    pause
    exit /b
)

echo [✓] Python mil gaya.
echo.

REM Kill any existing server on port 8000 (optional)
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8000" ^| find "LISTENING"') do taskkill /f /pid %%a >nul 2>&1

echo [~] Starting local server on port 8000...
start /B python -m http.server 8000 >nul 2>&1
timeout /t 3 /nobreak >nul

echo [✓] Server is running.
echo.
start http://localhost:8000/rizzler.html
echo ====================================
echo    Chatbot is ready! Enjoy the masti! 😎🔥
echo ====================================
echo.
pause