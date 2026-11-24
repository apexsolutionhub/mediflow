@echo off
rem Starts the MediFlow clinic server and opens the browser. Leave this window open while the clinic works.
cd /d "%~dp0.."
if exist "BackEnd\venv\Scripts\python.exe" (
  "BackEnd\venv\Scripts\python.exe" clinic-node\start_clinic.py %*
) else (
  python clinic-node\start_clinic.py %*
)
echo.
echo MediFlow has stopped. Press any key to close.
pause >nul
