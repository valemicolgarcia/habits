# Deploy del Servicio RAG en Hugging Face Spaces

Guía paso a paso para desplegar el servicio RAG en Hugging Face Spaces.

---

## Resumen

- **Dónde**: Hugging Face Spaces (SDK **Docker**)
- **Qué subir**: Contenido de la carpeta `rag-service` (Dockerfile, `main.py`, `ai_engine.py`, `requirements.txt`)
- **URL final**: `https://TU_USUARIO-rag-nutricion-entrenamiento.hf.space`
- **Configurar en Vercel**: `VITE_RAG_API_URL` = URL del Space

---

## Paso 1: Crear el Space en Hugging Face

1. Ve a [huggingface.co/spaces](https://huggingface.co/spaces) e inicia sesión
2. Clic en **"Create new Space"**
3. Completa:
   - **Space name**: `rag-nutricion-entrenamiento` (o el nombre que prefieras)
   - **License**: MIT (o el que prefieras)
   - **SDK**: **Docker** (importante: NO Gradio ni Streamlit)
   - **Visibility**: Public (para que tu frontend pueda acceder)
4. Clic en **"Create Space"**

---

## Paso 2: Subir los archivos

El Space es un repositorio Git. Necesitas estos archivos en la **raíz** del Space:

### Archivos requeridos:
- ✅ `Dockerfile`
- ✅ `main.py`
- ✅ `ai_engine.py`
- ✅ `requirements.txt`
- ✅ `README.md` (opcional pero recomendado)

### Opción A: Subir desde la web (rápido)

1. En la página del Space, ve a **"Files"** → **"Add file"** → **"Upload files"**
2. Sube estos archivos desde `rag-service/`:
   - `Dockerfile`
   - `main.py`
   - `ai_engine.py`
   - `requirements.txt`
   - `README.md` (si quieres)

### Opción B: Clonar y copiar (recomendado si tienes Git)

1. En la página del Space, copia la URL del repo:
   ```
   https://huggingface.co/spaces/TU_USUARIO/rag-nutricion-entrenamiento
   ```

2. En tu terminal:
   ```bash
   # Clonar el Space
   git clone https://huggingface.co/spaces/TU_USUARIO/rag-nutricion-entrenamiento
   cd rag-nutricion-entrenamiento
   
   # Copiar archivos desde tu proyecto
   cp ../rag-service/Dockerfile .
   cp ../rag-service/main.py .
   cp ../rag-service/ai_engine.py .
   cp ../rag-service/requirements.txt .
   cp ../rag-service/README.md .  # Opcional
   
   # Commit y push
   git add .
   git commit -m "Initial commit: RAG service"
   git push
   ```

---

## Paso 3: Configurar Variables Secretas

1. En la página del Space, ve a **"Settings"** → **"Variables and secrets"**
2. Agrega una nueva variable secreta:
   - **Key**: `GROQ_API_KEY`
   - **Value**: tu API key de Groq (empieza con `gsk_...`)
   - Marca como **Secret** (oculta el valor)
3. Guarda

**Importante**: Sin esta variable, el servicio no funcionará.

---

## Paso 4: Esperar el Build

1. Hugging Face Spaces detectará el Dockerfile automáticamente
2. Comenzará a construir la imagen (puede tardar 5-15 minutos)
3. Puedes ver el progreso en la pestaña **"Logs"**
4. Cuando termine, verás: **"Space is running"**

---

## Paso 5: Verificar que Funciona

1. **Health check**:
   - Abre: `https://TU_USUARIO-rag-nutricion-entrenamiento.hf.space/health`
   - Debería devolver: `{"status":"ok"}`

2. **Probar el endpoint**:
   ```bash
   curl -X POST https://TU_USUARIO-rag-nutricion-entrenamiento.hf.space/chat \
     -H "Content-Type: application/json" \
     -d '{"message": "¿Cuántas proteínas necesito al día?"}'
   ```

3. **Documentación automática**:
   - Abre: `https://TU_USUARIO-rag-nutricion-entrenamiento.hf.space/docs`
   - Deberías ver la documentación interactiva de FastAPI

---

## Paso 6: Configurar en Vercel

1. Ve a tu proyecto en Vercel
2. **Settings** → **Environment Variables**
3. Agrega nueva variable:
   - **Name**: `VITE_RAG_API_URL`
   - **Value**: `https://TU_USUARIO-rag-nutricion-entrenamiento.hf.space`
     - ⚠️ **Sin barra final** (`/`)
   - Marca: **Production**, **Preview**, **Development**
4. Guarda
5. **Redeploy**: Ve a **Deployments** → ... → **Redeploy**

---

## Paso 7: Probar en Producción

1. Abre tu app en Vercel
2. Ve a la página de inicio
3. Busca la barra "Pregunta sobre nutrición y entrenamiento"
4. Haz una pregunta de prueba
5. Debería responder correctamente

---

## Agregar PDFs (Opcional)

Si quieres agregar documentos PDF al servicio RAG:

1. En el Space, ve a **"Files"**
2. Crea una carpeta `data_source/` (o súbela directamente)
3. Sube tus PDFs dentro de `data_source/`
4. El servicio los indexará automáticamente en el próximo reinicio

**Nota**: Los PDFs se guardan en el repositorio del Space, así que ten cuidado con el tamaño.

---

## Troubleshooting

### Error: "GROQ_API_KEY no está configurada"
- Verifica que la variable secreta esté configurada en Settings → Variables and secrets
- Reinicia el Space después de agregar la variable

### Error: CORS en el frontend
- Verifica que `VITE_RAG_API_URL` esté configurada correctamente en Vercel
- Asegúrate de que la URL no tenga barra final
- El CORS ya está configurado para `*.vercel.app`

### El Space no inicia
- Revisa los logs en la pestaña **"Logs"**
- Verifica que el Dockerfile esté correcto
- Asegúrate de que todos los archivos estén en la raíz del Space

### El servicio responde lento
- La primera vez puede tardar (descarga modelos de embeddings)
- HF Spaces tiene límites de recursos en el plan gratuito
- Considera usar un Space con hardware dedicado si necesitas más rendimiento

---

## Estructura Final del Space

```
rag-nutricion-entrenamiento/
├── Dockerfile          # Configuración Docker
├── main.py             # Servidor FastAPI
├── ai_engine.py        # Lógica RAG
├── requirements.txt    # Dependencias Python
├── README.md           # Documentación (opcional)
└── data_source/        # PDFs (opcional, se crea después)
    └── documento1.pdf
```

---

## Resumen de URLs

| Servicio | Variable en Vercel | URL Ejemplo |
|----------|-------------------|-------------|
| RAG Service | `VITE_RAG_API_URL` | `https://TU_USUARIO-rag-nutricion-entrenamiento.hf.space` |
| Nutri AI Backend | `VITE_NUTRI_AI_API_URL` | `https://TU_USUARIO-nutri-ai.hf.space` |
| Supabase | `VITE_SUPABASE_URL` | `https://tu-proyecto.supabase.co` |

---

## Notas Importantes

- ✅ El Dockerfile ya está configurado para HF Spaces (puerto 7860, usuario UID 1000)
- ✅ El CORS ya permite `*.vercel.app`
- ✅ El servicio funciona sin PDFs (usa conocimiento general del LLM)
- ⚠️ HF Spaces tiene límites en el plan gratuito (CPU/RAM)
- ⚠️ Los PDFs se guardan en el repo del Space (límite de tamaño)

---

¡Listo! Tu servicio RAG debería estar funcionando en Hugging Face Spaces. 🚀
