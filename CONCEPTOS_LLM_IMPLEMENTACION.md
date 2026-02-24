# Dónde está implementado cada concepto de APIs de LLMs en el proyecto

Este documento enlaza los conceptos teóricos (API stateless, estructura del mensaje, parámetros de generación, tokens/contexto, prompt engineering) con **archivos y líneas** concretas del repo.

---

## 1. API "Stateless" (el modelo no recuerda nada)

**Concepto:** La API no guarda estado. Si querés que la IA tenga "memoria", en cada request tenés que enviar **todo el historial** de la conversación.

### Dónde está implementado

| Qué | Dónde |
|-----|--------|
| **Cliente reenvía el historial en cada llamada** | **Frontend:** `src/lib/ragApi.ts`. La función `chatRAG(message, chatHistory)` arma el body con `message` + `chat_history` y hace `POST /chat` con ese payload cada vez (líneas 26–34). El frontend es quien acumula y reenvía el historial. |
| **Backend recibe historial y lo inyecta en cada request** | **RAG API:** `rag-service/main.py` líneas 73–87. El endpoint `post_chat(body: ChatRequest)` recibe `body.message` y `body.chat_history`; convierte el historial a lista de dicts y llama `rag_chat(message=..., chat_history=history)`. No hay sesión ni almacenamiento en servidor. |
| **Motor construye "memoria" solo para ese llamado** | **Motor RAG:** `rag-service/ai_engine.py` líneas 132–148 y 151–168. En cada `chat(message, chat_history)` se llama `_build_memory_from_history(chat_history)`, que crea un **nuevo** `ChatMemoryBuffer` y le carga los mensajes. Ese buffer se pasa al chat engine y se usa solo para esa invocación. LlamaIndex luego condensa historial + contexto y llama al LLM (Groq) con todo en un solo payload. |

**Resumen:** Stateless = el servidor no guarda conversaciones. La "memoria" se implementa reenviando `chat_history` desde el cliente y reconstruyendo el buffer en cada request en `ai_engine.py` (132–148, 160).

---

## 2. Estructura del mensaje (roles: System, User, Assistant)

**Concepto:** El request a la API no es un string suelto; es un objeto con **System** (reglas), **User** (pregunta actual), **Assistant** (respuestas anteriores).

### Dónde está implementado

| Rol | Dónde está en el proyecto |
|-----|---------------------------|
| **System (instrucciones / personalidad)** | **RAG:** Cuando no hay PDFs en `data_source`, se crea un documento dummy que actúa como "rol del asistente" (equivalente a system instruction). **`rag-service/ai_engine.py`** líneas **117–124**: `Document(text="Eres un asistente experto en nutrición y entrenamiento físico. Responde preguntas sobre...")`. Ese texto entra al índice y el chat engine lo usa como contexto/instrucción. No hay un campo "system" explícito en el payload; LlamaIndex arma el prompt internamente con `condense_plus_context`. |
| **User (pregunta actual)** | **RAG:** El mensaje actual es el que se pasa a `chat_engine.chat(message)` en **`ai_engine.py`** línea **166** (`message` viene del request). En el Searcher del **Nutrition Label Agent** se usa solo **User:** **`nutrition-label-agent/nodes.py`**: `HumanMessage(content=[...])` en analyzer (96–104) y `model.invoke([prompt])` en searcher (236) — en ambos casos es rol "usuario". |
| **Assistant (respuestas anteriores)** | **RAG:** Las respuestas previas de la IA están en `chat_history`; en **`ai_engine.py`** **141–147** se mapean a `MessageRole.ASSISTANT` y se cargan en el `ChatMemoryBuffer` con `memory.put(ChatMessage(role=role, content=content))`. Así el payload que LlamaIndex envía al LLM incluye turnos usuario + asistente. **Label Agent:** No se mantiene historial de conversación; cada análisis es un flujo nuevo (solo mensajes de usuario en cada nodo). |

**Resumen:**  
- System: RAG → documento dummy (117–124). Label Agent → reglas dentro del texto del prompt (no hay `SystemMessage` en código).  
- User/Assistant: RAG → `_build_memory_from_history` con `MessageRole.USER` / `MessageRole.ASSISTANT` (132–148) y `chat_engine.chat(message)` (166).

---

## 3. Parámetros de generación (temperature, max tokens, stop)

**Concepto:** Temperature (creatividad), max output tokens (límite de respuesta), stop sequences (dónde cortar).

### Dónde está implementado

| Parámetro | Implementado | Dónde |
|-----------|--------------|--------|
| **Temperature** | **Sí** | **Groq (RAG):** **`rag-service/ai_engine.py`** línea **48**: `temperature=0.2` en `Groq(...)` — respuestas más determinísticas. **Gemini (Label Agent):** **`nutrition-label-agent/nodes.py`** línea **42**: `temperature=0.3` en `ChatGoogleGenerativeAI(...)` — un poco más de variación. |
| **Max output tokens** | **No** | No se configura `max_tokens` ni `max_output_tokens` en el código; cada integración (LlamaIndex-Groq, LangChain-Gemini) usa el valor por defecto del proveedor. |
| **Stop sequences** | **Parcial (post-procesamiento)** | No se envían stop sequences a la API. En **`nutrition-label-agent/nodes.py`** líneas **109–113** se hace un "corte" manual: si la respuesta empieza con ` ```json ` o ` ``` `, se elimina para quedarse solo con el JSON. Es un control de formato por código, no por parámetro de la API. |

**Resumen:** Solo **temperature** está explícito (RAG 0.2, Label Agent 0.3). Max tokens y stop sequences no están configurados en el proyecto.

---

## 4. Tokens y ventana de contexto

**Concepto:** Los modelos trabajan con tokens; las APIs cobran por input/output; la context window limita cuánto se puede enviar de una vez.

### Dónde está implementado

| Concepto | En el proyecto |
|----------|----------------|
| **Tokens** | No hay cálculo ni límite explícito de tokens en el código. El costo y el conteo los maneja cada proveedor (Groq, Gemini). |
| **Context window** | No se configura en el repo. **`rag-service/MAPEO_SOLUCION_GEN_AI.md`** indica: *"El límite lo define el proveedor (Groq/Llama); en el código no se configura explícitamente."* En RAG, el contexto que recibe el LLM es el que arma LlamaIndex: historial condensado + chunks recuperados del índice + pregunta actual, todo dentro del límite que impone la API. |

**Resumen:** Tokens y context window no están implementados ni configurados en el proyecto; se usan los valores por defecto de cada API.

---

## 5. Técnicas de prompt engineering

**Concepto:** Zero-shot (sin ejemplos), few-shot (con ejemplos), chain of thought (razonamiento paso a paso).

### Dónde está implementado

| Técnica | Dónde |
|---------|--------|
| **Zero-shot** | **Sí, en todos los prompts.** **Nutrition Label Agent – Analyzer:** **`nutrition-label-agent/nodes.py`** líneas **70–88**: un solo prompt con instrucciones (estructura JSON, definición NOVA 1–4, "Responde SOLO con el JSON"). No hay ejemplos de (imagen → JSON). **Searcher:** líneas **228–233**: "De lo anterior, extrae ÚNICAMENTE el nombre de un alimento...". Tampoco hay ejemplos. **RAG:** El chat engine de LlamaIndex arma la pregunta + contexto sin ejemplos inyectados en el código. |
| **Few-shot** | **No.** No hay bloques del tipo "Ejemplo 1: Pregunta → Respuesta" en ningún prompt del repo. |
| **Chain of Thought (CoT)** | **Parcial.** En el **Analyzer** del Label Agent el prompt pide un campo **`"razonamiento": "breve explicación de por qué es NOVA X"`** (líneas 71–78). Eso obliga al modelo a dar una justificación breve (razonamiento) antes/además del JSON. No es un "pensá paso a paso" explícito en el texto del prompt, pero el output estructurado incluye razonamiento, lo que puede mejorar la coherencia de la categoría NOVA. |

**Resumen:** Zero-shot en todos los usos de LLM. Few-shot no usado. CoT de forma suave vía campo "razonamiento" en el análisis NOVA (nodes.py 71–78).

---

## Tabla resumen por archivo

| Concepto | Archivo(s) | Líneas / nota |
|---------|------------|----------------|
| Stateless: cliente envía historial | `src/lib/ragApi.ts` | 26–34 |
| Stateless: backend usa historial en cada request | `rag-service/main.py` | 77, 83–87; `rag-service/ai_engine.py` | 132–148, 160 |
| System role (instrucciones) | `rag-service/ai_engine.py` | 117–124 (documento dummy) |
| User / Assistant roles | `rag-service/ai_engine.py` | 141–147 (MessageRole.USER / ASSISTANT), 166 (message actual) |
| Mensaje multimodal (user + imagen) | `nutrition-label-agent/nodes.py` | 96–106, 106 (invoke) |
| Temperature | `rag-service/ai_engine.py` | 48; `nutrition-label-agent/nodes.py` | 42 |
| Control de formato / “stop” manual | `nutrition-label-agent/nodes.py` | 109–113 (strip ```json) |
| Zero-shot prompts | `nutrition-label-agent/nodes.py` | 70–88 (analyzer), 228–233 (searcher) |
| CoT light (razonamiento) | `nutrition-label-agent/nodes.py` | 71–78 (campo razonamiento) |

Si en una entrevista te piden "dónde aplicás stateless" o "dónde definís temperature", podés citar este documento y estos archivos/líneas.
