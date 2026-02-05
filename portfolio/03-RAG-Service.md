# RAG Service

**Hábitos** · Subproyecto: *LlamaIndex, Groq, Llama 3.1, Hugging Face Embeddings, FastAPI*

---

## ¿Para qué sirve?

Ofrece un **asistente de preguntas** dentro de la app **Hábitos** que responde sobre **nutrición y entrenamiento** usando **tus propios documentos** (por ejemplo PDFs): guías, artículos, recetas, etc.

El usuario escribe preguntas en lenguaje natural (ej. “¿Cuántas proteínas necesito al día?”, “¿Cómo mejorar la recuperación?”) y recibe respuestas **basadas en el contenido de esos PDFs**, no solo en el conocimiento interno del modelo. Además, el servicio mantiene **historial de conversación** para hacer preguntas de seguimiento en la misma sesión.

---

## ¿Cómo funciona?

1. En el **dashboard** de Hábitos hay una barra de chat: “Pregunta sobre nutrición y entrenamiento”. El usuario escribe un mensaje y envía.
2. El frontend llama al microservicio **RAG Service** con `POST /chat`, enviando el mensaje y el `chat_history` (mensajes anteriores de la conversación).
3. El backend usa **LlamaIndex** para:
   - **Índice:** Los PDFs en la carpeta `data_source` se leen con `SimpleDirectoryReader` (y **pypdf**); se dividen en chunks y se generan **embeddings** con un modelo de **Hugging Face** (ej. BGE) que corre localmente, sin API key. El índice se persiste en `storage` para no reindexar en cada reinicio.
   - **Retrieval:** Ante cada pregunta, se buscan los fragmentos más relevantes del índice (similitud por embeddings).
   - **Generación:** El contexto recuperado más el historial de chat se envían al **LLM** (Groq con **Llama 3.1**); el modelo genera la respuesta usando ese contexto (RAG = Retrieval-Augmented Generation).
4. La respuesta se devuelve al frontend en JSON (`response`); el frontend actualiza el historial y muestra el mensaje del asistente. Así las respuestas están ancladas a los documentos que tú subes, no solo al conocimiento base del modelo.

---

## Cómo está implementado

- **API:** **FastAPI** con endpoint `POST /chat`: body con `message` y opcionalmente `chat_history` (lista de `role` + `content`). Los modelos de request/response se validan con **Pydantic** (`ChatRequest`, `ChatResponse`, `ChatMessage`). **Uvicorn** como servidor ASGI; **python-dotenv** para variables de entorno.
- **RAG con LlamaIndex:** Se usa **LlamaIndex** (y paquetes como `llama-index-core`, `llama-index-readers-file`) para: leer PDFs, construir el índice vectorial, exponer un **chat engine** con memoria. El **retriever** devuelve los chunks más relevantes; el **chat engine** une contexto + historial y llama al LLM.
- **LLM:** **Groq** con modelo **Llama 3.1** (paquete `llama-index-llms-groq`): respuestas rápidas y sin coste de OpenAI/Anthropic para el usuario final.
- **Embeddings:** Modelo de **Hugging Face** (ej. `BAAI/bge-small-en-v1.5`) vía `llama-index-embeddings-huggingface`, ejecutado localmente en el servidor del RAG; no se usa API de embeddings externa.
- **PDFs:** Lectura con **pypdf** y el reader de LlamaIndex; la ruta de `data_source` y de `storage` es configurable por entorno.
- **Despliegue:** Microservicio Python independiente (Docker); requiere `GROQ_API_KEY`. El frontend usa `VITE_RAG_API_URL` para conectar con este servicio.

En conjunto: **LlamaIndex** orquesta el RAG (índice, retrieval, chat engine), **Groq** y **Llama 3.1** generan las respuestas, **Hugging Face Embeddings** construyen el índice de forma local, y **FastAPI** + **Pydantic** exponen la API para **Hábitos**.
