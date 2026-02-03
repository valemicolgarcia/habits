# Tutorial simplificado: cómo implementar un RAG en tu proyecto

Pasos seguidos en este proyecto para tener un RAG con LlamaIndex, FastAPI, Groq y embeddings de Hugging Face. Puedes adaptarlos a tu propio proyecto.

---

## 1. Estructura de carpetas

Crea (o usa) estas carpetas en la raíz del proyecto:

```
tu-proyecto/
├── data_source/     # Aquí van los PDFs (o documentos) a indexar
├── storage/         # Se crea solo; aquí se persiste el índice vectorial
├── ai_engine.py     # Motor RAG (índice, embeddings, LLM, chat)
├── main.py          # Servidor FastAPI que expone POST /chat
├── requirements.txt
├── .env.example
└── .env             # No subir a Git; copia de .env.example con tus claves
```

- **data_source**: el usuario (o tú) pone aquí los PDFs. El servicio los indexa automáticamente.
- **storage**: lo usa LlamaIndex para guardar el índice; si lo borras, se re-indexa al siguiente arranque.

---

## 2. Dependencias (`requirements.txt`)

Incluye al menos:

```
fastapi>=0.109.0
uvicorn[standard]>=0.27.0
python-dotenv>=1.0.0
pydantic>=2.0.0

llama-index
llama-index-core
llama-index-llms-groq
llama-index-embeddings-huggingface
llama-index-readers-file

pypdf>=4.0.0
```

- **FastAPI + Uvicorn**: API HTTP.
- **LlamaIndex**: índice, embeddings, LLM, chat engine.
- **llama-index-llms-groq**: LLM Groq (Llama 3.1).
- **llama-index-embeddings-huggingface**: embeddings locales (p. ej. BAAI/bge-small-en-v1.5).
- **pypdf**: para que SimpleDirectoryReader pueda leer PDFs.

Instalación:

```bash
pip install -r requirements.txt
```

---

## 3. Variables de entorno

Crea `.env.example` con lo que el usuario debe configurar:

```
GROQ_API_KEY=tu-groq-api-key
# RAG_DATA_SOURCE=data_source
# RAG_STORAGE=storage
```

Copia a `.env` y rellena `GROQ_API_KEY` (clave gratis en https://console.groq.com/keys).

En el código, carga `.env` al inicio del motor RAG (por ejemplo en `ai_engine.py`):

```python
from dotenv import load_dotenv
load_dotenv()
```

Y usa variables para rutas opcionales:

```python
import os
from pathlib import Path

DATA_SOURCE_DIR = Path(os.getenv("RAG_DATA_SOURCE", "data_source"))
STORAGE_DIR = Path(os.getenv("RAG_STORAGE", "storage"))
DATA_SOURCE_DIR.mkdir(parents=True, exist_ok=True)
STORAGE_DIR.mkdir(parents=True, exist_ok=True)
```

---

## 4. Motor RAG (`ai_engine.py`)

Implementa estas piezas en orden.

### 4.1 LLM (modelo que genera respuestas)

Función que devuelve el LLM configurado (aquí Groq con Llama 3.1):

```python
def _get_llm():
    from llama_index.llms.groq import Groq  # o from llama_index_llms_groq import Groq
    api_key = os.getenv("GROQ_API_KEY", "").strip()
    if not api_key:
        raise ValueError("GROQ_API_KEY no está configurada.")
    return Groq(model="llama-3.1-8b-instant", api_key=api_key, temperature=0.2)
```

### 4.2 Modelo de embeddings (vectorizar texto)

Función que devuelve el modelo de embeddings (Hugging Face local):

```python
def _get_embed_model():
    from llama_index.embeddings.huggingface import HuggingFaceEmbedding
    return HuggingFaceEmbedding(
        model_name="BAAI/bge-small-en-v1.5",
        trust_remote_code=True,
    )
```

### 4.3 Cargar documentos

Función que lee todos los PDFs de `data_source/`:

```python
def _load_documents():
    from llama_index.core import SimpleDirectoryReader
    if not DATA_SOURCE_DIR.exists():
        return []
    pdf_files = list(DATA_SOURCE_DIR.glob("**/*.pdf"))
    if not pdf_files:
        return []
    reader = SimpleDirectoryReader(
        input_dir=str(DATA_SOURCE_DIR),
        required_exts=[".pdf"],
        recursive=True,
    )
    return reader.load_data()
```

Si quieres, si no hay PDFs puedes crear un documento dummy con texto genérico para que el índice exista y el LLM responda con conocimiento general.

### 4.4 Crear o cargar el índice

- Si existe `storage/docstore.json`, cargar el índice desde `storage/`.
- Si no, cargar documentos, construir `VectorStoreIndex` con el modelo de embeddings, persistir en `storage/` y devolver el índice.

Configura `Settings.llm` y `Settings.embed_model` con `_get_llm()` y `_get_embed_model()` antes de crear/cargar el índice.

```python
from llama_index.core import VectorStoreIndex, StorageContext, load_index_from_storage, Settings

def get_or_create_index():
    Settings.llm = _get_llm()
    Settings.embed_model = _get_embed_model()
    if (STORAGE_DIR / "docstore.json").exists():
        try:
            storage_context = StorageContext.from_defaults(persist_dir=str(STORAGE_DIR))
            return load_index_from_storage(storage_context)
        except Exception:
            pass
    documents = _load_documents()
    if not documents:
        documents = [Document(text="Texto dummy o instrucciones generales...")]
    index = VectorStoreIndex.from_documents(documents, embed_model=Settings.embed_model)
    index.storage_context.persist(persist_dir=str(STORAGE_DIR))
    return index
```

### 4.5 Memoria de conversación (historial)

Función que convierte una lista de mensajes `[{"role": "user"|"assistant", "content": "..."}]` en un `ChatMemoryBuffer` de LlamaIndex:

```python
def _build_memory_from_history(chat_history: list[dict[str, str]]):
    from llama_index.core.memory import ChatMemoryBuffer
    from llama_index.core.llms import ChatMessage, MessageRole
    memory = ChatMemoryBuffer.from_defaults()
    for msg in (chat_history or []):
        role_str = (msg.get("role") or "user").lower()
        content = msg.get("content") or ""
        if not content:
            continue
        role = MessageRole.USER if role_str == "user" else MessageRole.ASSISTANT
        memory.put(ChatMessage(role=role, content=content))
    return memory
```

El frontend guarda el historial y lo envía en cada request; el backend no persiste sesiones.

### 4.6 Función de chat (entrada principal del RAG)

Función que recibe el mensaje actual y el historial, y devuelve la respuesta en texto:

```python
def chat(message: str, chat_history: list[dict[str, str]] | None = None) -> str:
    index = get_or_create_index()
    memory = _build_memory_from_history(chat_history or [])
    chat_engine = index.as_chat_engine(
        chat_mode="condense_plus_context",
        memory=memory,
        verbose=False,
    )
    response = chat_engine.chat(message)
    return str(response)
```

`condense_plus_context` resume el historial + pregunta en una pregunta standalone, busca contexto en el índice y genera la respuesta con el LLM.

---

## 5. API con FastAPI (`main.py`)

### 5.1 App y CORS

Crea la app y configura CORS con los orígenes de tu frontend (localhost, producción, etc.):

```python
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="RAG API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 5.2 Modelos Pydantic

Define el body del POST y la respuesta:

```python
from pydantic import BaseModel, Field

class ChatMessage(BaseModel):
    role: str   # "user" | "assistant"
    content: str

class ChatRequest(BaseModel):
    message: str
    chat_history: list[ChatMessage] | None = []

class ChatResponse(BaseModel):
    response: str
```

### 5.3 Endpoint POST /chat

Recibe `message` y `chat_history`, valida, llama al motor RAG y devuelve la respuesta:

```python
from ai_engine import chat as rag_chat

@app.post("/chat", response_model=ChatResponse)
def post_chat(body: ChatRequest):
    if not (body.message or "").strip():
        raise HTTPException(status_code=400, detail="El mensaje no puede estar vacío.")
    history = [{"role": m.role, "content": m.content} for m in (body.chat_history or [])]
    try:
        response_text = rag_chat(message=body.message.strip(), chat_history=history)
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    return ChatResponse(response=response_text)
```

Opcional: `GET /` y `GET /health` para comprobar que el servicio está vivo.

---

## 6. Ejecutar el servicio

1. Poner al menos un PDF en `data_source/` (o dejar que use documento dummy si lo implementaste).
2. Tener `.env` con `GROQ_API_KEY`.
3. Arrancar:

```bash
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

4. Probar desde el frontend o con curl:

```bash
curl -X POST http://localhost:8001/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "¿Cuántas proteínas necesito?", "chat_history": []}'
```

---

## Resumen del flujo

1. **Indexación (una vez)**: PDFs en `data_source/` → SimpleDirectoryReader → fragmentos → embeddings (Hugging Face) → VectorStoreIndex → persistir en `storage/`.
2. **Cada pregunta**: Frontend envía `message` + `chat_history` → backend construye memoria con `_build_memory_from_history` → chat engine (condense_plus_context) busca contexto en el índice → LLM (Groq) genera respuesta → backend devuelve `{ "response": "..." }`.
3. El historial lo guarda el frontend; el backend solo lo usa para esa petición.

Con estos pasos tienes el mismo esquema que este proyecto: RAG con LlamaIndex, Groq, embeddings de Hugging Face, índice persistido y chat con historial vía FastAPI.
