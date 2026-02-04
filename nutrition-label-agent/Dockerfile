# Nutrition Label Agent: FastAPI + LangGraph
# Optimizado para Hugging Face Spaces (puerto 7860, usuario UID 1000)
# También compatible con Railway/Render (usa PORT desde variables de entorno)

FROM python:3.11-slim

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Usuario UID 1000 (requerido por Hugging Face Spaces)
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user PATH=/home/user/.local/bin:$PATH
WORKDIR $HOME/app

RUN pip install --no-cache-dir --upgrade pip

# 1) Instalación de dependencias Python (capa cacheable)
COPY --chown=user:user requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# 2) Copia del código de la aplicación
COPY --chown=user:user main.py .
COPY --chown=user:user graph.py .
COPY --chown=user:user nodes.py .
COPY --chown=user:user models.py .

# Puerto (7860 para HF Spaces, 8002 por defecto, o PORT desde variables de entorno)
ENV PORT=7860
EXPOSE 7860

# Comando para ejecutar la aplicación (usa PORT si está disponible)
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-7860}"]
