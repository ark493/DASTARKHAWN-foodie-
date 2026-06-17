@echo off
:: ==========================================
:: KARMA One-Click Launcher
:: ==========================================
echo [KARMA] Starting Backend Server...
start "Karma Backend Process" cmd /c "python karma_server.py & pause"
echo [KARMA] Waiting 2 seconds for server to initialize...
timeout /t 2 /nobreak >nul
echo [KARMA] Opening Frontend in your default browser...
:: Make sure you already have VS Code Live Server running on port 5500 for the best experience!
start "" "http://127.0.0.1:5500/Karma.html"
exit
