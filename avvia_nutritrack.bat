@echo off
chcp 65001 >nul
title NutriTrack — Diario Calorie e Macronutrienti
cd /d "%~dp0"
echo Avvio di NutriTrack in corso...
python "%~dp0server.py"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Errore durante l'avvio di Python. Assicurati che Python 3 sia installato.
    pause
)
