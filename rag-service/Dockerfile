# RAG microservice: FastAPI + LlamaIndex
# Optimizado para Hugging Face Spaces (puerto 7860, usuario UID 1000)

FROM python:3.11-slim

# Instalar dependencias del sistema (lectura de PDF, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
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
COPY --chown=user:user ai_engine.py .
COPY --chown=user:user main.py .

# Carpetas para datos e índice
RUN mkdir -p $HOME/app/data_source $HOME/app/storage

ENV RAG_DATA_SOURCE=$HOME/app/data_source
ENV RAG_STORAGE=$HOME/app/storage

# Puerto 7860 (estándar de Hugging Face Spaces)
ENV PORT=7860
EXPOSE 7860

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-7860}"]
