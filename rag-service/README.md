# RAG Service: Nutrición y Entrenamiento

Microservicio FastAPI con LlamaIndex para consultas técnicas sobre nutrición y entrenamiento basadas en documentos PDF.

## Características

- **RAG (Retrieval-Augmented Generation)**: Responde preguntas usando documentos PDF como contexto
- **Persistencia**: El índice se guarda en `./storage` para evitar re-indexar en cada reinicio
- **Historial de conversación**: Soporta preguntas de seguimiento gracias al chat_history
- **Modelos gratuitos**: Usa Groq (Llama 3.1) o Gemini (vía API key) - costo $0
- **Auto-indexación**: Lee automáticamente todos los PDFs de `./data_source`

## Requisitos

- Python 3.10+
- API key de Groq o Gemini (gratis)

## Instalación

1. **Clonar y entrar al directorio**:
   ```bash
   cd rag-service
   ```

2. **Instalar dependencias**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configurar variables de entorno**:
   ```bash
   cp .env.example .env
   # Editar .env y agregar tu GROQ_API_KEY o GEMINI_API_KEY
   ```

4. **Agregar PDFs**:
   Coloca tus documentos PDF sobre nutrición y entrenamiento en `./data_source/`

## Uso

### Desarrollo local

```bash
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

### Con Docker

```bash
# Construir imagen
docker build -t rag-service .

# Ejecutar (montar data_source y storage como volúmenes)
docker run -p 8001:8000 \
  -v $(pwd)/data_source:/app/data_source \
  -v $(pwd)/storage:/app/storage \
  -e GROQ_API_KEY=tu-api-key \
  rag-service
```

## API

### POST /chat

Envía un mensaje y recibe respuesta basada en los documentos RAG.

**Request**:
```json
{
  "message": "¿Cuántas proteínas necesito al día?",
  "chat_history": [
    {"role": "user", "content": "Hola"},
    {"role": "assistant", "content": "Hola, ¿en qué puedo ayudarte?"}
  ]
}
```

**Response**:
```json
{
  "response": "Según los documentos, la recomendación general es..."
}
```

### GET /health

Verifica el estado del servicio.

## Variables de entorno

- `GROQ_API_KEY`: API key de Groq (https://console.groq.com/keys)
- `GEMINI_API_KEY`: API key de Gemini (https://aistudio.google.com/apikey)
- `LLM_PROVIDER`: `"groq"` o `"gemini"` (opcional; por defecto usa Groq si hay GROQ_API_KEY)
- `RAG_DATA_SOURCE`: Ruta a la carpeta de PDFs (default: `data_source`)
- `RAG_STORAGE`: Ruta para persistir el índice (default: `storage`)

## Estructura

```
rag-service/
├── ai_engine.py      # Lógica RAG: índice, chat engine, memoria
├── main.py           # Servidor FastAPI
├── requirements.txt  # Dependencias Python
├── Dockerfile        # Imagen Docker optimizada
├── .env.example      # Ejemplo de configuración
├── data_source/      # PDFs a indexar (montar como volumen)
└── storage/          # Índice persistido (se genera automáticamente)
```

## Notas

- El índice se crea automáticamente la primera vez que se ejecuta el servicio
- Si agregas nuevos PDFs, elimina `storage/` para re-indexar
- El historial de conversación se envía desde el frontend; el backend no mantiene sesiones
- Los embeddings usan HuggingFace localmente (gratis, sin API key)
