# Integración MLOps en el proyecto (nutri-ai + detección de ingredientes)

Este documento describe cómo se integró un flujo **human-in-the-loop (HITL)** para recolectar correcciones de usuarios sobre la detección de ingredientes (Grounding DINO) y qué conceptos de MLOps se aplican.

---

## 1. Objetivo de la integración

- **Recolectar correcciones** cuando el usuario sube una foto, el modelo detecta ingredientes y el usuario confirma, edita o agrega ingredientes (y opcionalmente dibuja o corrige cajas en la imagen).
- Construir **dos tipos de dataset** con el mismo flujo:
  - **Clasificación:** imagen + lista de ingredientes (texto). Sirve para fine-tuning de un modelo que predice “qué ingredientes hay” sin posiciones.
  - **Detección:** imagen + lista de ingredientes + **bounding boxes** por ingrediente. Sirve para fine-tuning de Grounding DINO (o otro detector).
- **Regla:** si el usuario solo edita la lista → se guarda imagen + texto (clasificación). Si además dibuja o edita cajas → se guarda imagen + texto + cajas (detección y clasificación).

---

## 2. Conceptos de MLOps utilizados

### 2.1 Human-in-the-loop (HITL)

El flujo implementado es el patrón clásico de HITL:

1. **Predicción:** el modelo (Grounding DINO) devuelve ingredientes y, opcionalmente, cajas.
2. **Revisión:** el usuario elimina falsos positivos, agrega ingredientes que faltaron y puede dibujar o corregir cajas.
3. **Persistencia:** solo si el usuario da **consentimiento**, se envía la corrección al backend y se guarda (Supabase o local).

Así se genera un dataset etiquetado por humanos a partir del uso real de la app.

### 2.2 Almacenamiento y versionado de datos (Data storage)

- **Producción:** Supabase Storage (bucket `mlops-corrections`) + tabla Postgres `ingredient_corrections`. Las imágenes y las anotaciones quedan en la nube, accesibles para futuros pipelines de evaluación o entrenamiento.
- **Desarrollo / fallback:** carpeta local `nutri-ai-backend/data/corrections/` (imágenes + `annotations.jsonl`). Si no se configuran las variables de Supabase, el backend guarda ahí.
- **Versionado:** el formato de cada registro es estable (ver más abajo); en el futuro se podría usar **DVC** u otro sistema para versionar el dataset (v1, v2) y reproducir qué datos se usaron en cada experimento.

### 2.3 Formato de anotaciones (Annotation format)

Cada corrección se guarda con un esquema claro:

- **Detectado por el modelo:** lista de `{ "label": "..." }` (sin cajas en el payload de “detected”; las cajas van en “corrected” cuando el usuario las confirma o dibuja).
- **Corregido por el usuario:** lista de `{ "label": "...", "box": [x0, y0, x1, y1] | null }`. Si el usuario no dibujó caja para ese ítem, `box` es `null`.
- **Interpretación:** un ingrediente que está en “detected” pero no en “corrected” se considera **rechazado** (falso positivo). Uno que está en “corrected” pero no en “detected” es un **agregado** (el modelo no lo detectó).

Ese formato es compatible con export a **COCO** o a herramientas como **Label Studio** para revisión o entrenamiento.

### 2.4 Gobernanza de datos (Data governance)

- **Consentimiento explícito:** no se guarda ninguna corrección si el usuario no marca el checkbox “Permitir usar esta corrección para mejorar el modelo (MLOps)”.
- En el backend se valida `consent === 'true'`; si no, se responde 400.
- En Supabase (o en el JSON local) se persiste `consent: true` solo cuando el usuario aceptó. Cualquier pipeline posterior (evaluación, entrenamiento) debe usar únicamente registros con consentimiento.

### 2.5 Pipeline de evaluación (futuro)

El dataset de correcciones sirve como **test set real**:

- Script que carga las correcciones (desde Supabase o desde el JSONL local).
- Ejecuta el modelo actual sobre esas imágenes (o usa las predicciones guardadas en “detected”).
- Compara con “corrected” y calcula métricas (precisión, recall, F1 por ingrediente o por imagen).
- Herramientas típicas: **Python** (pandas, sklearn o métricas a mano), **MLflow** para registrar cada run de evaluación (parámetros + métricas) y comparar versiones del modelo.

### 2.6 Preparación para entrenamiento (Training data pipeline)

- **Clasificación:** del mismo almacenamiento se puede exportar solo imagen + lista de labels (ignorando `box`).
- **Detección:** se exportan solo los ítem de “corrected” que tengan `box` no nulo; formato compatible con entrenamiento de detectores (ej. COCO).
- Herramientas posteriores: **Hugging Face Datasets**, **DVC**, scripts de export según el trainer que se use.

---

## 3. Arquitectura de la integración

```
[Usuario] → sube foto → [Frontend]
                           ↓
                    POST /detect (nutri-ai-backend)
                           ↓
                    [Grounding DINO] → ingredientes + cajas
                           ↓
[Usuario] → edita lista, opcionalmente dibuja/edita cajas, marca consentimiento → Guardar comida
                           ↓
                    Frontend llama POST /corrections (solo si consent = true)
                           ↓
                    [nutri-ai-backend]
                           ↓
            ¿SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY?
                    /                    \
                   sí                     no
                   ↓                      ↓
            [Supabase]              [Disco local]
            - Storage: imagen       - data/corrections/images/
            - Tabla: fila con      - data/corrections/annotations.jsonl
              detected_ingredients,
              corrected_ingredients
```

- **Frontend:** React (NutritionPage). Muestra la imagen, las cajas (IngredientBoxEditor), la lista de ingredientes, el checkbox de consentimiento y, al guardar la comida, llama a `sendCorrection()` si hay consentimiento.
- **Backend:** FastAPI. Endpoint `POST /corrections` recibe imagen (file), `detected_ingredients` (JSON), `corrected_ingredients` (JSON), `consent`. Si Supabase está configurado, sube la imagen al bucket y inserta una fila en `ingredient_corrections`; si no, escribe en disco local.

---

## 4. Archivos clave

| Componente | Archivo | Rol |
|------------|---------|-----|
| Backend: endpoint y lógica | `nutri-ai-backend/main.py` | `POST /corrections`, carga de .env, cliente Supabase, guardado en Storage + tabla o en local. |
| Backend: dependencias | `nutri-ai-backend/requirements.txt` | `supabase`, `python-dotenv`. |
| Migración Supabase | `supabase/supabase-migration-mlops-corrections.sql` | Crea la tabla `ingredient_corrections` (image_id, image_path, detected_ingredients, corrected_ingredients, consent, created_at). |
| Frontend: API | `src/lib/nutriApi.ts` | `sendCorrection()`, tipos `CorrectedIngredientItem`. |
| Frontend: editor de cajas | `src/components/IngredientBoxEditor.tsx` | Dibujo y edición de bounding boxes sobre la imagen (Pointer Events, desktop y móvil). |
| Frontend: flujo Nutrición | `src/components/NutritionPage.tsx` | Estado con `box`, consentimiento, integración del BoxEditor, llamada a `sendCorrection` al guardar. |

---

## 5. Configuración

- **Local (Supabase):** en el `.env` de la raíz (o en `nutri-ai-backend/.env`): `VITE_SUPABASE_URL` (o `SUPABASE_URL`) y `SUPABASE_SERVICE_ROLE_KEY`. El backend carga ese .env y, si ambas están definidas, guarda en Supabase.
- **Producción (Hugging Face Space):** en el Space, Settings → Variables and secrets: `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`. En Supabase: bucket `mlops-corrections` creado y migración `supabase-migration-mlops-corrections.sql` ejecutada.

Si falta la URL o la key (o falla la creación del cliente), el backend escribe en `data/corrections/` y en consola aparece `[MLOps] Guardando corrección en local`.

---

## 6. Resumen de conceptos MLOps aplicados

| Concepto | Cómo se aplica en este proyecto |
|----------|----------------------------------|
| **Human-in-the-loop** | Usuario corrige predicciones del modelo; se persisten solo con consentimiento. |
| **Data storage** | Supabase (Storage + Postgres) en producción; disco local como fallback. |
| **Annotation format** | Registro por corrección: image_id, detected, corrected (label + box opcional), consent. |
| **Data governance** | Consentimiento explícito; validación en backend; solo registros con consent en el dataset. |
| **Evaluación (futuro)** | Dataset de correcciones como test set; script de métricas; opcional MLflow. |
| **Training data pipeline** | Mismo almacenamiento sirve para export a clasificación (solo labels) o a detección (labels + boxes). |

La integración no incluye (pero es compatible con) **MLflow** para experimentos, **DVC** para versionado del dataset ni **Label Studio** como interfaz de revisión; se pueden añadir más adelante sobre esta base.
