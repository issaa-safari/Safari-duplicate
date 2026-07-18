@echo off
REM Convenience wrapper: publish <video_name> [--dry-run] ...
cd /d "%~dp0"
.venv\Scripts\python src\publish.py post %*
