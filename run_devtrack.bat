@echo off
title DevTrack -- Academic and Agile Project Management Platform
color 0b

echo =====================================================================
echo          DevTrack -- Academic and Agile Project Management Platform
echo =====================================================================
echo.

cd /d "%~dp0"

:: 1. Check if PostgreSQL on port 5433 is listening
echo [1/3] Checking PostgreSQL Database on Port 5433...
netstat -ano | findstr ":5433" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% equ 0 goto pg_ok

echo [*] Starting PostgreSQL server on port 5433...
if exist "%LOCALAPPDATA%\DevTrack\pgdata" (
    "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" -D "%LOCALAPPDATA%\DevTrack\pgdata" -l "%LOCALAPPDATA%\DevTrack\postgres.log" start
) else if exist "%USERPROFILE%\AppData\Local\DevTrack\pgdata" (
    "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" -D "%USERPROFILE%\AppData\Local\DevTrack\pgdata" -l "%USERPROFILE%\AppData\Local\DevTrack\postgres.log" start
) else if exist "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" (
    "C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe" -D "C:\Program Files\PostgreSQL\18\data" -o "-p 5433" start
) else (
    net start postgresql-x64-18 >nul 2>&1
)

echo [*] Waiting for PostgreSQL database to initialize...
ping 127.0.0.1 -n 3 >nul
netstat -ano | findstr ":5433" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% equ 0 goto pg_ok

echo [*] Confirming PostgreSQL connection...
ping 127.0.0.1 -n 3 >nul

:pg_ok
echo [OK] PostgreSQL is active and accepting connections on port 5433.

:: 2. Check Python Virtual Environment
echo.
echo [2/3] Checking Backend Python Environment...
if not exist "backend\venv\Scripts\python.exe" (
    echo [ERROR] Virtual environment not found at backend\venv!
    echo Please ensure Python virtual environment is set up.
    pause
    exit /b 1
)
echo [OK] Python virtual environment verified.

:: 3. Launch Backend Server and Open Browser
echo.
echo [3/3] Checking DevTrack Application Server...
netstat -ano | findstr ":8000" | findstr "LISTENING" >nul 2>&1
if %ERRORLEVEL% equ 0 goto server_already_running

echo [*] Starting DevTrack application server...
echo [*] Website will open automatically in your browser...

:: Open browser after 2 seconds via clean background command
start "" cmd /c "ping 127.0.0.1 -n 3 >nul && start http://127.0.0.1:8000/devtrack.html"

echo.
echo =====================================================================
echo   Application URL: http://127.0.0.1:8000/devtrack.html
echo   Live Server URL: http://127.0.0.1:5501/devtrack.html
echo.
echo   Demo Login Accounts (Password: DevTrack@123):
echo     * Super Admin:    admin@devtrack.edu
echo     * HOD Computer:   hod.cse@devtrack.edu
echo     * Faculty Mentor: faculty.mehta@devtrack.edu
echo     * Student:        student.priya@devtrack.edu
echo =====================================================================
echo.

backend\venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --app-dir backend --env-file backend\.env
goto done

:server_already_running
echo [OK] DevTrack server is ALREADY running on http://127.0.0.1:8000!
echo [*] Opening DevTrack in your default browser...
start "" "http://127.0.0.1:8000/devtrack.html"
echo.
echo =====================================================================
echo   Application URL: http://127.0.0.1:8000/devtrack.html
echo   Live Server URL: http://127.0.0.1:5501/devtrack.html
echo.
echo   Demo Login Accounts (Password: DevTrack@123):
echo     * Super Admin:    admin@devtrack.edu
echo     * HOD Computer:   hod.cse@devtrack.edu
echo     * Faculty Mentor: faculty.mehta@devtrack.edu
echo     * Student:        student.priya@devtrack.edu
echo =====================================================================
echo.
echo DevTrack is now open in your browser.
echo You can keep this window open or press any key to close.
pause

:done
