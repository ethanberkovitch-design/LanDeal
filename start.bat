@echo off
title LanDeal Server
echo ========================================
echo    LanDeal - Starting Server...
echo ========================================
echo.
cd /d "%~dp0"
echo Opening browser...
start http://localhost:3000
echo.
node server.js
pause
