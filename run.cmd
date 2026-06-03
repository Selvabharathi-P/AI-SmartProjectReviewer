@echo off
setlocal enabledelayedexpansion

REM ============================================================
REM  SmartEval - run the whole stack (first time or repeat run)
REM  Services: postgres, redis, backend (FastAPI), frontend (Next.js)
REM  Works for the very first launch AND for already-set-up systems.
REM ============================================================

cd /d "%~dp0"

echo.
echo ============================================================
echo   SmartEval - starting application
echo ============================================================
echo.

REM --- 1. Make sure Docker is installed and running -----------
docker version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not available.
    echo         Install Docker Desktop and make sure it is RUNNING, then try again.
    echo         https://www.docker.com/products/docker-desktop/
    echo.
    pause
    exit /b 1
)

docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker Desktop is installed but not running.
    echo         Start Docker Desktop, wait for it to say "Running", then re-run this file.
    echo.
    pause
    exit /b 1
)

REM --- 2. First-time setup: ensure backend\.env exists --------
if not exist "backend\.env" (
    echo [SETUP] backend\.env not found - creating it from backend\.env.example ...
    copy /Y "backend\.env.example" "backend\.env" >nul
    echo.
    echo   ^>^> IMPORTANT: open backend\.env and fill in your API keys:
    echo        MISTRAL_API_KEY=...
    echo        SERPER_API_KEY=...
    echo      AI scoring / feedback / web research will not work until these are set.
    echo.
)

REM --- 3. Build + start everything (detached) -----------------
REM     --build is cache-aware: slow the first time, fast afterwards.
echo [RUN] Building images and starting containers (this can take a few minutes the first time)...
echo.
docker compose up --build -d
if errorlevel 1 (
    echo.
    echo [ERROR] docker compose failed to start. See the messages above.
    echo.
    pause
    exit /b 1
)

REM --- 4. Wait for the backend health check -------------------
echo.
echo [WAIT] Waiting for the backend to become healthy...
set /a tries=0
:waitloop
set /a tries+=1
for /f "tokens=*" %%s in ('docker inspect -f "{{.State.Health.Status}}" smart-project-review-and-eval-backend-1 2^>nul') do set "health=%%s"
if /i "!health!"=="healthy" goto ready
if !tries! geq 30 (
    echo [WARN] Backend did not report healthy in time. It may still be starting.
    echo        Check logs with:  docker compose logs -f backend
    goto ready
)
timeout /t 5 /nobreak >nul
goto waitloop

:ready
echo.
echo ============================================================
echo   SmartEval is up.
echo ------------------------------------------------------------
echo   Frontend      http://localhost:3000
echo   Backend API   http://localhost:8000/docs
echo   Health        http://localhost:8000/health
echo ------------------------------------------------------------
echo   Logs:   docker compose logs -f
echo   Stop:   docker compose down       (keeps database data)
echo   Reset:  docker compose down -v     (wipes database)
echo ============================================================
echo.

start "" "http://localhost:3000"

endlocal
