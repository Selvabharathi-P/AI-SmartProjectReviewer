# ============================================================
#  SmartEval - patch an existing database in place (KEEPS DATA)
#  Adds columns / enum values that older databases are missing
#  (departments, users.department_id, users.id_number,
#   projects.department_id, userrole 'admin').
#  Safe to run repeatedly - every statement is IF NOT EXISTS.
#
#  Run this from the project folder on the affected machine when
#  the backend crashes with: column ... does not exist.
#
#  Usage: powershell -ExecutionPolicy Bypass -File .\fix-db.ps1
# ============================================================

$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot

Write-Host ""
Write-Host "[fix-db] Starting PostgreSQL only..." -ForegroundColor Green
docker compose up -d postgres
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Could not start the postgres service. Is Docker running?" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[fix-db] Waiting a few seconds for PostgreSQL to accept connections..."
Start-Sleep -Seconds 5

$statements = @(
    "ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'admin';",
    "CREATE TABLE IF NOT EXISTS departments (id SERIAL PRIMARY KEY, name VARCHAR UNIQUE NOT NULL, code VARCHAR(20) UNIQUE, created_at TIMESTAMP DEFAULT now());",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(id);",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS id_number VARCHAR;",
    "ALTER TABLE projects ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(id);"
)

Write-Host "[fix-db] Applying additive schema fixes..." -ForegroundColor Green
foreach ($sql in $statements) {
    docker compose exec -T postgres psql -U postgres -d smart_eval -c $sql
}

Write-Host ""
Write-Host "[fix-db] Done. Starting the full stack..." -ForegroundColor Green
docker compose up --build -d

Write-Host ""
Write-Host "[fix-db] Complete. Check logs with:  docker compose logs -f backend" -ForegroundColor Cyan
Write-Host ""
