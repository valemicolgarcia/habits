# LangChain: Teoría e implementación en el proyecto

Este documento describe qué es LangChain (teoría) y cómo se utiliza en el microservicio de análisis de etiquetas nutricionales.

---

## Parte 1: ¿Qué es LangChain?

**LangChain** es un framework de código abierto para construir aplicaciones que usan **modelos de lenguaje (LLMs)** y **herramientas externas**. No sustituye al modelo ni a las APIs; ofrece una capa de **abstracción** para conectarlos con tu lógica de negocio, manejar prompts, mensajes y herramientas de forma uniforme.

### Objetivos principales

- **Unificar interfaces:** distintos proveedores (OpenAI, Google Gemini, Anthropic, etc.) se usan con la misma API: crear el modelo, invocarlo con mensajes, leer la respuesta.
- **Componer flujos:** encadenar llamadas a modelos con herramientas (búsqueda, bases de datos, código) y con tu propio código.
- **Manejar mensajes:** representar conversaciones (humano, asistente, sistema) y contenido multimodal (texto + imágenes) en un formato estándar.

### Conceptos principales

#### 1. Modelos (LLMs / Chat Models)

- Son los **motores de IA** con los que hablas (p. ej. GPT-4, Gemini, Claude).
- En LangChain se crean como objetos configurables (API key, modelo, temperatura, etc.).
- Se **invocan** con una lista de mensajes y devuelven una respuesta (objeto con `.content`, etc.).
- Cada proveedor tiene su paquete: `langchain_google_genai`, `langchain_openai`, etc.

#### 2. Mensajes (Messages)

- Representan cada “turno” en una conversación: **HumanMessage** (usuario), **AIMessage** (asistente), **SystemMessage** (instrucciones de sistema).
- Pueden ser **multimodales:** texto + imagen (p. ej. contenido con `type: "text"` y `type: "image_url"`).
- Los modelos reciben una lista de mensajes y devuelven un mensaje de respuesta.

#### 3. Herramientas (Tools)

- Funciones o servicios externos que el modelo o tu código pueden usar: búsqueda web, APIs, bases de datos, etc.
- En LangChain suelen tener una interfaz estándar: se **invocan** con un diccionario de argumentos (p. ej. `{"query": "..."}`) y devuelven un resultado.
- Permiten que la aplicación combine **razonamiento del LLM** con **datos en tiempo real** (como búsqueda en internet).
- **Importante:** el **modelo** (p. ej. Gemini) no es una tool. El modelo es el LLM que “piensa” y genera texto (o elige llamar a una tool). Las **tools** son acciones que alguien (tu código o el agente) invoca: búsqueda, calculadora, API, etc.

### Modelos y herramientas disponibles en LangChain

LangChain ofrece **integraciones** con muchos proveedores. La lista completa se mantiene en la [documentación oficial](https://python.langchain.com/docs/integrations/). Aquí va un resumen por categoría.

#### Modelos (LLMs / Chat Models)

Cada uno vive en un paquete distinto. Todos exponen la misma idea: crear el modelo, llamar `.invoke(messages)` y leer `.content`.

| Proveedor   | Paquete                  | Ejemplo de modelo / clase              |
|------------|---------------------------|----------------------------------------|
| Google     | `langchain_google_genai`  | `ChatGoogleGenerativeAI` (Gemini)      |
| OpenAI     | `langchain_openai`       | `ChatOpenAI` (GPT-4, etc.)             |
| Anthropic  | `langchain_anthropic`     | `ChatAnthropic` (Claude)               |
| Cohere     | `langchain_cohere`       | `ChatCohere`                           |
| Mistral    | `langchain_mistralai`    | `ChatMistralAI`                        |
| Groq       | `langchain_groq`         | `ChatGroq`                             |
| Ollama     | `langchain_community`   | `ChatOllama` (modelos locales)         |
| Azure OpenAI | `langchain_openai`     | `AzureChatOpenAI`                      |

Hay más (Fireworks, Together, etc.); el patrón es siempre: paquete de integración + clase de chat model.

#### Herramientas (Tools)

Las tools suelen estar en `langchain_community.tools.*` o en paquetes específicos. Algunas categorías:

| Categoría     | Ejemplos (clases / integraciones) |
|---------------|------------------------------------|
| Búsqueda web  | `TavilySearchResults`, `DuckDuckGoSearchRun`, `GoogleSearchRun`, `SerperAPIWrapper` |
| APIs / HTTP   | Herramientas genéricas para llamar APIs; también integraciones concretas (Wikipedia, etc.) |
| Código / shell| `PythonREPLTool`, `ShellTool` (con cuidado de seguridad) |
| Bases de datos| Herramientas para SQL, vectores, etc. |
| Custom        | Puedes definir tus propias tools con `@tool` o creando una clase que implemente la interfaz |

Cada tool se invoca con `.invoke({...})` con los argumentos que esa tool espere (p. ej. `{"query": "..."}` para búsqueda).

#### Cuáles usamos en este proyecto

En este repositorio solo usamos **un modelo** y **una herramienta** de LangChain:

| Tipo    | Integración en LangChain        | Uso en el proyecto |
|---------|----------------------------------|--------------------|
| **Modelo** | `ChatGoogleGenerativeAI` (paquete `langchain_google_genai`) | Gemini: análisis de la imagen de la etiqueta (nodo analyzer) y extracción del nombre de la alternativa saludable (nodo searcher). |
| **Tool**   | `TavilySearchResults` (paquete `langchain_community`)     | Búsqueda web de alternativas más saludables al producto (nodo searcher). |

No usamos el agente de LangChain (que “ata” el modelo a una lista de tools para que él decida cuándo llamarlas); el flujo lo definimos nosotros con LangGraph y en cada nodo invocamos el modelo o la tool explícitamente.

#### 4. Cadenas y agentes (opcional)

- **Cadenas (chains):** secuencias fijas de pasos (prompt → modelo → tal vez otra herramienta). El orden está definido por ti en código.
- **Agentes:** flujos donde **el propio modelo decide** en cada paso si debe llamar a una herramienta, cuál y con qué argumentos. LangChain incluye este tipo de agente “clásico”; en este proyecto usamos **LangGraph** para orquestar, no el agente de LangChain (ver más abajo).

### El agente propio de LangChain (y por qué aquí usamos LangGraph)

En LangChain existe la noción de **agente**: un bucle en el que el **LLM toma todas las decisiones** sobre el flujo.

**Cómo funciona el agente de LangChain:**

1. Le pasas al modelo una lista de **herramientas** (tools) con nombre y descripción. El modelo “sabe” que puede usarlas.
2. Le envías el mensaje del usuario (p. ej. “Analiza esta etiqueta y busca alternativas saludables”).
3. El modelo responde con **texto** o con una **llamada a herramienta** (tool call): elige una herramienta y los argumentos (p. ej. `tavily_search(query="alternativas a galletas oreo")`).
4. Si hubo tool call, LangChain ejecuta esa herramienta y **vuelve a meter el resultado en la conversación** como mensaje (tipo “el resultado de la búsqueda fue: …”).
5. El modelo ve ese resultado y **vuelve a decidir**: puede responder al usuario, o hacer otra tool call. El bucle sigue hasta que el modelo devuelve una respuesta final en texto (sin tool call).

Ese patrón se suele llamar **ReAct** (Reasoning + Acting): el modelo “piensa” y “actúa” (usa tools) en ciclos. Tú no escribes el flujo paso a paso; el flujo lo determina el modelo en cada ejecución.

**Por qué en este proyecto no usamos ese agente:**

- Queremos un **flujo fijo y predecible**: primero siempre analizar la imagen con Gemini; luego, **solo si** el análisis dice “ultraprocesado”, buscar alternativas con Tavily; por último, consolidar. Eso es una **decisión de negocio** (regla clara), no algo que queremos que el LLM “invente” en cada llamada.
- Con el agente de LangChain, el modelo podría decidir buscar alternativas cuando no toca, no buscar cuando sí toca, o llamar herramientas en otro orden. El comportamiento sería más flexible pero menos controlado.
- Con **LangGraph** definimos **nodos** (analyzer, searcher, finalizer) y **edges condicionales** en código. La regla “si es ultraprocesado → buscar; si no → finalizar” está escrita por nosotros, no inferida por el modelo. Los nodos siguen usando **LangChain** (modelo Gemini y herramienta Tavily), pero **quién hace qué y cuándo** lo define el grafo.

**Resumen:** El agente de LangChain = “el modelo decide en cada paso si usa una herramienta y cuál”. Nuestro enfoque con LangGraph = “nosotros definimos el flujo y las condiciones; dentro de cada paso usamos LangChain para llamar al modelo y a las herramientas”. Así tenemos control explícito sobre el orden y la lógica de negocio.

### Relación con LangGraph

- **LangChain** aporta los “bloques”: el modelo (Gemini), la herramienta (Tavily), los mensajes (`HumanMessage`).
- **LangGraph** define el flujo: en qué orden se ejecutan los pasos y cómo se pasa el estado entre nodos.
- En la práctica: los **nodos** del grafo son funciones que, por dentro, usan LangChain para llamar al modelo y a las herramientas. La API (FastAPI) no importa LangChain; solo invoca el grafo.

---

## Parte 2: Implementación en este proyecto

LangChain **solo se usa dentro de los nodos** del grafo, en el archivo `nodes.py`. La API (`main.py`) y la definición del grafo (`graph.py`) no importan LangChain.

### 2.1 Dependencias (requirements.txt)

```text
langchain>=0.1.0
langchain-google-genai>=1.0.0
langchain-community>=0.0.20
```

- **langchain:** núcleo y convenciones.
- **langchain-google-genai:** integración con Google Gemini (modelo de chat con soporte de visión).
- **langchain-community:** herramientas de terceros, entre ellas la búsqueda Tavily.

Además, LangGraph usa componentes de **langchain_core** (p. ej. mensajes), que suelen venir como dependencia de los paquetes anteriores.

### 2.2 Modelo: Gemini (langchain_google_genai)

El modelo se crea en `nodes.py` con `ChatGoogleGenerativeAI`:

```python
from langchain_google_genai import ChatGoogleGenerativeAI

def get_gemini_model():
    api_key = os.getenv("GOOGLE_API_KEY")
    model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite")
    return ChatGoogleGenerativeAI(
        model=model_name,
        google_api_key=api_key,
        temperature=0.3,
    )
```

- **Uso:** se llama a `get_gemini_model()` dentro de los nodos **analyzer** y **searcher**.
- **Responsabilidad:** conectar con la API de Google Gemini usando la interfaz estándar de LangChain (objeto con `.invoke(messages)`).

### 2.3 Mensajes: HumanMessage (langchain_core)

Los mensajes se usan para enviar al modelo tanto texto como imagen (contenido multimodal).

En el nodo **analyzer** se construye un mensaje con texto + imagen en base64:

```python
from langchain_core.messages import HumanMessage

message = HumanMessage(
    content=[
        {"type": "text", "text": prompt},
        {
            "type": "image_url",
            "image_url": f"data:image/jpeg;base64,{state['image_data']}",
        },
    ]
)

response = model.invoke([message])
response_text = response.content.strip()
```

- **HumanMessage:** representa el turno del “usuario” (en este caso, nuestro prompt + la foto de la etiqueta).
- **content:** lista de bloques; aquí, un bloque de texto (el prompt de análisis NOVA) y un bloque de imagen (data URI en base64).
- **model.invoke([message]):** interfaz estándar de LangChain para enviar una lista de mensajes y obtener la respuesta del modelo.

En el nodo **searcher** solo se envía texto (sin imagen):

```python
resp = model.invoke([prompt])  # prompt es un string; LangChain lo trata como mensaje de usuario
nombre = (resp.content or "").strip()
```

### 2.4 Herramienta: Tavily (langchain_community)

La búsqueda en internet se hace con la herramienta Tavily, expuesta como “tool” en LangChain:

```python
from langchain_community.tools.tavily_search import TavilySearchResults

def get_tavily_tool():
    api_key = os.getenv("TAVILY_API_KEY")
    return TavilySearchResults(
        max_results=8,
        tavily_api_key=api_key,
    )
```

En el nodo **searcher** se usa así:

```python
tool = get_tavily_tool()
results = tool.invoke({"query": query})
```

- **invoke({"query": ...}):** interfaz estándar de herramientas en LangChain; aquí la herramienta llama a la API de Tavily y devuelve una lista de resultados (título, URL, contenido).
- El resto del nodo (filtrar resultados, priorizar, extraer un nombre con Gemini) es lógica propia del proyecto; LangChain solo proporciona la conexión con Tavily.

### 2.5 Dónde se usa LangChain (resumen)

| Componente LangChain   | Archivo   | Uso en el proyecto |
|------------------------|-----------|--------------------|
| **ChatGoogleGenerativeAI** | `nodes.py` | Modelo Gemini: análisis de imagen (analyzer) y extracción de nombre de alternativa (searcher). |
| **HumanMessage**       | `nodes.py` | Mensaje multimodal (texto + imagen) en analyzer; en searcher se usa solo texto vía string. |
| **TavilySearchResults**| `nodes.py` | Búsqueda web de alternativas saludables en searcher. |
| **model.invoke(...)**  | `nodes.py` | Llamada al modelo en ambos nodos que usan Gemini. |
| **tool.invoke(...)**   | `nodes.py` | Llamada a la herramienta Tavily en searcher. |

- **main.py:** no importa LangChain; solo prepara el estado e invoca el grafo.
- **graph.py:** no importa LangChain; solo define nodos y edges. Los nodos son funciones que, al ejecutarse, usan LangChain internamente.

### 2.6 Flujo de datos con LangChain

1. **Analyzer:**  
   Estado con `image_data` (base64) → se crea `HumanMessage` (prompt + imagen) → `model.invoke([message])` (Gemini) → se parsea el JSON y se actualiza `state["analysis"]`.

2. **Searcher:**  
   Estado con `analysis["producto"]` → `tool.invoke({"query": ...})` (Tavily) → filtrado y priorización en Python → `model.invoke([prompt])` (Gemini) para extraer un nombre → se actualiza `state["search_results"]`.

3. **Finalizer:**  
   No usa LangChain; solo lee el estado y construye `final_report`.

---

## Conclusión

- **Teoría:** LangChain es un framework para conectar LLMs y herramientas con tu aplicación mediante interfaces estándar (modelos, mensajes, herramientas e invoke).
- **En este proyecto:** LangChain se usa únicamente en `nodes.py`: para conectar con **Gemini** (modelo con visión y texto) y con **Tavily** (búsqueda web), y para construir el **mensaje multimodal** que recibe Gemini en el analyzer. El flujo y el estado los orquesta **LangGraph**; la API los expone vía **FastAPI**.
