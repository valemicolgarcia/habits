# Cómo está implementado: sólidos conocimientos en desarrollo de APIs y buenas prácticas

Este documento enlaza la frase *"Sólidos conocimientos en desarrollo de APIs, aplicando buenas prácticas de diseño y documentación"* con **archivos y líneas** concretas del repo.

---

## 1. Diseño de la API (convenciones REST, estructura)

### Rutas y métodos HTTP

| Servicio | Rutas | Archivo | Líneas |
|----------|--------|---------|--------|
| **RAG** | `GET /` (info), `GET /health`, `POST /chat` | `rag-service/main.py` | 58–73 |
| **Nutrition Label Agent** | `GET /`, `GET /health`, `POST /analyze-label` | `nutrition-label-agent/main.py` | 58–96 |
| **Food Ingredients Detection** | `GET /`, `GET /health`, `POST /detect`, `POST /detect/image`, `POST /corrections` | `nutri-ai-backend/main.py` | 248–446 |

- **GET** para información y health check; **POST** para acciones que envían datos (mensaje, imagen, correcciones). No se mezclan verbos ni se usan GET con body.
- Nombres de recursos claros: `/chat`, `/analyze-label`, `/detect`, `/corrections`.

### Respuestas tipadas y contratos explícitos

Cada endpoint de datos devuelve un **modelo Pydantic** declarado con `response_model=...`, de modo que la documentación OpenAPI y el cliente conocen el contrato:

| Endpoint | response_model | Archivo |
|----------|----------------|---------|
| `POST /chat` | `ChatResponse` | `rag-service/main.py` 73 |
| `POST /analyze-label` | `NutritionalResponse` | `nutrition-label-agent/main.py` 96 |
| `POST /detect` | `DetectionResponse` | `nutri-ai-backend/main.py` 263 |

---

## 2. Validación de entrada (Pydantic y Field)

### Modelos de request/response con descripciones

**RAG** (`rag-service/main.py` 38–55):

- **ChatMessage:** `role` y `content` con `Field(..., description="...")`.
- **ChatRequest:** `message` (obligatorio), `chat_history` opcional con `default_factory=list` y descripción.
- **ChatResponse:** `response` con descripción.

**Nutrition Label Agent** (`nutrition-label-agent/models.py`):

- **NutritionalResponse:** todos los campos con `Field(..., description="...")`, rangos numéricos (`ge=1, le=4` para NOVA, `ge=1, le=10` para score).
- **AnalysisResult:** usado internamente para validar la salida de Gemini.

**Nutri-AI Backend** (`nutri-ai-backend/main.py` 180–197, 263–284):

- **DetectedIngredient**, **DetectionResponse**, **CorrectedIngredientItem** con tipos y docstrings.
- Parámetros de query documentados: `Query(..., description="...")` para `category`, `ingredients_prompt`, `box_threshold`, `text_threshold`, `include_boxes`.

FastAPI valida automáticamente el body (y query) contra estos modelos; si algo no cumple, responde **422 Unprocessable Entity** con el detalle de validación antes de ejecutar la lógica.

---

## 3. Códigos de estado y manejo de errores

### Uso consistente de HTTPException

| Código | Uso en el proyecto |
|--------|--------------------|
| **400 Bad Request** | Datos inválidos: mensaje vacío (RAG), archivo vacío, content-type no permitido, categoría inválida, consent faltante, JSON mal formado en correcciones. |
| **500 Internal Server Error** | Fallos del motor (RAG, agente, detección), errores al guardar en Supabase o disco. |

**Ejemplos por servicio:**

- **RAG** (`rag-service/main.py` 79–91): 400 si `message` vacío; 500 si `ValueError` o cualquier excepción del motor.
- **Nutrition Label Agent** (`nutrition-label-agent/main.py` 109–173): 400 si no hay file, file vacío o tipo no permitido; 500 en errores del grafo o del agente.
- **Nutri-AI Backend** (`nutri-ai-backend/main.py`): 400 en validaciones de archivo, categoría, consent, JSON; 500 en fallos de detección o persistencia.

No se devuelve 200 con un cuerpo de error; se usan códigos HTTP adecuados y `detail` legible.

---

## 4. Documentación (OpenAPI / Swagger y metadatos)

### Metadatos de la aplicación FastAPI

Cada servicio define **title**, **description** y **version** en el constructor de `FastAPI(...)`:

| Servicio | Archivo | Líneas | Contenido |
|----------|---------|--------|-----------|
| RAG | `rag-service/main.py` | 17–24 | title, description (RAG, LlamaIndex, historial), version 1.0.0 |
| Label Agent | `nutrition-label-agent/main.py` | 22–29 | title, description (LangGraph, NOVA, alternativas), version 1.0.0 |
| Detection | `nutri-ai-backend/main.py` | 160–168 | title, description (Grounding DINO, detección, correcciones), version 2.0.0 |

Eso alimenta la **documentación OpenAPI** que FastAPI genera por defecto.

### Documentación interactiva (/docs)

En los tres servicios, la ruta **`/docs`** se expone (Swagger UI) y se menciona en la respuesta de `GET /`:

- `rag-service/main.py` 62: `"docs": "/docs"`.
- `nutrition-label-agent/main.py` 64: `"docs": "/docs"`.
- `nutri-ai-backend/main.py` 253: `"docs": "/docs"`.

Así, quien consume la API puede ver esquemas de request/response, probar endpoints y entender el contrato sin leer código.

### Docstrings en endpoints

Los endpoints tienen docstrings que aparecen en OpenAPI:

- **RAG** (`rag-service/main.py` 75–78): descripción del `POST /chat` (mensaje, historial, contexto).
- **Label Agent** (`nutrition-label-agent/main.py` 98–107): descripción de `POST /analyze-label` (imagen, NOVA, alternativas).
- **Nutri-AI** (`nutri-ai-backend/main.py` 372–375, 452–456): descripción de `POST /detect/image` y `POST /corrections`.

### README y documentación externa

Cada microservicio documenta la API en su README:

- **rag-service:** `README.md`, `README_HF.md` — endpoints (`POST /chat`, `GET /health`, `GET /docs`), body de ejemplo, variables de entorno.
- **nutrition-label-agent:** `README.md` — `POST /analyze-label`, `GET /health`, `GET /docs`, requisitos.
- **nutri-ai-backend:** `README.md` — tabla de endpoints (GET/POST), parámetros de `POST /detect`, ejemplos con `curl`, variables de entorno.

---

## 5. CORS y consumo desde frontend

Los tres servicios configuran **CORS** para que el frontend (desarrollo y despliegue) pueda llamar a la API sin bloqueos del navegador:

- **rag-service/main.py** 26–36: `CORSMiddleware`, `allow_origins` (localhost 5173, 127.0.0.1), `allow_origin_regex` para `*.vercel.app`, `allow_credentials`, `allow_methods` y `allow_headers` explícitos.
- **nutrition-label-agent/main.py** 31–42: misma idea, incluye también `localhost:3000`.
- **nutri-ai-backend/main.py** 170–177: mismos orígenes y regex para Vercel.

Buena práctica: CORS definido de forma explícita en lugar de abrir todo a `*` en producción.

---

## 6. Health check y descubrimiento

Cada API expone **GET /health** para monitoreo y orquestadores:

- **RAG:** `{"status": "ok"}` (`rag-service/main.py` 68–69).
- **Label Agent:** `{"status": "ok" | "error" | "warning", "details": {...}}` según configuración de `GOOGLE_API_KEY` y `TAVILY_API_KEY` (`nutrition-label-agent/main.py` 68–93).
- **Detection:** `{"status": "ok"}` (`nutri-ai-backend/main.py` 258–260).

**GET /** devuelve un pequeño “discovery”: nombre del servicio, enlace a `/docs` y a `/health` (y en RAG/Detection, enlace al recurso principal como `POST /chat` o `POST /detect`).

---

## 7. Separación de responsabilidades

- **rag-service:** `main.py` solo define la app, modelos Pydantic, rutas y manejo de errores; la lógica RAG (índice, historial, LLM) está en **`ai_engine.py`**. El endpoint llama `rag_chat(...)` y traduce excepciones a HTTP.
- **nutrition-label-agent:** `main.py` recibe la imagen, valida y llama al grafo en **`graph.py`**; los nodos y el uso de Gemini están en **`nodes.py`**; los modelos de respuesta en **`models.py`**.
- **nutri-ai-backend:** `main.py` orquesta rutas, validación y persistencia; la detección está en **`detection/`** (Grounding DINO).

Así la API queda delgada (entrada/salida, códigos HTTP) y la lógica de negocio en módulos reutilizables y testeables.

---

## Tabla resumen: “Buenas prácticas” → Dónde está

| Buena práctica | Dónde está implementado |
|----------------|--------------------------|
| Diseño REST (GET info/health, POST acciones) | Los tres `main.py`: rutas y métodos listados arriba. |
| Contrato de respuesta (response_model) | `rag-service/main.py` 73; `nutrition-label-agent/main.py` 96; `nutri-ai-backend/main.py` 263, 359, 446. |
| Validación con Pydantic (Field, descripciones, rangos) | `rag-service/main.py` 38–55; `nutrition-label-agent/models.py`; `nutri-ai-backend/main.py` 180–197, Query con description. |
| Códigos HTTP correctos (400, 500) | Los tres servicios: HTTPException con status_code y detail. |
| Documentación OpenAPI (title, description, version) | Los tres `main.py`: constructor FastAPI(...). |
| Documentación interactiva (/docs) | Disponible por defecto en FastAPI; enlaces en GET /. |
| Docstrings en endpoints | `rag-service/main.py` 75–78; `nutrition-label-agent/main.py` 98–107; `nutri-ai-backend/main.py` 372–375, 452–456. |
| README con endpoints y ejemplos | `rag-service/README.md`, `README_HF.md`; `nutrition-label-agent/README.md`; `nutri-ai-backend/README.md`. |
| CORS configurado para frontend | Los tres `main.py`: CORSMiddleware con allow_origins y allow_origin_regex. |
| Health check (GET /health) | Los tres `main.py`: endpoint /health. |
| Separación API vs lógica de negocio | RAG: main vs ai_engine; Label Agent: main vs graph/nodes/models; Detection: main vs detection/. |

Con esto podés argumentar en CV o entrevistas que aplicás diseño REST, validación tipada, documentación (OpenAPI + README) y manejo explícito de errores y CORS en APIs reales del proyecto.
