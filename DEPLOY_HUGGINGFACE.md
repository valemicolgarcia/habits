# Deploy del modelo Nutri AI en Hugging Face Spaces

Pasos para subir el backend de detección de ingredientes a Hugging Face y que tu web en Vercel pueda usarlo.

---

## Resumen

- **Dónde:** Hugging Face Spaces (SDK **Docker**).
- **Qué subís:** solo el contenido de la carpeta `nutri-ai-backend` (Dockerfile, `main.py`, `detection/`, `requirements.txt`).
- **URL final:** te dan una URL tipo `https://TU_USUARIO-nutri-ai.hf.space`. Esa es la que configurás en Vercel como `VITE_NUTRI_AI_API_URL`.

---

## Paso 1: Crear el Space en Hugging Face

1. Entrá a [huggingface.co/spaces](https://huggingface.co/spaces) e iniciá sesión (o creá cuenta).
2. Clic en **"Create new Space"**.
3. Completá:
   - **Space name:** por ejemplo `nutri-ai` (queda `TU_USUARIO/nutri-ai`).
   - **License:** el que prefieras (ej. MIT).
   - **SDK:** elegí **Docker** (no Gradio ni Streamlit).
   - **Visibility:** Public si querés que cualquiera pueda llamar a la API.
4. Clic en **"Create Space"**.

---

## Paso 2: Subir el código del backend

El Space es un repo de Git. Tenés que tener en la **raíz** del Space estos archivos:

- `Dockerfile`
- `main.py`
- `requirements.txt`
- Carpeta `detection/` (con `__init__.py`, `config.py`, `grounding_dino.py`, etc.)

### Opción A: Subir desde la web (rápido)

1. En la página del Space, andá a la pestaña **"Files"** → **"Add file"** → **"Upload files"**.
2. Subí uno por uno (o en bloque):
   - `main.py` (desde `nutri-ai-backend/`)
   - `requirements.txt`
   - `Dockerfile`
   - Los archivos de `detection/`: `__init__.py`, `config.py`, `grounding_dino.py` (y si hay más, todos).
3. Para la carpeta `detection/`: en HF podés crear una carpeta y subir los archivos dentro, o subir cada archivo con nombre `detection/__init__.py`, etc., según cómo lo permita la interfaz.

### Opción B: Clonar el Space y copiar desde tu repo

1. En la página del Space, copiá la URL del repo (ej. `https://huggingface.co/spaces/TU_USUARIO/nutri-ai`).
2. En tu PC:

```bash
git clone https://huggingface.co/spaces/TU_USUARIO/nutri-ai
cd nutri-ai
```

3. Copiá todo el contenido de `nutri-ai-backend` a la raíz del clone (no la carpeta, sino lo que está dentro):

```bash
# Desde la raíz de tu proyecto gym
cp nutri-ai-backend/main.py nutri-ai-backend/requirements.txt nutri-ai-backend/Dockerfile nutri-ai/
cp -r nutri-ai-backend/detection nutri-ai/
```

4. Subí los cambios al Space:

```bash
cd nutri-ai
git add .
git commit -m "Add Nutri AI backend"
git push
```

(Te va a pedir usuario y token de Hugging Face; podés crear un token en Settings → Access Tokens.)

---

## Paso 3: Esperar el build

1. Después del push (o de subir archivos), Hugging Face **construye la imagen Docker** y arranca el contenedor.
2. En la pestaña **"Logs"** del Space ves el progreso. La primera vez puede tardar varios minutos (descarga de PyTorch, transformers, etc.).
3. Cuando esté listo, el estado pasa a **"Running"** y la URL del Space es tu API base.

---

## Paso 4: Probar la API

La URL del Space es tu base. Por ejemplo:

- `https://TU_USUARIO-nutri-ai.hf.space`

Endpoints útiles:

- **Documentación:** `https://TU_USUARIO-nutri-ai.hf.space/docs`
- **Detección:** `POST https://TU_USUARIO-nutri-ai.hf.space/detect` (body: form-data con `file` = imagen)

Podés probar desde el navegador abriendo `/docs` y usando "Try it out" en `/detect`, o con curl:

```bash
curl -X POST "https://TU_USUARIO-nutri-ai.hf.space/detect" -F "file=@ruta/a/foto.jpg"
```

---

## Paso 5: Conectar Vercel con el modelo

1. Entrá a tu proyecto en **Vercel** → **Settings** → **Environment Variables**.
2. Agregá (o editá) la variable:
   - **Name:** `VITE_NUTRI_AI_API_URL`
   - **Value:** la URL base del Space **sin** barra final, ej. `https://TU_USUARIO-nutri-ai.hf.space`
   - Marcá Production (y Preview si querés).
3. Guardá y hacé un **Redeploy** del proyecto (Deployments → ... → Redeploy) para que el build use la nueva variable.

Tu web en Vercel va a llamar a esa URL para la detección de ingredientes cuando el usuario suba una foto en Nutrición.

---

## Paso 5b: MLOps: guardar correcciones en Supabase desde el backend (opcional)

Si querés que las correcciones human-in-the-loop (checkbox "Permitir usar esta corrección para mejorar el modelo") se guarden en Supabase cuando los usuarios usen la web en producción:

1. En el **Space de Hugging Face** → **Settings** → **Variables and secrets**.
2. Agregá estas variables (mismo proyecto Supabase que usa la web):
   - **SUPABASE_URL** = tu URL (ej. `https://xxxx.supabase.co`); puede ser la misma que `VITE_SUPABASE_URL` del frontend.
   - **SUPABASE_SERVICE_ROLE_KEY** = la key **secret** del proyecto (Dashboard Supabase → Settings → API → Secret keys → "default").
3. Guardá. El próximo build del Space usará estas variables y las correcciones se guardarán en Supabase (bucket `mlops-corrections` y tabla `ingredient_corrections`).

Si no configurás esto, las correcciones desde la web no se persisten (el backend en HF no tiene disco persistente para `data/corrections/`).

---

## Paso 6: Arreglar el deploy de la web en Vercel (errores de build)

Si el deploy en Vercel fallaba por errores de TypeScript en `NutritionPage.tsx`, ya se corrigieron en el repo:

1. **Estado inicial del formulario:** tipado explícito para que no falle el tipo.
2. **Variable no usada:** se eliminó `setHealthLevel` que no se usaba.
3. **Upsert de Supabase:** se usó `onConflict: 'user_id,date,meal_type'` para que coincida con la firma esperada.

Hacé commit de los cambios, push a tu repo y Vercel debería volver a desplegar bien. Si usás otra rama, asegurate de que esos cambios estén en la rama que conectaste a Vercel.

---

## Resumen rápido

| Paso | Dónde | Qué hacés |
|------|--------|-----------|
| 1 | Hugging Face | Crear Space, SDK **Docker** |
| 2 | Space | Subir `main.py`, `detection/`, `requirements.txt`, `Dockerfile` |
| 3 | Space | Esperar build "Running" |
| 4 | Navegador | Probar `/docs` y `/detect` |
| 5 | Vercel | Variable `VITE_NUTRI_AI_API_URL` = URL del Space, luego Redeploy |
| 6 | Repo | Commit + push de los fixes de NutritionPage para que Vercel construya |

---

## Problemas frecuentes

- **"Application failed to start":** Revisá los Logs del Space. Suele ser falta de algún archivo (ej. algo de `detection/`) o error en el Dockerfile.
- **CORS:** El backend ya permite orígenes `*.vercel.app`. Si usás otro dominio, hay que añadirlo en CORS en `main.py`.
- **Timeout en la primera petición:** La primera vez que llamás a `/detect`, el modelo se descarga; puede tardar 1–2 minutos. Las siguientes son más rápidas.
