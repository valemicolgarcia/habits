# Deploy del Servicio RAG

Guía para desplegar el microservicio RAG (Retrieval-Augmented Generation) en producción.

---

## Resumen

El **servicio RAG** es un microservicio separado que necesita:
- Un servicio que ejecute Docker (como Railway, Render, Fly.io, Hugging Face Spaces)
- Variables de entorno: `GROQ_API_KEY`
- Volúmenes persistentes para `storage/` (índice) y `data_source/` (PDFs)

---

## Opciones de Deploy

### Opción A: Railway (Recomendado - Más fácil)

1. **Crear cuenta en Railway**: [railway.app](https://railway.app)

2. **Nuevo proyecto desde GitHub**:
   - Conecta tu repositorio
   - Selecciona el directorio `rag-service` como **Root Directory**

3. **Configurar variables de entorno**:
   - En Railway → Variables:
     - `GROQ_API_KEY`: tu API key de Groq
     - `RAG_DATA_SOURCE`: `/app/data_source` (por defecto)
     - `RAG_STORAGE`: `/app/storage` (por defecto)

4. **Deploy**:
   - Railway detecta el Dockerfile automáticamente
   - Te dará una URL tipo: `https://rag-service-production-xxxx.up.railway.app`

5. **Volúmenes persistentes** (opcional pero recomendado):
   - En Railway → Volumes:
     - Monta `/app/storage` para persistir el índice
     - Monta `/app/data_source` si quieres subir PDFs

**Nota**: Railway tiene un plan gratuito limitado. Para producción, considera un plan de pago.

---

### Opción B: Render

1. **Crear cuenta en Render**: [render.com](https://render.com)

2. **Nuevo Web Service**:
   - Conecta tu repositorio
   - **Root Directory**: `rag-service`
   - **Environment**: Docker
   - **Build Command**: (dejar vacío, usa Dockerfile)
   - **Start Command**: (dejar vacío, usa CMD del Dockerfile)

3. **Variables de entorno**:
   - `GROQ_API_KEY`: tu API key de Groq

4. **Deploy**:
   - Render construye la imagen Docker
   - Te da una URL tipo: `https://rag-service-xxxx.onrender.com`

**Nota**: Render tiene un plan gratuito pero el servicio se "duerme" después de inactividad. Para producción, considera un plan de pago.

---

### Opción C: Hugging Face Spaces (Gratis)

1. **Crear Space en Hugging Face**: [huggingface.co/spaces](https://huggingface.co/spaces)

2. **Configuración**:
   - **SDK**: Docker (no Gradio)
   - **Nombre**: `rag-nutricion-entrenamiento` (o el que prefieras)

3. **Subir archivos**:
   - `main.py`
   - `ai_engine.py`
   - `requirements.txt`
   - `Dockerfile`
   - `.env.example` (para referencia)

4. **Variables secretas**:
   - En Settings → Variables and secrets:
     - `GROQ_API_KEY`: tu API key

5. **Deploy**:
   - HF Spaces construye automáticamente
   - URL: `https://TU_USUARIO-rag-nutricion-entrenamiento.hf.space`

**Nota**: HF Spaces es gratis pero tiene límites de recursos. Para producción con mucho tráfico, considera Railway o Render.

---

### Opción D: Fly.io

1. **Instalar Fly CLI**: [fly.io/docs/getting-started/installing-flyctl](https://fly.io/docs/getting-started/installing-flyctl)

2. **Login y crear app**:
   ```bash
   fly auth login
   cd rag-service
   fly launch
   ```

3. **Configurar variables**:
   ```bash
   fly secrets set GROQ_API_KEY=tu-api-key
   ```

4. **Deploy**:
   ```bash
   fly deploy
   ```

5. **URL**: `https://TU_APP_NAME.fly.dev`

---

## Configurar CORS para Producción

El servicio RAG ya tiene CORS configurado para `*.vercel.app`. Si usas otro dominio, actualiza `rag-service/main.py`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://tu-dominio.com",  # Agregar tu dominio
    ],
    allow_origin_regex=r"^https://[\w-]+\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Configurar Frontend (Vercel)

Una vez que tengas la URL del servicio RAG desplegado:

1. **En Vercel → Settings → Environment Variables**:
   - **Name**: `VITE_RAG_API_URL`
   - **Value**: la URL de tu servicio RAG (sin barra final)
     - Railway: `https://rag-service-production-xxxx.up.railway.app`
     - Render: `https://rag-service-xxxx.onrender.com`
     - HF Spaces: `https://TU_USUARIO-rag-nutricion-entrenamiento.hf.space`
   - Marca **Production**, **Preview** y **Development**

2. **Redeploy**:
   - Ve a Deployments → ... → Redeploy
   - Esto asegura que el build tome la nueva variable

---

## Subir PDFs (Opcional)

Si quieres agregar PDFs al servicio RAG en producción:

### Railway:
- Usa el volumen montado en `/app/data_source`
- Sube PDFs vía CLI o interfaz web

### Render:
- Render no tiene volúmenes persistentes en el plan gratuito
- Considera usar un servicio de almacenamiento (S3, etc.) o Railway

### HF Spaces:
- Puedes subir PDFs directamente en el repositorio del Space
- Colócalos en `data_source/` en el repo

---

## Verificación Post-Deploy

1. **Health check**:
   ```bash
   curl https://TU_URL_RAG/health
   ```
   Debería devolver: `{"status":"ok"}`

2. **Probar chat**:
   ```bash
   curl -X POST https://TU_URL_RAG/chat \
     -H "Content-Type: application/json" \
     -d '{"message": "¿Cuántas proteínas necesito al día?"}'
   ```

3. **En el frontend**:
   - Ve a tu app en Vercel
   - Prueba la barra de preguntas RAG
   - Debería funcionar igual que en local

---

## Resumen de URLs Necesarias

| Servicio | Variable de Entorno en Vercel | Valor |
|----------|-------------------------------|-------|
| Backend Nutri AI | `VITE_NUTRI_AI_API_URL` | URL del backend de detección |
| Servicio RAG | `VITE_RAG_API_URL` | URL del servicio RAG |
| Supabase | `VITE_SUPABASE_URL` | URL de tu proyecto Supabase |

---

## Troubleshooting

### Error: CORS
- Verifica que la URL del frontend esté en `allow_origins` o `allow_origin_regex`
- Asegúrate de que `VITE_RAG_API_URL` esté configurada correctamente en Vercel

### Error: "GROQ_API_KEY no está configurada"
- Verifica que la variable de entorno esté configurada en el servicio de deploy
- Reinicia el servicio después de agregar la variable

### El servicio se "duerme" (Render free tier)
- Considera usar Railway o un plan de pago
- O usa un servicio de "keep-alive" como UptimeRobot

### El índice se pierde al reiniciar
- Configura volúmenes persistentes en Railway
- O usa un servicio de almacenamiento externo (S3, etc.)

---

## Costos Estimados

- **Railway**: Plan gratuito limitado, luego ~$5-20/mes
- **Render**: Plan gratuito (se duerme), luego ~$7-25/mes
- **HF Spaces**: Gratis (con límites)
- **Fly.io**: Plan gratuito limitado, luego ~$5-15/mes
- **Groq API**: Gratis (con límites generosos)

---

## Recomendación Final

Para producción, recomiendo **Railway** porque:
- Fácil de configurar
- Volúmenes persistentes incluidos
- Buena documentación
- Plan gratuito decente para empezar
