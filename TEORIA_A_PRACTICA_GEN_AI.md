# Cómo se aplicó la teoría de Gen AI en este proyecto

Este documento enlaza **cada concepto que aprendiste** con los **pasos concretos, archivos y herramientas** usados en el repo (RAG, Nutrition Label Agent, detección de ingredientes).

---

## Resumen: tres soluciones basadas en IA

| Solución | Qué hace | Motor / modelo | Herramientas principales |
|----------|----------|----------------|--------------------------|
| **RAG Service** | Chat sobre nutrición y entrenamiento usando PDFs | LLM: Groq (Llama 3.1 8B) | LlamaIndex, Hugging Face Embeddings, FastAPI, Pydantic |
| **Nutrition Label Agent** | Analiza foto de etiqueta → NOVA + alternativas saludables | LLM multimodal: Gemini (vision + texto) | LangChain, LangGraph, Tavily, FastAPI, Pydantic |
| **Nutri AI Backend (detección)** | Detecta ingredientes visibles en foto de comida (zero-shot) | Vision-language: Grounding DINO | PyTorch, Transformers, FastAPI |

---

## 1. IA GENERATIVA VS IA TRADICIONAL

**Teoría:** GenAI crea contenido nuevo (texto, imágenes, etc.); la tradicional clasifica o predice.

**En el proyecto:**

- **RAG y Nutrition Label Agent:** son **generativos**: el LLM **genera** texto (respuestas, JSON, reportes) que no existía antes.
- **Detección de ingredientes:** es **híbrida**: el modelo (Grounding DINO) hace detección **zero-shot** guiada por texto (prompts como "egg", "tomato"); no genera imágenes, pero sí **genera** cajas y etiquetas sobre la imagen.

---

## 2. CÓMO APRENDE UNA GenAI (LLM, tokens, prompt)

**Teoría:** LLM = motor probabilístico; procesa tokens; input = prompt → output = generación.

**En el proyecto:**

| Concepto | Dónde se aplica |
|----------|------------------|
| **Tokens** | Lo maneja el proveedor (Groq, Google). En código: `temperature=0.2` (RAG) y `temperature=0.3` (Label Agent) para controlar aleatoriedad. No hay conteo explícito de tokens en el repo. |
| **Prompt** | **RAG:** LlamaIndex arma el prompt internamente (historial + contexto recuperado + pregunta). **Label Agent:** prompts explícitos en `nutrition-label-agent/nodes.py` (líneas 70–88 analyzer, 228–233 searcher). **Detección:** lista de prompts de texto (`INGREDIENTS_LIST`) que se pasan al modelo. |
| **Input → Output** | RAG: `message` + `chat_history` → `ChatResponse.response`. Label Agent: imagen base64 → `NutritionalResponse` (JSON). Detección: imagen → lista de ingredientes con cajas. |

**Archivos clave:**

- `rag-service/ai_engine.py`: `chat(message, chat_history)` → respuesta texto.
- `nutrition-label-agent/nodes.py`: `HumanMessage(content=[texto, imagen])` → `model.invoke([message])` → JSON.
- `nutri-ai-backend/main.py` + `detection/`: imagen + textos → cajas y labels.

---

## 3. CAJA NEGRA Y ALUCINACIONES → RAG

**Teoría:** Corte de conocimiento y alucinaciones se mitigan dando **datos reales** al modelo (RAG).

**En el proyecto:**

- **RAG Service** implementa **RAG completo**: en lugar de que el LLM “invente”, se le inyecta **contexto recuperado** de los PDFs en `data_source/`. Así la respuesta se basa en los documentos.
- Si no hay PDFs, se usa un **documento dummy** con el rol del asistente (`ai_engine.py` 117–124) para que al menos no diga cosas fuera de tema.

**Pasos implementados:**

1. **Ingesta (preparación)**  
   - **Segmentación (chunking):** LlamaIndex lo hace al crear el índice (`VectorStoreIndex.from_documents()`).  
   - **Vectorización (embeddings):** modelo **Hugging Face** `BAAI/bge-small-en-v1.5` en `_get_embed_model()` (`ai_engine.py` 50–61).  
   - **Indexación:** vectores guardados en `storage/` con `StorageContext` y `persist()` (`ai_engine.py` 90–128).

2. **Ejecución (cada pregunta)**  
   - **Recuperación semántica:** la pregunta se vectoriza y se buscan los fragmentos más cercanos en el índice (dentro de `index.as_chat_engine(..., chat_mode="condense_plus_context")` en `ai_engine.py` 162–166).  
   - **Generación:** el contexto recuperado + historial + pregunta se envían al LLM (Groq); la respuesta es la generación final.

**Recuperación de datos estructurados (SQL/NoSQL):** no está en el proyecto. Solo hay búsqueda sobre documentos (vector store). Para algo tipo Ualá habría que añadir una capa que consulte BD e inyecte esos datos en el contexto.

---

## 4. DEFINICIÓN DEL MOTOR (modelo, latencia, costos)

**Teoría:** Modelos Flash (rápidos/baratos) vs Pro (más razonamiento); context window; costos por token; privacidad.

**En el proyecto:**

| Concepto | Implementación |
|----------|-----------------|
| **Modelo tipo “Flash”** | RAG usa **Groq + Llama 3.1 8B Instant** → rápido y económico (`ai_engine.py` 44–48). |
| **Modelo con visión** | Label Agent usa **Gemini** (ej. `gemini-2.5-flash-lite`) con visión para analizar la imagen de la etiqueta (`nodes.py` 38–42). |
| **Configuración del LLM** | `_get_llm()` en `ai_engine.py` 26–48: `model`, `api_key`, `temperature`. Label Agent: `get_gemini_model()` en `nodes.py` 31–42. |
| **Context window** | Lo define el proveedor (Groq/Google). No se configura explícitamente en código. |
| **Vertex AI / privacidad** | No se usa Vertex AI. Se usa **Groq** (API externa) y **Google AI** (Gemini). La privacidad depende de los términos de cada proveedor. |

---

## 5. HERRAMIENTAS EQUIVALENTES A VERTEX AI

**Teoría:** Model Garden, Generative AI Studio, Endpoints.

**En el proyecto:**

- **No hay Vertex AI.** El “model garden” y el “endpoint” son las funciones que devuelven el LLM y el modelo de embeddings:
  - **LLM:** `rag-service/ai_engine.py` → `_get_llm()` (Groq), `nutrition-label-agent/nodes.py` → `get_gemini_model()` (Gemini).
  - **Embeddings:** `_get_embed_model()` → Hugging Face (`BAAI/bge-small-en-v1.5`).

---

## 6. RAG – INGESTA Y EJECUCIÓN (paso a paso)

### Ingesta (una vez, o al añadir PDFs)

| Paso | Herramienta / código | Archivo y líneas |
|------|----------------------|------------------|
| 1. Cargar documentos | `SimpleDirectoryReader` (LlamaIndex), solo `.pdf` en `data_source/` | `ai_engine.py` 64–87 `_load_documents()` |
| 2. Chunking | Implícito en LlamaIndex al crear el índice | `ai_engine.py` 125 `from_documents()` |
| 3. Vectorización | `HuggingFaceEmbedding` con `BAAI/bge-small-en-v1.5` | `ai_engine.py` 50–61, 96–99, 125 |
| 4. Indexación y persistencia | `VectorStoreIndex`, `StorageContext`, `persist(storage/)` | `ai_engine.py` 90–128 |

### Ejecución (cada pregunta del usuario)

| Paso | Qué hace el código | Archivo y líneas |
|------|--------------------|------------------|
| 1. Recibir mensaje e historial | FastAPI recibe `ChatRequest` (message + chat_history) | `main.py` 71–82 |
| 2. Construir memoria | `_build_memory_from_history(chat_history)` → `ChatMemoryBuffer` | `ai_engine.py` 131–147, 159 |
| 3. Retrieval | Chat engine vectoriza la pregunta y busca chunks similares en el índice | `ai_engine.py` 162–165 `as_chat_engine(..., condense_plus_context)` |
| 4. Construir prompt y llamar al LLM | LlamaIndex arma historial + contexto + pregunta y llama a Groq | `ai_engine.py` 166 `chat_engine.chat(message)` |
| 5. Respuesta | Se devuelve `ChatResponse(response=texto)` | `main.py` 85–91 |

---

## 7. ORQUESTACIÓN Y CONSTRUCCIÓN DEL PROMPT

**Teoría:** LangChain como ensamblador (variables, formato, instrucciones de sistema, control de flujo).

**En el proyecto hay dos orquestadores:**

### 7.1 RAG Service → **LlamaIndex** (no LangChain)

| Concepto | Cómo se hace |
|----------|---------------|
| Gestión de variables / plantilla | El chat engine con `condense_plus_context` arma el prompt internamente (historial + contexto + pregunta). No hay plantilla explícita en código. |
| Instrucciones de sistema | Si no hay PDFs: documento dummy con el rol del asistente (`ai_engine.py` 117–124). |
| Control de flujo | `get_or_create_index()` → `_build_memory_from_history()` → `as_chat_engine()` → `chat_engine.chat(message)` → `str(response)` (`ai_engine.py` 150–168). |

### 7.2 Nutrition Label Agent → **LangChain + LangGraph**

| Concepto | Cómo se hace |
|----------|---------------|
| Plantilla y variables | Prompts fijos en `nodes.py` (analyzer 70–88, searcher 228–233). El estado del grafo (`AgentState`) lleva `image_data`, `analysis`, `search_results`, `final_report`. |
| Normalización de formatos | El analyzer pide “SOLO JSON”; se hace parse y validación con `AnalysisResult` (Pydantic). |
| Instrucciones de sistema | Incluidas en el texto del prompt (NOVA 1–4, estructura JSON). |
| Control de flujo | **LangGraph:** `graph.py` define el grafo (analyzer → condicional → searcher o finalizer → finalizer → END). El orden y las ramas están explícitos. |

**Archivos:**

- RAG: `rag-service/ai_engine.py` (todo el flujo).
- Label Agent: `nutrition-label-agent/graph.py` (grafo), `nutrition-label-agent/nodes.py` (nodos que usan LangChain para Gemini y Tavily).

---

## 8. EXPOSICIÓN VÍA API (FastAPI)

**Teoría:** FastAPI = rápido, tipado (Pydantic), asincronía; endpoint POST; validación; opcionalmente streaming.

**En el proyecto:**

| Concepto | RAG Service | Nutrition Label Agent | Detección (nutri-ai-backend) |
|----------|-------------|------------------------|------------------------------|
| Framework | FastAPI | FastAPI | FastAPI |
| Definición del endpoint | `POST /chat` (`main.py` 71–76) | `POST /analyze-label` (imagen) | `POST /detect`, `POST /detect/image` |
| Validación Pydantic | `ChatRequest`, `ChatResponse`, `ChatMessage` (`main.py` 36–53) | `NutritionalResponse`, modelos en `models.py` | Modelos para request/response |
| Validación de entrada | Mensaje no vacío → 400 (`main.py` 77–78) | Content-Type y archivo (`main.py`) | Tipo de archivo y cuerpo |
| Asincronía | Endpoint síncrono `def post_chat` | `async def analyze_label` | Uso de `async` donde aplica |
| Respuesta | JSON `{"response": "..."}` | JSON con análisis NOVA + alternativas | JSON con ingredientes o imagen JPEG |
| Streaming (SSE) | No implementado | No implementado | No aplica |

**Resumen:** En los tres servicios, FastAPI recibe la petición, valida con Pydantic, ejecuta la lógica (motor RAG, grafo LangGraph, modelo de detección) y devuelve un JSON (o imagen en `/detect/image`).

---

## 9. FLUJO COMPLETO REQUEST → RESPONSE (ejemplo RAG)

Ejemplo conceptual que viste en teoría:

1. **Request:** app manda JSON (ej. `user_id`, `pregunta`).  
2. **Validación:** FastAPI + Pydantic.  
3. **Lógica:** se llama a la orquestación (LangChain/LlamaIndex, etc.).  
4. **Generación:** se envía el prompt al modelo.  
5. **Response:** JSON con la respuesta.

**En este proyecto (RAG):**

1. **Request:** `POST /chat` con body `{"message": "...", "chat_history": [...]}`.
2. **Validación:** FastAPI valida `ChatRequest`; si `message` está vacío → 400.
3. **Lógica:** `rag_chat(message, chat_history)` → `ai_engine.chat()` → índice + memoria + chat engine.
4. **Generación:** dentro del chat engine: retrieval → armado de prompt → llamada a Groq (Llama 3.1).
5. **Response:** `ChatResponse(response=response_text)` → JSON `{"response": "..."}`.

**Archivos:** `rag-service/main.py` 71–91, `rag-service/ai_engine.py` 150–168.

---

## 10. EVALUACIÓN Y OBSERVABILIDAD

**Teoría:** RAGAS (fidelidad, relevancia), LLM-as-a-judge, traces (LangSmith, Phoenix), logs en BigQuery, guardrails, token tracking.

**En el proyecto:**

- **RAGAS / LLM-as-a-judge:** no hay framework de evaluación de respuestas RAG implementado.
- **Traces (LangSmith, Phoenix):** no hay integración; no se ven pasos del RAG o del grafo en una herramienta de trazabilidad.
- **Logging en BigQuery:** no está implementado.
- **Guardrails (prompt injection, PII, alucinaciones):** no hay capa explícita de guardrails ni PII masking en el código.
- **Token tracking / costos:** no hay monitoreo de tokens por usuario ni alertas por uso anómalo.

Para acercarse a la teoría habría que añadir: evaluación con RAGAS o similar, integración con LangSmith/Phoenix, logging de entradas/salidas y, si aplica, guardrails y control de costos.

---

## 11. HERRAMIENTAS Y DEPENDENCIAS USADAS

### RAG Service (`rag-service/`)

| Herramienta | Uso |
|-------------|-----|
| **LlamaIndex** | Índice vectorial, carga de PDFs, chunking implícito, embeddings, chat engine con memoria. |
| **llama-index-llms-groq** | Conexión al LLM Groq (Llama 3.1 8B). |
| **llama-index-embeddings-huggingface** | Embeddings locales (BGE small). |
| **llama-index-readers-file** | `SimpleDirectoryReader` para PDFs. |
| **pypdf** | Lectura de PDFs. |
| **FastAPI** | API HTTP, rutas, CORS. |
| **Pydantic** | `ChatRequest`, `ChatResponse`, `ChatMessage`. |
| **Uvicorn** | Servidor ASGI. |
| **python-dotenv** | Variables de entorno (ej. `GROQ_API_KEY`). |

### Nutrition Label Agent (`nutrition-label-agent/`)

| Herramienta | Uso |
|-------------|-----|
| **LangChain** | Integración con Gemini y Tavily; mensajes (`HumanMessage`), invocación del modelo. |
| **langchain-google-genai** | Modelo Gemini (vision + texto). |
| **LangGraph** | Grafo de estados: analyzer → condicional → searcher / finalizer → finalizer → END. |
| **langchain-community** | Herramienta Tavily (búsqueda web). |
| **Tavily** | Búsqueda de alternativas saludables. |
| **FastAPI** | API, `POST /analyze-label`, CORS. |
| **Pydantic** | Modelos de request/response y estado. |
| **Pillow** | Procesamiento de imagen (convertir a base64 para Gemini). |
| **Uvicorn** | Servidor. |

### Detección de ingredientes (`nutri-ai-backend/`)

| Herramienta | Uso |
|-------------|-----|
| **PyTorch / TorchVision** | Backend de cálculo y tensores. |
| **Transformers (Hugging Face)** | Modelo Grounding DINO (vision-language, zero-shot). |
| **FastAPI** | API, `/detect`, `/detect/image`. |
| **Pydantic** | Validación de datos. |
| **Pillow** | Apertura y dibujo sobre imágenes. |

---

## 12. TABLA RÁPIDA: “quiero ver X en el código”

| Quiero ver… | Archivo | Líneas (aprox.) |
|-------------|---------|------------------|
| Modelo LLM y configuración (RAG) | `rag-service/ai_engine.py` | 26–48 |
| Embeddings y vectorización (RAG) | `rag-service/ai_engine.py` | 50–61, 96–99, 125 |
| Carga de PDFs y chunking (RAG) | `rag-service/ai_engine.py` | 64–87, 125 |
| Índice y persistencia (RAG) | `rag-service/ai_engine.py` | 90–128 |
| Memoria / historial (RAG) | `rag-service/ai_engine.py` | 131–147, 159 |
| Retrieval + generación (RAG) | `rag-service/ai_engine.py` | 150–168 |
| Endpoint POST /chat y validación | `rag-service/main.py` | 36–53, 71–91 |
| Prompts y Gemini (Label Agent) | `nutrition-label-agent/nodes.py` | 70–88, 96–104, 228–233 |
| Grafo LangGraph (Label Agent) | `nutrition-label-agent/graph.py` | Todo el archivo |
| API Label Agent | `nutrition-label-agent/main.py` | 94–120 (analyze-label) |
| Detección zero-shot (ingredientes) | `nutri-ai-backend/main.py`, `detection/` | Config y llamada al modelo |

---

## Conclusión

En este proyecto se aplicó la teoría de Gen AI así:

- **RAG:** ingesta (PDFs → chunking → embeddings → índice), ejecución (retrieval + prompt + Groq), orquestación con **LlamaIndex** y exposición con **FastAPI + Pydantic**.
- **Agente de etiquetas:** orquestación con **LangChain + LangGraph**, modelo **multimodal (Gemini)**, herramientas (Tavily), prompts explícitos y API con **FastAPI**.
- **Detección:** modelo **vision-language (Grounding DINO)** zero-shot y API **FastAPI**.

Lo que no está implementado respecto a la teoría: Vertex AI, recuperación desde SQL/NoSQL en RAG, streaming SSE, evaluación (RAGAS), observabilidad (traces, BigQuery), guardrails y token tracking. El mapeo detallado concepto a código sigue en `rag-service/MAPEO_SOLUCION_GEN_AI.md`.
