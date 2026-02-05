# LangGraph: Teoría e implementación en el proyecto

Este documento explica qué es LangGraph (teoría) y cómo se implementó en el microservicio de análisis de etiquetas nutricionales.

---

## Parte 1: ¿Qué es LangGraph?

**LangGraph** es una librería del ecosistema LangChain que permite construir **agentes y flujos de trabajo** modelados como **grafos con estado**. En lugar de una cadena lineal de pasos, defines **nodos** (funciones) y **conexiones** entre ellos; el **estado** se pasa de nodo en nodo y puede decidir qué camino seguir.

### Conceptos principales

#### 1. Estado (State)

- Es un **diccionario compartido** que fluye por todo el grafo.
- Cada nodo recibe el estado actual, puede leerlo y **devolver actualizaciones** (nuevas claves o valores).
- LangGraph **fusiona** lo que devuelve cada nodo con el estado anterior (por defecto, merge por clave).

En resumen: el estado es la “memoria” del flujo; todos los nodos leen y escriben en él.

#### 2. Nodos (Nodes)

- Son **funciones** que reciben el estado y devuelven un diccionario con las **partes del estado que actualizan**.
- Cada nodo hace una tarea concreta: llamar a un LLM, usar una herramienta, calcular algo, etc.
- Los nodos no conocen el grafo; solo reciben estado y devuelven actualizaciones.

#### 3. Edges (Conexiones)

- **Edge fijo:** siempre se pasa del nodo A al nodo B.
- **Edge condicional:** una función recibe el estado y decide el **siguiente nodo** (por ejemplo, "search" o "finalize"). Así se implementan ramas y decisiones.

#### 4. Punto de entrada y fin

- Se define un **entry point** (primer nodo).
- El flujo termina cuando se llega al nodo especial **END**.

### Ventajas de LangGraph

- **Flujos con lógica condicional:** distintos caminos según el estado (ej.: “solo si es ultraprocesado, buscar alternativas”).
- **Reutilización:** cada nodo es una función independiente, fácil de probar y cambiar.
- **Transparencia:** el estado en cada paso es inspeccionable, útil para depurar y para futuras mejoras (logs, persistencia).
- **Compatible con LangChain:** los nodos pueden usar modelos, tools y mensajes de LangChain sin problema.

### Relación con LangChain

- **LangChain** proporciona los “bloques”: modelos (p. ej. Gemini), herramientas (p. ej. Tavily), mensajes (`HumanMessage`).
- **LangGraph** orquesta esos bloques en un grafo: en qué orden se ejecutan y cómo pasa el estado entre ellos.
- En la práctica: LangGraph define el **flujo**; dentro de cada nodo se usa **LangChain** para llamar a APIs y herramientas.

---

## Parte 2: Implementación en este proyecto

En este repositorio, LangGraph se usa para orquestar el agente de análisis de etiquetas: análisis de imagen con Gemini, búsqueda opcional de alternativas con Tavily y consolidación del resultado final.

### 2.1 Estado del agente: `AgentState`

El estado se define en `nodes.py` como un `TypedDict`:

```python
class AgentState(TypedDict):
    image_data: str      # Base64 de la imagen
    analysis: dict      # Resultado del análisis inicial (Gemini)
    search_results: str  # Alternativa saludable encontrada (si aplica)
    final_report: dict  # Reporte final para la API
```

- **`image_data`:** lo rellena la API (FastAPI) antes de invocar el grafo.
- **`analysis`:** lo rellena el nodo **analyzer** (producto, categoría NOVA, si es ultraprocesado, ingredientes, razonamiento).
- **`search_results`:** lo rellena el nodo **searcher** solo cuando se buscan alternativas (un nombre de alimento).
- **`final_report`:** lo rellena el nodo **finalizer** con el objeto que después se devuelve al cliente (y se valida con `NutritionalResponse` en `models.py`).

### 2.2 Nodos (en `nodes.py`)

| Nodo        | Función           | Qué hace |
|------------|-------------------|----------|
| **analyzer** | `analyzer_node`   | Recibe la imagen en base64, la envía a Gemini con un prompt que pide un JSON (producto, categoria_nova, es_ultraprocesado, ingredientes_principales, razonamiento). Parsea y valida con `AnalysisResult`. Actualiza `state["analysis"]`. |
| **searcher** | `searcher_node`   | Solo se ejecuta si el análisis indica ultraprocesado. Usa Tavily para buscar alternativas más saludables, filtra resultados no deseados y usa Gemini para extraer un solo nombre de alimento. Actualiza `state["search_results"]`. |
| **finalizer** | `finalizer_node`  | Lee `analysis` y `search_results`, construye el texto de análisis crítico, el score de salud (1–10), las advertencias y el campo de alternativa saludable. Arma el diccionario final. Actualiza `state["final_report"]`. |

Los nodos **analyzer** y **searcher** usan LangChain (Gemini, Tavily, `HumanMessage`); el **finalizer** solo usa el estado ya calculado.

### 2.3 Grafo (en `graph.py`)

- Se crea un **StateGraph** con `AgentState`:
  ```python
  workflow = StateGraph(AgentState)
  ```

- Se registran los tres nodos:
  ```python
  workflow.add_node("analyzer", analyzer_node)
  workflow.add_node("searcher", searcher_node)
  workflow.add_node("finalizer", finalizer_node)
  ```

- **Entrada:** el flujo empieza siempre en `analyzer`:
  ```python
  workflow.set_entry_point("analyzer")
  ```

- **Edge condicional después de `analyzer`:** la función `should_search(state)` lee `state["analysis"]["es_ultraprocesado"]`:
  - Si es `True` → siguiente nodo: **searcher**
  - Si es `False` → siguiente nodo: **finalizer** (no se buscan alternativas)

- **Edges fijos:**
  - `searcher` → **finalizer** (tras buscar alternativas, siempre se consolida)
  - **finalizer** → **END** (fin del grafo)

Flujo resumido:

```
        [ENTRADA]
             │
             ▼
        analyzer
             │
     should_search(state)
             │
     ┌───────┴───────┐
     │               │
es_ultraprocesado   no
     │               │
     ▼               │
  searcher           │
     │               │
     └───────┬───────┘
             ▼
        finalizer
             │
             ▼
           [END]
```

### 2.4 Uso desde la API (`main.py`)

La API **no** usa LangChain directamente; solo usa el grafo compilado:

1. Recibe la imagen en `POST /analyze-label`.
2. Valida y convierte la imagen a base64.
3. Construye el estado inicial:
   ```python
   initial_state = {
       "image_data": image_base64,
       "analysis": {},
       "search_results": "",
       "final_report": {},
   }
   ```
4. Obtiene el grafo y lo ejecuta:
   ```python
   graph = get_nutrition_agent_graph()
   result = graph.invoke(initial_state)
   ```
5. Toma `result["final_report"]`, lo valida con `NutritionalResponse` y lo devuelve como JSON al cliente.

La instancia del grafo se reutiliza (singleton en `get_nutrition_agent_graph()` en `graph.py`).

### 2.5 Resumen de archivos

| Archivo      | Rol respecto a LangGraph |
|-------------|---------------------------|
| `graph.py`  | Define el `StateGraph`, nodos, edges condicionales y fijos, y expone el grafo compilado. |
| `nodes.py`  | Define `AgentState` e implementa los tres nodos (que internamente usan LangChain). |
| `models.py` | Define `AnalysisResult` (salida del analyzer) y `NutritionalResponse` (equivalente a `final_report`). |
| `main.py`   | Prepara el estado inicial, invoca `graph.invoke(initial_state)` y devuelve `final_report` como respuesta de la API. |

---

## Conclusión

- **Teoría:** LangGraph es un framework para construir flujos con estado, nodos y edges (fijos o condicionales), típicamente usando LangChain dentro de los nodos.
- **En este proyecto:** el grafo orquesta análisis de imagen (Gemini), búsqueda opcional de alternativas (Tavily + Gemini) y consolidación del resultado; la API solo prepara el estado, invoca el grafo y devuelve el `final_report`.
