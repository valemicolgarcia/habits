# Deploy completo: frontend + backend Nutri AI

Resumen: el **frontend** va a Vercel; el **backend** (con el modelo de detección) va a un servicio que ejecute Docker. El **modelo no se sube por separado**: corre dentro del backend cuando alguien usa "Registrar comida" con foto.

---

## ¿Para qué es el Dockerfile?

El **Dockerfile** del backend (`nutri-ai-backend/Dockerfile`) sirve para:

1. **Empaquetar** el backend en una imagen: Python, FastAPI, PyTorch, transformers y tu código.
2. **Desplegar** esa imagen en plataformas que soporten Docker:
   - **Hugging Face Spaces** (SDK Docker) — gratis, pensado para modelos.
   - **Railway**, **Render**, **Fly.io**, etc. — también soportan Docker.

El modelo **Grounding DINO** no se “sube” a otro lado: se descarga desde Hugging Face **la primera vez** que el backend recibe una petición a `/detect`. Eso pasa dentro del contenedor/servidor donde corre tu API. No tenés que desplegar el modelo en un servicio aparte.

---

## Orden recomendado

1. Desplegar el **backend** y obtener su URL pública.
2. Configurar esa URL en el **frontend** (Vercel) y desplegar el frontend.

---

## 1. Desplegar el backend (Nutri AI)

Tenés que elegir **una** de estas opciones. Todas usan el mismo **Dockerfile**.

### Opción A: Hugging Face Spaces (gratis, sencillo)

1. Entrá a [huggingface.co/spaces](https://huggingface.co/spaces) y creá un **Space**.
2. Nombre del Space: por ejemplo `nutri-ai` (o el que quieras).
3. **SDK**: elegí **Docker** (no Gradio).
4. Subí los archivos del backend:
   - `main.py`
   - Carpeta `detection/` (con `config.py`, `grounding_dino.py`, etc.)
   - `requirements.txt`
   - `Dockerfile`
   - Opcional: `README.md` del backend
5. El Space construye la imagen y expone la API. La URL será algo como:
   - `https://TU_USUARIO-nutri-ai.hf.space`
6. En **Settings → Variables and secrets** podés definir (opcional):
   - `GROUNDING_DINO_MODEL_ID`
   - `GROUNDING_DINO_BOX_THRESHOLD`
   - `GROUNDING_DINO_TEXT_THRESHOLD`

**Importante:** En HF Spaces la URL suele ser la del Space. Revisá en la pestaña del Space cómo se expone el puerto (7860). Si la API está en la raíz, la URL base para el frontend es la URL del Space; si no, puede ser `https://TU_USUARIO-nutri-ai.hf.space` (y los endpoints serían `/detect`, `/detect/image`, etc.).

### Opción B: Railway

1. [railway.app](https://railway.app) → New Project → **Deploy from GitHub** (conectá el repo).
2. Elegí el **directorio** `nutri-ai-backend` (Root Directory = `nutri-ai-backend`).
3. Railway detecta el Dockerfile y construye la imagen. Configurá el **puerto** en 7860 si hace falta (Railway suele inyectar `PORT`; el Dockerfile usa `PORT` por defecto 7860).
4. Deploy → te dan una URL tipo `https://nutri-ai-backend-production-xxxx.up.railway.app`.
5. Esa URL es tu **API base** para el frontend.

### Opción C: Render

1. [render.com](https://render.com) → New → **Web Service**.
2. Conectá el repo y elegí:
   - **Root Directory**: `nutri-ai-backend`
   - **Environment**: Docker
3. Render usa el Dockerfile. El servicio puede tardar varios minutos en arrancar (imagen con PyTorch).
4. Te dan una URL tipo `https://nutri-ai-backend-xxxx.onrender.com`. Esa es tu **API base**.

---

## 2. Configurar CORS en el backend (si usás dominio propio)

El backend ya permite orígenes `*.vercel.app`. Si en producción usás **otro dominio** (ej. `https://mitienda.com`), tenés que permitirlo. En `main.py` podés ampliar `allow_origins` o usar una variable de entorno (ej. `CORS_ORIGINS`) y leerla ahí. Para solo Vercel no hace falta tocar nada.

---

## 3. Desplegar el frontend (Vercel)

Seguí la guía **DEPLOY_VERCEL.md** y además agregá la URL del backend:

1. En el proyecto de Vercel → **Settings → Environment Variables**.
2. Añadí:
   - **Name:** `VITE_NUTRI_AI_API_URL`
   - **Value:** la URL base del backend **sin** barra final, por ejemplo:
     - HF Spaces: `https://TU_USUARIO-nutri-ai.hf.space`
     - Railway: `https://nutri-ai-backend-production-xxxx.up.railway.app`
     - Render: `https://nutri-ai-backend-xxxx.onrender.com`
   - Marcá Production (y Preview/Development si querés).
3. Guardá y hacé un **redeploy** (Deployments → ... → Redeploy) para que el build tome la nueva variable.

El frontend usa `VITE_NUTRI_AI_API_URL` en `src/lib/nutriApi.ts`; en producción las peticiones de detección irán a esa URL.

---

## 4. Resumen

| Parte      | Dónde              | Qué hacés                                                                 |
|-----------|--------------------|---------------------------------------------------------------------------|
| Frontend  | Vercel             | Conectar repo, variables `VITE_SUPABASE_*` y `VITE_NUTRI_AI_API_URL`, deploy. |
| Backend   | HF Spaces / Railway / Render | Subir código del `nutri-ai-backend` y desplegar con el **Dockerfile**.     |
| Modelo    | No se sube aparte  | Corre dentro del backend; se descarga de Hugging Face en el primer `/detect`. |
| Dockerfile| Backend            | Se usa para construir y ejecutar el backend en el servicio que elijas.    |

---

## 5. Probar en producción

1. Abrí la URL de Vercel (tu app).
2. Entrá a **Nutrición** → **Registrar comida** → subí una foto.
3. La primera vez puede tardar un poco (descarga del modelo en el backend); después debería responder con los ingredientes detectados.

Si el backend no está disponible o la URL está mal, la detección con foto fallará; el resto de la app (ingredientes manuales, guardar en Supabase, historial) sigue funcionando si tenés Supabase y las variables correctas en Vercel.
