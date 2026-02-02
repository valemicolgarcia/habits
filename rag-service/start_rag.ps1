# Script PowerShell para iniciar el servicio RAG

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Iniciando Servicio RAG" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar si existe .env
if (-not (Test-Path .env)) {
    Write-Host "ERROR: No se encontro el archivo .env" -ForegroundColor Red
    Write-Host "Por favor copia .env.example a .env y configura tu API key" -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Presiona Enter para salir"
    exit 1
}

# Verificar si existe venv
if (-not (Test-Path venv)) {
    Write-Host "Creando entorno virtual..." -ForegroundColor Yellow
    python -m venv venv
    Write-Host ""
    Write-Host "Instalando dependencias..." -ForegroundColor Yellow
    & .\venv\Scripts\Activate.ps1
    pip install -r requirements.txt
} else {
    & .\venv\Scripts\Activate.ps1
}

Write-Host ""
Write-Host "Iniciando servidor en http://localhost:8001" -ForegroundColor Green
Write-Host "Presiona CTRL+C para detener" -ForegroundColor Yellow
Write-Host ""
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
