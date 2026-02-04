# Cómo probar el Análisis de Etiquetas Nutricionales

Necesitás **dos terminales**: una para el backend del agente (nutrition-label-agent) y otra para el frontend.

---

## 1. API Keys

- **Google (Gemini)**: [Google AI Studio](https://aistudio.google.com/apikey) → crear API key.
- **Tavily** (búsqueda de alternativas): [Tavily](https://tavily.com/) → registrarte y obtener API key.

---

## 2. Backend (nutrition-label-agent)

En la **primera terminal**:

```powershell
cd c:\Users\VICTUS\Documents\2026\gym\nutrition-label-agent
```

Crear archivo `.env` (si no existe) con:

```
GOOGLE_API_KEY=tu-api-key-de-google
TAVILY_API_KEY=tu-api-key-de-tavily
```

Instalar dependencias y levantar el servicio:

```powershell
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8002
```

Dejá esta terminal abierta. La API queda en **http://localhost:8002**.

- Docs: http://localhost:8002/docs  
- Health: http://localhost:8002/health  

---

## 3. Frontend

En la **segunda terminal** (raíz del proyecto):

```powershell
cd c:\Users\VICTUS\Documents\2026\gym
```

En el `.env` de la raíz del proyecto agregar (o verificar):

```
VITE_LABEL_ANALYZER_API_URL=http://localhost:8002
```

Luego:

```powershell
npm run dev
```

Abrí la URL que muestre Vite (ej. **http://localhost:5173**).

---

## 4. Probar en la app

1. Iniciá sesión.
2. Entrá a **Nutrición** (desde el menú principal).
3. Arriba de **“Puntuación del día”** vas a ver **“Análisis de Etiqueta Nutricional”**.
4. Clic en **“Subir foto de etiqueta nutricional”** y elegí una imagen de una etiqueta (foto del paquete, tabla nutricional, lista de ingredientes).
5. Esperá unos segundos: el agente analiza con Gemini, clasifica NOVA y, si es ultraprocesado, busca alternativas con Tavily.
6. Vas a ver:
   - Nombre del producto
   - Clasificación NOVA (1–4)
   - Score de salud (1–10)
   - Análisis crítico
   - Ingredientes principales
   - Advertencias (si aplica)
   - Alternativa saludable con link (si es ultraprocesado)

---

## Resumen rápido

| Qué              | Dónde                    | Comando / URL                    |
|------------------|--------------------------|----------------------------------|
| Backend agente   | `nutrition-label-agent/` | `uvicorn main:app --reload --host 0.0.0.0 --port 8002` |
| API agente      | -                        | http://localhost:8002            |
| Frontend        | raíz del proyecto        | `npm run dev`                    |
| App             | -                        | http://localhost:5173 → Nutrición |

Si el backend no está en marcha o faltan las API keys, al subir la foto vas a ver un mensaje de error en la sección de análisis de etiqueta.
