@echo off
REM Run the whole pipeline once.
cd /d "%~dp0"
.venv\Scripts\python src\pipeline.py %1
