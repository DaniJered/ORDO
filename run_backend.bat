@echo off
set PYTHONPATH=%~dp0backend
echo Starting ORDO FastAPI Backend on http://localhost:8000 ...
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload --app-dir backend

