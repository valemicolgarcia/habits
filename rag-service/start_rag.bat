@echo off
echo ========================================
echo Iniciando Servicio RAG
echo ========================================
echo.

REM Verificar si existe .env
if not exist .env (
    echo ERROR: No se encontro el archivo .env
    echo Por favor copia .env.example a .env y configura tu API key
    echo.
    pause
    exit /b 1
)

REM Verificar si existe venv
if not exist venv (
    echo Creando entorno virtual...
    python -m venv venv
    echo.
    echo Instalando dependencias...
    call venv\Scripts\activate.bat
    pip install -r requirements.txt
) else (
    call venv\Scripts\activate.bat
)

echo.
echo Iniciando servidor en http://localhost:8001
echo Presiona CTRL+C para detener
echo.
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
