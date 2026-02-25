# Implementación del RAG Service paso a paso

Explicación completa de cómo se implementó la solución GenAI del RAG: tecnologías, frameworks, modelos y despliegue.

---

## 1. Objetivo de la solución

**Qué hace:** Un microservicio que responde preguntas sobre **nutrición y entrenamiento** usando documentos PDF como fuente de verdad (RAG). Soporta **historial de conversación** para preguntas de seguimiento.

**Flujo general:** Usuario envía mensaje → se buscan fragmentos relevantes en los PDFs → se arma un prompt con ese contexto + historial → un LLM genera la respuesta → se devuelve texto al usuario.

---

## 2. Tecnologías, frameworks y modelos usados

### Resumen en una tabla

| Categoría | Tecnología | Versión / detalle | Uso en el RAG |
|-----------|------------|-------------------|----------------|
| **Lenguaje** | Python | 3.10+ (Docker: 3.11) | Todo el servicio |
| **Framework web** | FastAPI | ≥ 0.109.0 | API HTTP, rutas, CORS |
| **Servidor ASGI** | Uvicorn | ≥ 0.27.0 | Ejecutar la app FastAPI |
| **Validación de datos** | Pydantic | ≥ 2.0.0 | Modelos `ChatRequest`, `ChatResponse`, `ChatMessage` |
| **Orquestación RAG** | LlamaIndex | (llama-index) | Índice, embeddings, retrieval, chat engine |
| **LLM (generación de texto)** | Groq (Llama 3.1) | llama-3.1-8b-instant | Generar la respuesta final |
| **Embeddings (vectorización)** | Hugging Face | BAAI/bge-small-en-v1.5 | Convertir texto a vectores para búsqueda semántica |
| **Lectura de documentos** | LlamaIndex + pypdf | SimpleDirectoryReader, pypdf ≥ 4.0.0 | Cargar y trocear PDFs |
| **Variables de entorno** | python-dotenv | ≥ 1.0.0 | Cargar `.env` (GROQ_API_KEY, rutas) |
| **Contenedorización** | Docker | Dockerfile | Imagen para despliegue (HF Spaces, etc.) |

### Dónde está cada cosa en el código

- **FastAPI + Pydantic + Uvicorn:** `main.py` (app, modelos, rutas).
- **LlamaIndex + Groq + Hugging Face + pypdf:** `ai_engine.py` (motor RAG).
- **Dependencias exactas:** `requirements.txt`.

---

## 3. Paso a paso de la implementación

### Paso 1: Estructura del proyecto y dependencias

**Estructura de carpetas:**

```
rag-service/
├── ai_engine.py      # Motor RAG (índice, embeddings, LLM, chat)
├── main.py           # API FastAPI
├── requirements.txt  # Dependencias
├── Dockerfile        # Imagen Docker
├── data_source/      # Aquí se colocan los PDFs
└── storage/          # Índice persistido (se crea al indexar)
```

**Dependencias (`requirements.txt`):**

- **Core API:** `fastapi`, `uvicorn`, `python-dotenv`, `pydantic`
- **LlamaIndex:** `llama-index`, `llama-index-core`, `llama-index-llms-groq`, `llama-index-embeddings-huggingface`, `llama-index-readers-file`
- **PDF:** `pypdf` (usado por SimpleDirectoryReader para leer PDFs)

---

### Paso 2: Configuración y variables de entorno

**Archivo:** Se usa `.env` (y opcionalmente `.env.example` como plantilla).

**Variables que usa el servicio:**

| Variable | Obligatoria | Uso |
|----------|-------------|-----|
| `GROQ_API_KEY` | Sí (para generación) | API key de Groq para llamar al LLM Llama 3.1 |
| `RAG_DATA_SOURCE` | No (default: `data_source`) | Carpeta donde están los PDFs |
| `RAG_STORAGE` | No (default: `storage`) | Carpeta donde se persiste el índice vectorial |

**En código:** En `ai_engine.py` se hace `load_dotenv()` y se leen con `os.getenv()`. Las rutas se crean con `Path()` y se asegura que existan las carpetas (`DATA_SOURCE_DIR.mkdir(...)`, `STORAGE_DIR.mkdir(...)`).

---

### Paso 3: Definición del LLM (motor de generación)

**Archivo:** `ai_engine.py`, función `_get_llm()`.

**Qué se hizo:**

1. Obtener `GROQ_API_KEY` del entorno; si falta, lanzar `ValueError`.
2. Importar el cliente de Groq de LlamaIndex: `from llama_index.llms.groq import Groq` (o fallback `llama_index_llms_groq`).
3. Instanciar el LLM con:
   - **Modelo:** `llama-3.1-8b-instant` (rápido, tipo “Flash”).
   - **API key:** la de Groq.
   - **Temperature:** `0.2` (respuestas más determinísticas, menos inventiva).

**Tecnología:** **Groq** como proveedor del LLM; **Llama 3.1 8B Instant** como modelo. No se usa Vertex AI ni otros proveedores en este servicio.

---

### Paso 4: Modelo de embeddings (vectorización)

**Archivo:** `ai_engine.py`, función `_get_embed_model()`.

**Qué se hizo:**

1. Usar el integrador de Hugging Face de LlamaIndex: `HuggingFaceEmbedding`.
2. Configurar el modelo **BAAI/bge-small-en-v1.5** (embedding en inglés, pequeño, corre localmente).
3. Activar `trust_remote_code=True` si el modelo lo requiere.

**Tecnología:** **Hugging Face** (modelo BGE). No se usa API de embeddings de pago; todo corre en el servidor donde se ejecuta el RAG.

**Uso:** Ese modelo convierte cada fragmento de documento (y luego la pregunta del usuario) en un vector numérico para búsqueda por similitud en el índice.

---

### Paso 5: Carga de documentos (origen de datos)

**Archivo:** `ai_engine.py`, función `_load_documents()`.

**Qué se hizo:**

1. Comprobar que exista la carpeta `DATA_SOURCE_DIR` y que haya al menos un `.pdf` dentro (incluyendo subcarpetas).
2. Usar **SimpleDirectoryReader** de LlamaIndex con:
   - `input_dir` = ruta de `data_source`,
   - `required_exts=[".pdf"]`,
   - `recursive=True`.
3. Llamar a `reader.load_data()` para obtener una lista de **Document** (cada PDF o cada trozo que LlamaIndex extrae).
4. Si hay error al leer (o no hay PDFs), devolver lista vacía; más adelante se usará un documento “dummy” para que el índice exista.

**Tecnología:** **LlamaIndex** (`SimpleDirectoryReader`) + **pypdf** (lectura real del PDF). El “chunking” (troceo en fragmentos más pequeños) lo hace LlamaIndex internamente al construir el índice en el siguiente paso.

---

### Paso 6: Construcción y persistencia del índice (ingesta RAG)

**Archivo:** `ai_engine.py`, función `get_or_create_index()`.

**Qué se hizo:**

1. **Configurar LlamaIndex:** Asignar en `Settings` el LLM y el modelo de embeddings (`Settings.llm`, `Settings.embed_model`) para que todo el flujo use los mismos.
2. **Intentar cargar índice ya existente:** Si existe `storage/docstore.json`, crear `StorageContext.from_defaults(persist_dir=storage)` y llamar a `load_index_from_storage(storage_context)`. Así no se re-indexa en cada reinicio.
3. **Si no hay índice persistido:**
   - Llamar a `_load_documents()`.
   - Si no hay documentos, crear un **documento dummy** con texto que define el rol del asistente (nutrición y entrenamiento, respuestas útiles y basadas en conocimiento científico). Así el índice siempre existe y el LLM tiene al menos una “instrucción” de sistema.
   - Construir el índice con `VectorStoreIndex.from_documents(documents, embed_model=embed_model)`. Aquí LlamaIndex:
     - Trocea los documentos (chunking),
     - Pasa cada chunk por el modelo de embeddings (vectorización),
     - Guarda los vectores en un vector store en memoria.
   - Persistir ese índice en disco con `index.storage_context.persist(persist_dir=storage)`.
4. Devolver el índice (ya sea cargado o recién creado).

**Tecnologías:**

- **Segmentación (chunking):** implícita en LlamaIndex al hacer `from_documents`.
- **Vectorización:** el `embed_model` (Hugging Face BGE) definido antes.
- **Almacenamiento:** VectorStoreIndex + StorageContext de LlamaIndex; archivos en `storage/` (docstore, vector store, etc.).

---

### Paso 7: Memoria de conversación (historial)

**Archivo:** `ai_engine.py`, función `_build_memory_from_history()`.

**Qué se hizo:**

1. Crear un `ChatMemoryBuffer` vacío (LlamaIndex).
2. Recorrer la lista `chat_history` (formato `[{"role": "user"|"assistant", "content": "..."}]`).
3. Por cada mensaje, crear un `ChatMessage` de LlamaIndex con `MessageRole.USER` o `MessageRole.ASSISTANT` y el contenido, e insertarlo en el buffer con `memory.put(...)`.
4. Devolver ese buffer para pasarlo al chat engine.

**Uso:** El frontend envía en cada request el historial de la conversación; el backend no guarda sesiones. Con este buffer, el chat engine puede “condensar” el historial y la pregunta actual para recuperar contexto relevante y generar una respuesta coherente.

---

### Paso 8: Chat RAG (recuperación + generación)

**Archivo:** `ai_engine.py`, función `chat()`.

**Qué se hizo:**

1. Obtener el índice (o crearlo) con `get_or_create_index()`.
2. Construir la memoria con `_build_memory_from_history(chat_history)`.
3. Crear el **chat engine** con `index.as_chat_engine(chat_mode="condense_plus_context", memory=memory, verbose=False)`.
   - **condense_plus_context:** LlamaIndex resume el historial + la pregunta actual en una “pregunta standalone”, busca los fragmentos más relevantes en el índice (retrieval) y arma el prompt que verá el LLM (contexto + pregunta).
4. Llamar `chat_engine.chat(message)` y devolver la respuesta como string.

**Flujo interno (simplificado):**

- La pregunta (y el historial) se usan para formar una consulta.
- Esa consulta se vectoriza con el mismo modelo de embeddings.
- Se hace **búsqueda por similitud** en el índice (retrieval).
- Los chunks recuperados + historial condensado + pregunta se ensamblan en un prompt.
- Ese prompt se envía al **LLM (Groq/Llama 3.1)**, que genera la respuesta.

**Tecnologías:** LlamaIndex (chat engine, retrieval, construcción de prompt) + Groq (generación). No se usa LangChain; el orquestador es LlamaIndex.

---

### Paso 9: API HTTP con FastAPI

**Archivo:** `main.py`.

**Qué se hizo:**

1. **Crear la app FastAPI** con título, descripción y versión (y CORS para el frontend local y Vercel).
2. **Modelos Pydantic:**
   - `ChatMessage`: `role`, `content`.
   - `ChatRequest`: `message` (obligatorio), `chat_history` (lista opcional de `ChatMessage`).
   - `ChatResponse`: `response` (texto de la respuesta).
3. **Rutas:**
   - **GET /** → JSON con nombre del servicio, enlaces a `/docs`, `/health` y `POST /chat`.
   - **GET /health** → `{"status": "ok"}`.
   - **POST /chat** (body: `ChatRequest`, response: `ChatResponse`):
     - Validar que `message` no esté vacío; si lo está, devolver 400.
     - Convertir `body.chat_history` a lista de dicts.
     - Llamar `rag_chat(message=..., chat_history=...)` (que es `chat()` de `ai_engine`).
     - Capturar `ValueError` y otras excepciones y devolver 500 con mensaje claro.
     - Devolver `ChatResponse(response=response_text)`.

**Tecnologías:** **FastAPI** (rutas, CORS, excepciones HTTP) y **Pydantic** (validación del body y del response). El servidor que ejecuta la app es **Uvicorn** (comando en Docker y en instrucciones de desarrollo).

---

### Paso 10: Ejecución en desarrollo local

**Comando típico:**

```bash
cd rag-service
pip install -r requirements.txt
# Configurar .env con GROQ_API_KEY
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

O usando los scripts del repo: `start_rag.ps1` / `start_rag.bat`, que arrancan Uvicorn en el puerto 8001.

**Primera ejecución:** Si hay PDFs en `data_source/`, se indexan y se persiste el índice en `storage/`. Si no hay PDFs, se usa el documento dummy y el asistente responde con conocimiento general.

---

## 4. Despliegue

### Opción A: Docker local

**Archivo:** `Dockerfile` (en `rag-service/`).

**Qué hace el Dockerfile:**

1. Imagen base: `python:3.11-slim`.
2. Instalar dependencias de sistema mínimas (p. ej. `build-essential` para compilar paquetes Python si hace falta).
3. Crear usuario no root (UID 1000) para Hugging Face Spaces.
4. Copiar `requirements.txt` e instalar dependencias con `pip install --user -r requirements.txt`.
5. Copiar `ai_engine.py` y `main.py`.
6. Crear carpetas `data_source` y `storage` y definir variables `RAG_DATA_SOURCE` y `RAG_STORAGE`.
7. Puerto por defecto: `7860` (HF Spaces); comando: `uvicorn main:app --host 0.0.0.0 --port ${PORT:-7860}`.

**Comandos:**

```bash
# Construir
docker build -t rag-service .

# Ejecutar (con API key y volúmenes para PDFs e índice)
docker run -p 8001:7860 \
  -v $(pwd)/data_source:/home/user/app/data_source \
  -v $(pwd)/storage:/home/user/app/storage \
  -e GROQ_API_KEY=tu-api-key \
  rag-service
```

En Windows (PowerShell) los volúmenes se pueden montar con rutas absolutas.

---

### Opción B: Hugging Face Spaces (Docker SDK)

**Documentación:** `DEPLOY_HUGGINGFACE.md`.

**Resumen:**

1. Crear un Space en Hugging Face con SDK **Docker** (no Gradio ni Streamlit).
2. Subir a la raíz del Space: `Dockerfile`, `main.py`, `ai_engine.py`, `requirements.txt` (y opcionalmente `README.md`).
3. En **Settings → Variables and secrets** del Space, añadir el secreto **GROQ_API_KEY**.
4. HF construye la imagen con el Dockerfile y ejecuta el CMD (Uvicorn en puerto 7860).
5. La URL del servicio será algo como: `https://TU_USUARIO-rag-nutricion-entrenamiento.hf.space`.
6. En el frontend (p. ej. en Vercel) configurar `VITE_RAG_API_URL` con esa URL para que las llamadas a `POST /chat` vayan al Space.

**Nota:** En Spaces normalmente no se montan volúmenes con PDFs propios; si no hay PDFs en la imagen, el servicio usará el documento dummy y responderá con conocimiento general del LLM. Para tener PDFs en HF habría que incluirlos en la imagen o usar un mecanismo de carga externo (no descrito en el repo actual).

---

### Opción C: Otro hosting (VPS, cloud)

Mismo Dockerfile: construir la imagen y ejecutarla en cualquier entorno que soporte Docker, exponiendo el puerto correspondiente y configurando `GROQ_API_KEY`, y opcionalmente montando `data_source` y `storage` si se quieren PDFs e índice persistente entre reinicios.

---

## 5. Resumen: tecnologías y archivos por capa

| Capa | Tecnología | Archivo(s) |
|------|------------|------------|
| **API** | FastAPI, Pydantic, Uvicorn | `main.py` |
| **Orquestación RAG** | LlamaIndex (índice, chat engine, memoria) | `ai_engine.py` |
| **LLM** | Groq (Llama 3.1 8B Instant) | `ai_engine.py` → `_get_llm()` |
| **Embeddings** | Hugging Face (BAAI/bge-small-en-v1.5) | `ai_engine.py` → `_get_embed_model()` |
| **Documentos** | SimpleDirectoryReader + pypdf | `ai_engine.py` → `_load_documents()` |
| **Persistencia** | LlamaIndex StorageContext → `storage/` | `ai_engine.py` → `get_or_create_index()` |
| **Despliegue** | Docker (HF Spaces o local) | `Dockerfile`, `DEPLOY_HUGGINGFACE.md` |

Con esto tienes el recorrido completo: desde dependencias y configuración hasta el flujo RAG (ingesta → retrieval → generación), la API y el despliegue del RAG service.
