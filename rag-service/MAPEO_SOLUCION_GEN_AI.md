# Mapeo: conceptos Gen AI → código del proyecto

Este documento enlaza cada concepto que aprendiste (ejemplo Ualá / Vertex / RAG / FastAPI) con **dónde está implementado** en este repo: archivo y líneas.

---

## 1. DEFINICIÓN DEL MOTOR (qué modelo usar)

| Concepto | Dónde está en el proyecto |
|----------|---------------------------|
| **Elección del modelo** (latencia vs razonamiento) | El proyecto usa un modelo “Flash-style”: **Groq con Llama 3.1 8B Instant** → rápido y económico, adecuado para consultas tipo asistente. |
| **Configuración del LLM** (modelo, API key, temperatura) | **`ai_engine.py`** líneas **26–48**: función `_get_llm()`. Ahí se define `model="llama-3.1-8b-instant"`, `temperature=0.2` y el uso de `GROQ_API_KEY`. |
| **Context window / cuánto puede leer el modelo** | Lo define el proveedor (Groq/Llama). En el código no se configura explícitamente; el límite lo pone el servicio Groq. |
| **Privacidad / datos no usados para entrenar** | En el ejemplo usabas **Vertex AI (GCP)** para que los datos no entrenen modelos globales. **Este proyecto usa Groq** (API externa). La privacidad depende de los términos de Groq; no hay Vertex AI en el código. |

**Resumen:** Motor = Groq + Llama 3.1 8B. Todo en **`ai_engine.py`** → **26–48**.

---

## 2. VERTEX AI (plataforma Google)

| Concepto | En este proyecto |
|----------|-------------------|
| **Model Garden / Generative AI Studio / Endpoints** | **No se usa Vertex AI.** El proyecto usa **Groq** como endpoint del LLM y **Hugging Face** para embeddings. El equivalente a “elegir modelo y endpoint” está en las funciones que obtienen el LLM y el modelo de embeddings. |
| **Dónde se “elige” el modelo y el endpoint** | **`ai_engine.py`**: `_get_llm()` (26–48) → Groq; `_get_embed_model()` (50–61) → Hugging Face. |

---

## 3. RAG – INGESTA (preparación)

| Concepto | Archivo y líneas |
|----------|------------------|
| **Segmentación (chunking)** | Lo hace **LlamaIndex** al cargar documentos. No hay chunking manual en el repo: `SimpleDirectoryReader` + `VectorStoreIndex.from_documents()` se encargan. Ver **`ai_engine.py`** **64–87** (`_load_documents`) y **125** (`from_documents`). La lógica de “trozos” está dentro de LlamaIndex. |
| **Carga de documentos (origen estático)** | **`ai_engine.py`** **64–87**: `_load_documents()`. Usa **`SimpleDirectoryReader`** (78–83) con `input_dir=data_source`, `required_exts=[".pdf"]`. |
| **Vectorización (embeddings)** | **`ai_engine.py`** **50–61**: `_get_embed_model()` → **HuggingFaceEmbedding** con `BAAI/bge-small-en-v1.5`. Esos embeddings se usan al construir el índice en **96–99** (`Settings.embed_model`) y **125** (`from_documents(..., embed_model=embed_model)`). |
| **Indexación (guardar vectores)** | **`ai_engine.py`** **90–128**: `get_or_create_index()`. **VectorStoreIndex** (125), **StorageContext** (104–106), **persist** en `storage/` (126). Carga del índice ya persistido: **102–108** (`load_index_from_storage`). |

**Resumen ingesta:**  
Documentos → **64–87**.  
Embeddings → **50–61** y **96–99, 125**.  
Índice y persistencia → **90–128** (sobre todo **102–108** y **125–126**).

---

## 4. RAG – EJECUCIÓN (recuperación y generación)

| Concepto | Archivo y líneas |
|----------|------------------|
| **Recuperación semántica (Retrieval)** | La pregunta se vectoriza y se buscan fragmentos cercanos en el índice. Lo hace el **chat engine** de LlamaIndex. Donde se arma ese flujo: **`ai_engine.py`** **150–168** → `chat()`: se obtiene el `index` (158), se crea el `chat_engine` (162–165) y se llama `chat_engine.chat(message)` (166). La búsqueda por similitud ocurre dentro de `index.as_chat_engine(..., chat_mode="condense_plus_context")`. |
| **Recuperación de datos estructurados (SQL/NoSQL)** | **No está en el proyecto.** El ejemplo Ualá consulta SQL para motivos reales del rechazo; aquí solo hay búsqueda sobre documentos (vector store). Para añadir algo similar habría que agregar una capa que consulte BD y inyecte esos datos en el contexto/prompt. |

**Resumen ejecución:**  
Retrieval + generación orquestados en **`ai_engine.py`** **150–168** (función `chat()`).

---

## 5. ORQUESTACIÓN Y CONSTRUCCIÓN DEL PROMPT

En el ejemplo usabas **LangChain** (plantillas, variables, formato, instrucciones de sistema, LCEL). Aquí el orquestador es **LlamaIndex**.

| Concepto (LangChain) | Equivalente en el proyecto (LlamaIndex) |
|----------------------|----------------------------------------|
| **Gestión de variables / plantilla con huecos** | El **chat engine** con `chat_mode="condense_plus_context"` arma internamente el prompt: condensa historial + inyecta contexto recuperado + pregunta. No hay plantilla explícita en código; la lógica está en LlamaIndex. Ver **`ai_engine.py`** **162–165**. |
| **Normalización de formatos** | Los datos que recibe el LLM son texto (fragmentos del índice + historial). La “normalización” es la que hace el chat engine al pasar contexto e historial al modelo. Mismo bloque **162–166**. |
| **Instrucciones de sistema / personalidad** | Cuando no hay PDFs se usa un **documento dummy** con el rol del asistente: **`ai_engine.py`** **117–124** (`Document(text="Eres un asistente experto en nutrición...")`). No hay system prompt aparte en el flujo de chat. |
| **Control de flujo (orden: recibir → formatear → modelo → salida)** | Flujo en **`ai_engine.py`** **150–168**: `get_or_create_index()` → `_build_memory_from_history()` → `as_chat_engine(...)` → `chat_engine.chat(message)` → `str(response)`. El orden y el manejo de errores de modelo no están orquestados con reintentos en el código; eso quedaría por capa (FastAPI o lógica superior). |

**Resumen orquestación:**  
Todo en **`ai_engine.py`**: **117–124** (rol del asistente), **131–147** (memoria/historial), **150–168** (flujo de chat y construcción implícita del prompt).

---

## 6. EXPOSICIÓN VÍA API (FastAPI)

| Concepto | Archivo y líneas |
|----------|------------------|
| **Framework rápido + tipado + asincronía** | **`main.py`**: app FastAPI (16–23), uso de **Pydantic** (36–53). El endpoint de chat hoy es **síncrono** (`def post_chat`); no hay `async def` en la ruta de chat. |
| **Definición del endpoint (POST, ruta, cuerpo)** | **`main.py`** **71–76**: `@app.post("/chat", response_model=ChatResponse)` y función `post_chat(body: ChatRequest)`. El cuerpo lleva `message` y `chat_history`. |
| **Validación con Pydantic** | **`main.py`** **36–49**: modelos **`ChatMessage`**, **`ChatRequest`**, **`ChatResponse`**. FastAPI valida automáticamente el body contra `ChatRequest`; si algo no cumple tipo o requisitos, responde con error antes de llamar a la lógica. |
| **Recibir request → lógica → respuesta JSON** | **`main.py`** **72–91**: se valida `body.message` (77–78), se convierte `chat_history` (80–82), se llama `rag_chat(...)` (85) y se devuelve **`ChatResponse(response=response_text)`** (91). |
| **Streaming (SSE, palabra por palabra)** | **No implementado.** La respuesta es un único JSON con el texto completo. Para streaming habría que cambiar a `StreamingResponse` con SSE y que `ai_engine` exponga un generador de tokens. |

**Resumen API:**  
App y CORS → **`main.py`** **16–33**.  
Modelos Pydantic → **36–53**.  
Rutas GET → **56–68**.  
Endpoint POST /chat (definición, validación, llamada al motor, respuesta) → **71–91**.

---

## 7. Flujo completo (request → response)

Ejemplo conceptual que mencionaste:

- **Request:** `{"user_id": 123, "pregunta": "¿Por qué me rechazaron?"}`  
- **En este proyecto:** el cuerpo es **`{"message": "...", "chat_history": [...]}`** (sin `user_id` ni campo `pregunta`).

Recorrido en código:

1. **Request entra** → **`main.py`** **71** (`post_chat(body: ChatRequest)`).
2. **Validación** → FastAPI + Pydantic con **`ChatRequest`** (**42–49**); mensaje vacío → **77–78**.
3. **Lógica** → **85**: `rag_chat(message=..., chat_history=...)` → salta a **`ai_engine.py`** **150–168**.
4. **Dentro de `chat()`:** índice (158), memoria (159), chat engine (162–165), **chat_engine.chat(message)** (166) → retrieval + prompt + llamada a Groq.
5. **Response** → **`main.py`** **91**: `ChatResponse(response=response_text)` → JSON `{"response": "..."}`.

---

## Tabla rápida: “quiero ver X en el código”

| Quiero ver… | Archivo | Líneas (aprox.) |
|-------------|---------|------------------|
| Qué modelo LLM se usa y cómo se configura | `ai_engine.py` | 26–48 |
| Cómo se vectoriza (embeddings) | `ai_engine.py` | 50–61, 96–99, 125 |
| Cómo se cargan los PDFs | `ai_engine.py` | 64–87 |
| Cómo se construye y persiste el índice | `ai_engine.py` | 90–128 |
| Cómo se arma el historial (memory) | `ai_engine.py` | 131–147 |
| Dónde ocurre retrieval + generación (RAG) | `ai_engine.py` | 150–168 |
| Definición del endpoint POST /chat | `main.py` | 71–76 |
| Validación del body (Pydantic) | `main.py` | 36–49, 77–78 |
| Dónde se llama al motor y se devuelve JSON | `main.py` | 80–91 |

Con esto puedes ir archivo por archivo y línea por línea y ver cómo cada paso de tu documento se refleja (o no) en este proyecto.
