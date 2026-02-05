# Nutrition Label Agent

**Hábitos** · Subproyecto: *LangChain, LangGraph, Gemini Vision, Tavily, FastAPI, Pydantic*

---

## ¿Para qué sirve?

Permite al usuario de la app **Hábitos** subir una **foto de una etiqueta nutricional** (envase, tabla de información nutricional) y obtener en segundos:

- **Nombre del producto** e **ingredientes principales**
- **Clasificación NOVA** (1–4) y si es **ultraprocesado**
- **Score de salud** (1–10) y un **análisis breve**
- Si es ultraprocesado: **alternativa más saludable** sugerida (búsqueda web)

Así el usuario puede decidir qué comer con más información y sustituir productos ultraprocesados por opciones mejores.

---

## ¿Cómo funciona?

1. El usuario sube una imagen desde la sección **Nutrición** de Hábitos (botón “Subir foto de etiqueta nutricional”).
2. El frontend envía la imagen al microservicio **Nutrition Label Agent** vía `POST /analyze-label`.
3. El agente ejecuta un **grafo** (LangGraph) con tres pasos lógicos:
   - **Analyzer:** la imagen se envía a **Gemini (visión)** con un prompt que pide un JSON: producto, categoría NOVA, si es ultraprocesado, ingredientes principales y un breve razonamiento. La respuesta se valida con **Pydantic** (`AnalysisResult`).
   - **Decisión:** si el análisis indica “ultraprocesado”, el flujo pasa al **Searcher**; si no, va directo al **Finalizer**.
   - **Searcher (solo si aplica):** se usa **Tavily** para buscar alternativas más saludables en la web; se filtran resultados y con **Gemini** se extrae un solo nombre de alimento sugerido.
   - **Finalizer:** se arma el reporte final (producto, NOVA, score, análisis, alternativa si hubo búsqueda, advertencias) y se valida con **Pydantic** (`NutritionalResponse`).
4. La API devuelve ese JSON al frontend, que muestra el resultado (NOVA, score, ingredientes, advertencias y alternativa saludable).

Todo el flujo está orquestado por **LangGraph** (nodos y edges condicionales); **LangChain** se usa para conectar con Gemini y con Tavily.

---

## Cómo está implementado

- **API:** **FastAPI** con un único endpoint de análisis (`POST /analyze-label`) y health check. La imagen llega como `multipart/form-data`, se convierte a base64 y se inyecta en el estado inicial del grafo.
- **Grafo:** Definido en `graph.py` con **LangGraph** (`StateGraph`): nodos `analyzer`, `searcher`, `finalizer`; entrada en `analyzer`; edge condicional según `es_ultraprocesado`; el estado se pasa de nodo en nodo (imagen, análisis, resultados de búsqueda, reporte final).
- **Nodos:** En `nodes.py`: `analyzer_node` llama a **Gemini** (mensaje multimodal: prompt + imagen en base64), parsea JSON y valida con **Pydantic**; `searcher_node` usa **Tavily** (LangChain) y opcionalmente Gemini para extraer el nombre de la alternativa; `finalizer_node` construye el reporte y lo valida con **Pydantic**.
- **Modelos:** En `models.py`, **Pydantic** define `AnalysisResult` (salida del analyzer) y `NutritionalResponse` (respuesta de la API).
- **Despliegue:** Servicio Python independiente (Docker), configurable con `GOOGLE_API_KEY` y `TAVILY_API_KEY`; el frontend usa `VITE_LABEL_ANALYZER_API_URL` para apuntar al microservicio.

En conjunto: **LangChain** para Gemini y Tavily, **LangGraph** para el flujo del agente, **Gemini Vision** para analizar la etiqueta, **Tavily** para buscar alternativas, **FastAPI** para exponer la API y **Pydantic** para validar entradas y salidas.
