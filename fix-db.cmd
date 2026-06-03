@echo off
setlocal

REM ============================================================
REM  SmartEval - patch an existing database in place (KEEPS DATA)
REM  Adds columns / enum values that older databases are missing
REM  (departments, users.department_id, users.id_number,
REM   projects.department_id, userrole 'admin').
REM  Safe to run repeatedly - every statement is IF NOT EXISTS.
REM
REM  Run this from the project folder on the affected machine when
REM  the backend crashes with: column ... does not exist.
REM ============================================================

cd /d "%~dp0"

echo.
echo [fix-db] Starting PostgreSQL only...
docker compose up -d postgres
if errorlevel 1 (
    echo [ERROR] Could not start the postgres service. Is Docker running?
    pause
    exit /b 1
)

echo [fix-db] Waiting a few seconds for PostgreSQL to accept connections...
timeout /t 5 /nobreak >nul

echo [fix-db] Applying additive schema fixes...
docker compose exec -T postgres psql -U postgres -d smart_eval -c "ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'admin';"
docker compose exec -T postgres psql -U postgres -d smart_eval -c "CREATE TABLE IF NOT EXISTS departments (id SERIAL PRIMARY KEY, name VARCHAR UNIQUE NOT NULL, code VARCHAR(20) UNIQUE, created_at TIMESTAMP DEFAULT now());"
docker compose exec -T postgres psql -U postgres -d smart_eval -c "ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(id);"
docker compose exec -T postgres psql -U postgres -d smart_eval -c "ALTER TABLE users ADD COLUMN IF NOT EXISTS id_number VARCHAR;"
docker compose exec -T postgres psql -U postgres -d smart_eval -c "ALTER TABLE projects ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(id);"

echo.
echo [fix-db] Done. Starting the full stack...
docker compose up --build -d

echo.
echo [fix-db] Complete. Check logs with:  docker compose logs -f backend
echo.
pause
endlocal
