# Deploy del Servicio Nutrition Label Analyzer

Guía para desplegar el microservicio de análisis de etiquetas nutricionales con LangGraph en producción.

---

## Resumen

El **servicio Nutrition Label Analyzer** es un microservicio separado que necesita:
- Un servicio que ejecute Docker (como Railway, Render, Fly.io, Hugging Face Spaces)
- Variables de entorno: `GOOGLE_API_KEY` y `TAVILY_API_KEY`
- Opcional: `GEMINI_MODEL` (por defecto usa `gemini-2.5-flash-lite`)

---

## Opciones de Deploy

### Opción A: Railway (Recomendado - Más fácil)

1. **Crear cuenta en Railway**: [railway.app](https://railway.app)

2. **Nuevo proyecto desde GitHub**:
   - Conecta tu repositorio
   - Selecciona el directorio `nutrition-label-agent` como **Root Directory**

3. **Configurar variables de entorno**:
   - En Railway → Variables:
     - `GOOGLE_API_KEY`: tu API key de Google Gemini
     - `TAVILY_API_KEY`: tu API key de Tavily
     - `GEMINI_MODEL`: (opcional) `gemini-2.5-flash-lite` por defecto

4. **Deploy**:
   - Railway detecta el Dockerfile automáticamente
   - Te dará una URL tipo: `https://nutrition-label-agent-production-xxxx.up.railway.app`

**Nota**: Railway tiene un plan gratuito limitado. Para producción, considera un plan de pago.

---

### Opción B: Render

1. **Crear cuenta en Render**: [render.com](https://render.com)

2. **Nuevo Web Service**:
   - Conecta tu repositorio
   - **Root Directory**: `nutrition-label-agent`
   - **Environment**: Docker
   - **Build Command**: (dejar vacío, usa Dockerfile)
   - **Start Command**: (dejar vacío, usa CMD del Dockerfile)

3. **Variables de entorno**:
   - `GOOGLE_API_KEY`: tu API key de Google Gemini
   - `TAVILY_API_KEY`: tu API key de Tavily
   - `GEMINI_MODEL`: (opcional) `gemini-2.5-flash-lite` por defecto

4. **Deploy**:
   - Render construye la imagen Docker
   - Te da una URL tipo: `https://nutrition-label-agent-xxxx.onrender.com`

**Nota**: Render tiene un plan gratuito pero el servicio se "duerme" después de inactividad. Para producción, considera un plan de pago.

---

### Opción C: Hugging Face Spaces (Gratis)

1. **Crear Space en Hugging Face**: [huggingface.co/spaces](https://huggingface.co/spaces)

2. **Configuración**:
   - **SDK**: Docker (no Gradio)
   - **Nombre**: `nutrition-label-analyzer` (o el que prefieras)

3. **Subir archivos**:
   - `main.py`
   - `graph.py`
   - `nodes.py`
   - `models.py`
   - `requirements.txt`
   - `Dockerfile`
   - `.env.example` (para referencia)

4. **Variables secretas**:
   - En Settings → Variables and secrets:
     - `GOOGLE_API_KEY`: tu API key de Google Gemini
     - `TAVILY_API_KEY`: tu API key de Tavily
     - `GEMINI_MODEL`: (opcional) `gemini-2.5-flash-lite` por defecto

5. **Deploy**:
   - HF Spaces construye automáticamente
   - URL: `https://TU_USUARIO-nutrition-label-analyzer.hf.space`

**Nota**: HF Spaces es gratis pero tiene límites de recursos. Para producción con mucho tráfico, considera Railway o Render.

---

### Opción D: Fly.io

1. **Instalar Fly CLI**: [fly.io/docs/getting-started/installing-flyctl](https://fly.io/docs/getting-started/installing-flyctl)

2. **Login y crear app**:
   ```bash
   fly auth login
   cd nutrition-label-agent
   fly launch
   ```

3. **Configurar variables**:
   ```bash
   fly secrets set GOOGLE_API_KEY=tu-google-api-key
   fly secrets set TAVILY_API_KEY=tu-tavily-api-key
   fly secrets set GEMINI_MODEL=gemini-2.5-flash-lite  # opcional
   ```

4. **Deploy**:
   ```bash
   fly deploy
   ```

5. **URL**: `https://TU_APP_NAME.fly.dev`

---

## Configurar CORS para Producción

El servicio ya tiene CORS configurado para `*.vercel.app`. Si usas otro dominio, actualiza `nutrition-label-agent/main.py`:

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

Una vez que tengas la URL del servicio desplegado:

1. **En Vercel → Settings → Environment Variables**:
   - **Name**: `VITE_LABEL_ANALYZER_API_URL`
   - **Value**: la URL de tu servicio (sin barra final)
     - Railway: `https://nutrition-label-agent-production-xxxx.up.railway.app`
     - Render: `https://nutrition-label-agent-xxxx.onrender.com`
     - HF Spaces: `https://TU_USUARIO-nutrition-label-analyzer.hf.space`
     - Fly.io: `https://TU_APP_NAME.fly.dev`
   - Marca **Production**, **Preview** y **Development**

2. **Redeploy**:
   - Ve a Deployments → ... → Redeploy
   - Esto asegura que el build tome la nueva variable

---

## Verificación Post-Deploy

1. **Health check**:
   ```bash
   curl https://TU_URL_LABEL_ANALYZER/health
   ```
   Debería devolver:
   ```json
   {
     "status": "ok",
     "details": {
       "google_api_key": "configured",
       "tavily_api_key": "configured"
     }
   }
   ```

2. **Probar análisis**:
   ```bash
   curl -X POST https://TU_URL_LABEL_ANALYZER/analyze-label \
     -F "file=@ruta/a/tu/etiqueta.jpg"
   ```

3. **En el frontend**:
   - Ve a tu app en Vercel
   - Prueba subir una imagen de etiqueta nutricional
   - Debería funcionar igual que en local

---

## Resumen de URLs Necesarias

| Servicio | Variable de Entorno en Vercel | Valor |
|----------|-------------------------------|-------|
| Backend Nutri AI | `VITE_NUTRI_AI_API_URL` | URL del backend de detección |
| Servicio RAG | `VITE_RAG_API_URL` | URL del servicio RAG |
| Label Analyzer | `VITE_LABEL_ANALYZER_API_URL` | URL del servicio de análisis de etiquetas |
| Supabase | `VITE_SUPABASE_URL` | URL de tu proyecto Supabase |

---

## Obtener API Keys

### Google Gemini API Key

1. Ve a [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Crea una nueva API key
3. Cópiala y úsala como `GOOGLE_API_KEY`

**Nota**: El modelo por defecto (`gemini-2.5-flash-lite`) es gratuito con límites generosos. Si tienes problemas de cuota, puedes cambiar a `gemini-2.5-flash` o `gemini-2.0-flash-lite`.

### Tavily API Key

1. Ve a [tavily.com](https://tavily.com)
2. Crea una cuenta y obtén tu API key
3. Cópiala y úsala como `TAVILY_API_KEY`

**Nota**: Tavily tiene un plan gratuito con límites. Para producción con mucho tráfico, considera un plan de pago.

---

## Troubleshooting

### Error: CORS
- Verifica que la URL del frontend esté en `allow_origins` o `allow_origin_regex`
- Asegúrate de que `VITE_LABEL_ANALYZER_API_URL` esté configurada correctamente en Vercel

### Error: "GOOGLE_API_KEY no está configurada"
- Verifica que la variable de entorno esté configurada en el servicio de deploy
- Reinicia el servicio después de agregar la variable

### Error: "TAVILY_API_KEY no está configurada"
- Verifica que la variable de entorno esté configurada en el servicio de deploy
- El servicio funcionará pero no buscará alternativas si el producto es ultraprocesado

### Error: "Error al parsear respuesta JSON de Gemini"
- Verifica que la imagen sea válida (JPEG, PNG, WebP o BMP)
- Revisa los logs del servicio para ver la respuesta completa de Gemini
- Puede ser que Gemini devuelva un formato inesperado; revisa los logs

### El servicio se "duerme" (Render free tier)
- Considera usar Railway o un plan de pago
- O usa un servicio de "keep-alive" como UptimeRobot

### Error: "Modelo no disponible" o problemas de cuota
- Verifica que `GEMINI_MODEL` esté configurado correctamente
- Prueba cambiar a `gemini-2.5-flash-lite` (gratis) o `gemini-2.5-flash`
- Revisa tu cuota en [aistudio.google.com](https://aistudio.google.com)

---

## Costos Estimados

- **Railway**: Plan gratuito limitado, luego ~$5-20/mes
- **Render**: Plan gratuito (se duerme), luego ~$7-25/mes
- **HF Spaces**: Gratis (con límites)
- **Fly.io**: Plan gratuito limitado, luego ~$5-15/mes
- **Google Gemini**: Gratis con límites generosos (`gemini-2.5-flash-lite`)
- **Tavily**: Plan gratuito con límites, luego ~$20-50/mes según uso

---

## Recomendación Final

Para producción, recomiendo **Railway** porque:
- Fácil de configurar
- Buena documentación
- Plan gratuito decente para empezar
- No se "duerme" como Render

---

## Flujo Completo del Deploy

1. ✅ Desplegar `nutrition-label-agent` en Railway/Render/HF Spaces
2. ✅ Configurar variables de entorno (`GOOGLE_API_KEY`, `TAVILY_API_KEY`)
3. ✅ Obtener la URL del servicio desplegado
4. ✅ Agregar `VITE_LABEL_ANALYZER_API_URL` en Vercel
5. ✅ Redeploy del frontend en Vercel
6. ✅ Probar subiendo una etiqueta nutricional en producción

¡Listo! Tu servicio de análisis de etiquetas nutricionales estará funcionando en producción. 🎉
