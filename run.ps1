# ============================================================
#  SmartEval - run the whole stack (first time or repeat run)
#  Services: postgres, redis, backend (FastAPI), frontend (Next.js)
#  Works for the very first launch AND for already-set-up systems.
#
#  Usage:   right-click > Run with PowerShell
#       or: powershell -ExecutionPolicy Bypass -File .\run.ps1
# ============================================================

$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  SmartEval - starting application" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# --- 1. Make sure Docker is installed and running -----------
docker version *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Docker is not available." -ForegroundColor Red
    Write-Host "        Install Docker Desktop and make sure it is RUNNING, then try again."
    Write-Host "        https://www.docker.com/products/docker-desktop/"
    Read-Host "Press Enter to exit"
    exit 1
}

docker info *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Docker Desktop is installed but not running." -ForegroundColor Red
    Write-Host "        Start Docker Desktop, wait until it says 'Running', then re-run this script."
    Read-Host "Press Enter to exit"
    exit 1
}

# --- 2. First-time setup: ensure backend\.env exists --------
if (-not (Test-Path "backend\.env")) {
    Write-Host "[SETUP] backend\.env not found - creating it from backend\.env.example ..." -ForegroundColor Yellow
    Copy-Item "backend\.env.example" "backend\.env" -Force
    Write-Host ""
    Write-Host "  >> IMPORTANT: open backend\.env and fill in your API keys:" -ForegroundColor Yellow
    Write-Host "       MISTRAL_API_KEY=..."
    Write-Host "       SERPER_API_KEY=..."
    Write-Host "     AI scoring / feedback / web research will not work until these are set."
    Write-Host ""
}

# --- 3. Build + start everything (detached) -----------------
#     --build is cache-aware: slow the first time, fast afterwards.
Write-Host "[RUN] Building images and starting containers (first run can take a few minutes)..." -ForegroundColor Green
Write-Host ""
docker compose up --build -d
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[ERROR] docker compose failed to start. See the messages above." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# --- 4. Wait for the backend health check -------------------
Write-Host ""
Write-Host "[WAIT] Waiting for the backend to become healthy..." -ForegroundColor Green
$backend = "smart-project-review-and-eval-backend-1"
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    $health = (docker inspect -f "{{.State.Health.Status}}" $backend 2>$null)
    if ($health -eq "healthy") { $ready = $true; break }
    Start-Sleep -Seconds 5
}
if (-not $ready) {
    Write-Host "[WARN] Backend did not report healthy in time. It may still be starting." -ForegroundColor Yellow
    Write-Host "       Check logs with:  docker compose logs -f backend"
}

# --- 5. Summary + open browser ------------------------------
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  SmartEval is up." -ForegroundColor Green
Write-Host "------------------------------------------------------------"
Write-Host "  Frontend      http://localhost:3000"
Write-Host "  Backend API   http://localhost:8000/docs"
Write-Host "  Health        http://localhost:8000/health"
Write-Host "------------------------------------------------------------"
Write-Host "  Logs:   docker compose logs -f"
Write-Host "  Stop:   docker compose down       (keeps database data)"
Write-Host "  Reset:  docker compose down -v     (wipes database)"
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

Start-Process "http://localhost:3000"
