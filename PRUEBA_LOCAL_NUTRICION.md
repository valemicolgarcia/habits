# Probar la app local (incluido el modelo de nutrición)

Necesitás **dos terminales**: una para el backend de Nutri AI (modelo de detección) y otra para el frontend. Opcional: Supabase ya configurado si querés guardar comidas.

---

## Requisitos

- **Node.js** (para el frontend)
- **Python 3.10+** (para el backend; recomendado 3.10 o 3.11)
- **~2–4 GB** libres la primera vez (descarga del modelo Grounding DINO)

---

## 1. Backend Nutri AI (modelo de ingredientes)

En la **primera terminal**:

```powershell
cd c:\Users\VICTUS\Documents\2026\gym\nutri-ai-backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

- Dejá esta terminal abierta.
- La **primera vez** que subas una foto desde la app, el backend descargará el modelo de Hugging Face (~400 MB). Puede tardar 1–2 minutos.
- API: **http://localhost:8000**  
- Docs: **http://localhost:8000/docs** (podés probar POST `/detect` con una imagen).

---

## 2. Frontend (React + Vite)

En una **segunda terminal**:

```powershell
cd c:\Users\VICTUS\Documents\2026\gym
npm install
npm run dev
```

- Abrí la URL que muestre Vite (ej. **http://localhost:5173**).
- Tu `.env` ya tiene `VITE_NUTRI_AI_API_URL=http://localhost:8000`, así que la app usará el backend local.

---

## 3. Probar el flujo de nutrición

1. Iniciá sesión en la app.
2. Entrá a **Nutrición**.
3. En cualquier comida (Desayuno, Almuerzo, etc.):
   - **Registrar comida** → subí una **foto** de un plato.
   - Si el backend está corriendo, verás los ingredientes detectados (la primera vez puede tardar mientras baja el modelo).
   - Ajustá ingredientes, elegí **Sano/Regular/Mal**, estrellas y **Guardar comida**.

Para **guardar** en la base de datos necesitás tener hecha la migración de Supabase y el bucket `meal-images` (ver `supabase/supabase-migration-nutrition-meals.sql` y el comentario del bucket). Si no configuraste Supabase, la detección con foto y la vista de ingredientes igual funcionan; solo fallará el “Guardar comida”.

---

## Resumen rápido

| Qué              | Dónde              | Comando / URL                                      |
|------------------|--------------------|----------------------------------------------------|
| Backend (modelo) | Terminal 1         | `uvicorn main:app --reload --host 0.0.0.0 --port 8000` |
| Frontend         | Terminal 2         | `npm run dev`                                      |
| API / docs       | Navegador          | http://localhost:8000/docs                         |
| App              | Navegador          | http://localhost:5173 (o el que indique Vite)      |

Si el backend no está corriendo, la app sigue funcionando pero al subir una foto verás un error de conexión; podés usar igual **ingredientes manuales** y el resto de la UI.
