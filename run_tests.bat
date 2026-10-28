@echo off
set PYTHONPATH=%~dp0backend
echo Running ORDO Pytest Test Suite...
python -m pytest backend/tests -v

