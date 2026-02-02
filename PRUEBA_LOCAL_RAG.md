# Guía: Probar RAG Localmente

Esta guía te ayudará a probar el sistema RAG con tu aplicación frontend funcionando.

## 🚀 Inicio Rápido (Resumen)

1. **Obtén API Key**: Groq (https://console.groq.com/) o Gemini (https://aistudio.google.com/apikey)
2. **Configura Backend**: `cd rag-service` → Copia `.env.example` a `.env` → Agrega tu API key
3. **Inicia Backend**: Ejecuta `start_rag.ps1` o `start_rag.bat` (o manualmente con `uvicorn`)
4. **Configura Frontend**: Agrega `VITE_RAG_API_URL=http://localhost:8001` a tu `.env` en la raíz
5. **Inicia Frontend**: `npm run dev` (si no está corriendo)
6. **Prueba**: Abre `http://localhost:5173` y busca la barra de preguntas en el inicio

**¡Listo!** Ahora puedes hacer preguntas sobre nutrición y entrenamiento.

---

## 📋 Guía Detallada

## Paso 1: Obtener API Key (Gratis)

Elige una de estas opciones:

### Opción A: Groq (Recomendado - Más rápido)
1. Ve a https://console.groq.com/
2. Crea una cuenta (gratis)
3. Ve a "API Keys" y crea una nueva key
4. Copia la key (ej: `gsk_xxxxxxxxxxxxx`)

### Opción B: Gemini
1. Ve a https://aistudio.google.com/apikey
2. Crea una cuenta (gratis)
3. Crea una nueva API key
4. Copia la key

## Paso 2: Configurar Backend RAG

1. **Entra al directorio del servicio RAG**:
   ```bash
   cd rag-service
   ```

2. **Crea el archivo `.env`**:
   ```bash
   # En Windows PowerShell:
   Copy-Item .env.example .env
   
   # O en Git Bash/CMD:
   copy .env.example .env
   ```

3. **Edita `.env` y agrega tu API key**:
   ```env
   # Para Groq (recomendado):
   GROQ_API_KEY=tu-api-key-aqui
   
   # O para Gemini:
   # GEMINI_API_KEY=tu-api-key-aqui
   # LLM_PROVIDER=gemini
   ```

4. **Instala las dependencias Python**:
   ```bash
   # Si no tienes Python instalado, descárgalo de python.org
   # Crea un entorno virtual (recomendado):
   python -m venv venv
   
   # Activa el entorno virtual:
   # En Windows PowerShell:
   .\venv\Scripts\Activate.ps1
   # En Windows CMD:
   venv\Scripts\activate.bat
   # En Git Bash:
   source venv/Scripts/activate
   
   # Instala dependencias:
   pip install -r requirements.txt
   ```

5. **(Opcional) Agrega PDFs de prueba**:
   - Coloca archivos PDF sobre nutrición/entrenamiento en `rag-service/data_source/`
   - Si no tienes PDFs, el sistema funcionará igual pero con conocimiento general del LLM

## Paso 3: Iniciar el Servicio RAG

### Opción A: Script Automático (Windows - Más Fácil)

**PowerShell**:
```powershell
cd rag-service
.\start_rag.ps1
```

**CMD**:
```cmd
cd rag-service
start_rag.bat
```

El script automáticamente:
- Verifica que existe `.env`
- Crea el entorno virtual si no existe
- Instala dependencias si es necesario
- Inicia el servidor

### Opción B: Manual

En la terminal donde activaste el entorno virtual:

```bash
cd rag-service
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

Deberías ver:
```
INFO:     Uvicorn running on http://0.0.0.0:8001 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

**¡Mantén esta terminal abierta!** El servicio debe estar corriendo.

## Paso 4: Configurar Frontend

1. **Abre otra terminal** en la raíz del proyecto (`c:\Users\VICTUS\Documents\2026\gym`)

2. **Verifica/crea tu archivo `.env`** en la raíz del proyecto:
   ```env
   # Si ya tienes .env, agrega esta línea:
   VITE_RAG_API_URL=http://localhost:8001
   
   # Si no existe, copia desde env.example.txt y agrega la línea de arriba
   ```

3. **Inicia el frontend** (si no está corriendo):
   ```bash
   npm run dev
   ```

   Deberías ver algo como:
   ```
   VITE v5.x.x  ready in xxx ms
   ➜  Local:   http://localhost:5173/
   ```

## Paso 5: Probar la Funcionalidad

1. **Abre tu navegador** en `http://localhost:5173`

2. **Inicia sesión** en tu aplicación

3. **Ve a la página de inicio** (Home)

4. **Busca la barra de preguntas**:
   - Debe aparecer debajo de la navegación de fechas
   - Arriba de "Progreso de hoy"
   - Con el título "Pregunta sobre nutrición y entrenamiento"

5. **Haz una pregunta de prueba**:
   - Ejemplo: "¿Cuántas proteínas necesito al día?"
   - Haz clic en el botón de envío (ícono de flecha)
   - Deberías ver la respuesta aparecer

6. **Prueba preguntas de seguimiento**:
   - Después de la primera respuesta, pregunta algo relacionado
   - Ejemplo: "¿Y si hago ejercicio 5 veces por semana?"
   - El sistema debería recordar el contexto

## Solución de Problemas

### Error: "GROQ_API_KEY no está configurada"
- Verifica que el archivo `rag-service/.env` existe y tiene la key correcta
- Asegúrate de que el servicio RAG se reinició después de crear el `.env`

### Error: "Failed to fetch" en el frontend
- Verifica que el servicio RAG está corriendo en el puerto 8001
- Abre `http://localhost:8001/health` en el navegador - debería devolver `{"status":"ok"}`
- Verifica que `VITE_RAG_API_URL=http://localhost:8001` está en tu `.env` del frontend
- Reinicia el servidor de desarrollo (`npm run dev`)

### Error: CORS
- El backend ya tiene CORS configurado para `localhost:5173`
- Si usas otro puerto, edita `rag-service/main.py` y agrega tu puerto a `allow_origins`

### El servicio RAG no inicia
- Verifica que Python 3.10+ está instalado: `python --version`
- Verifica que todas las dependencias se instalaron: `pip list | grep llama-index`
- Revisa los errores en la terminal del servicio RAG

### No aparecen respuestas
- Abre la consola del navegador (F12) y revisa errores
- Verifica que el servicio RAG responde: `curl http://localhost:8001/health`
- Revisa los logs del servicio RAG en la terminal

## Verificación Rápida

Para verificar que todo está funcionando:

1. **Backend RAG**:
   ```bash
   curl http://localhost:8001/health
   # Debe devolver: {"status":"ok"}
   ```

2. **Frontend**:
   - Abre `http://localhost:5173`
   - Deberías ver la barra de preguntas en el inicio

3. **Test completo**:
   - Haz una pregunta en la barra
   - Deberías ver la respuesta aparecer

## Notas Importantes

- **Dos terminales necesarias**: Una para el backend RAG (puerto 8001) y otra para el frontend (puerto 5173)
- **Primera ejecución**: El servicio RAG indexará los PDFs la primera vez (puede tardar unos minutos)
- **Sin PDFs**: El sistema funcionará igual, pero responderá con conocimiento general del LLM
- **Historial**: El historial de conversación se mantiene durante la sesión del navegador

## Siguiente Paso

Una vez que funcione localmente, puedes:
- Agregar más PDFs a `rag-service/data_source/`
- Personalizar el modelo LLM en `rag-service/ai_engine.py`
- Desplegar el servicio RAG en producción (ver `DEPLOY_COMPLETO.md`)
