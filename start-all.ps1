# Start all services for FoundersFirst
# Run this script from the 'founders' directory

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Terminal 1: Frontend - npm run dev
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$rootDir\frontend'; Write-Host '=== FRONTEND ===' -ForegroundColor Cyan; npm run dev"

# Terminal 2: Backend - activate .venv & run main.py
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$rootDir\backend'; Write-Host '=== BACKEND ===' -ForegroundColor Green; .\.venv\Scripts\Activate.ps1; Start-Sleep -Seconds 2; python main.py"

# Terminal 3: AI Backend - activate .venv & run run_server.py on port 7000
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$rootDir\ai-backend'; Write-Host '=== AI BACKEND ===' -ForegroundColor Yellow; .\.venv\Scripts\Activate.ps1; Start-Sleep -Seconds 2; python ./run_server.py 7000"

Write-Host "All services started!" -ForegroundColor Magenta
