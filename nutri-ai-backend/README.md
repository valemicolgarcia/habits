---
title: Food Ingredients Detection API
emoji: 🍽️
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
---

# Food Ingredients Detection API

API FastAPI para detectar **ingredientes visibles en fotos de platos** usando **Grounding DINO** (modelo vision-language, zero-shot). No usa Roboflow ni modelos entrenados en datasets cerrados.

## Modelo

- **Grounding DINO** (Hugging Face): detección guiada por texto (zero-shot).
- Modelo por defecto: `IDEA-Research/grounding-dino-tiny`.
- La primera petición a `/detect` descargará el modelo (se ejecuta localmente).

### Variables de entorno (opcionales)

| Variable | Descripción | Default |
|----------|-------------|---------|
| `GROUNDING_DINO_MODEL_ID` | ID del modelo en Hugging Face | `IDEA-Research/grounding-dino-tiny` |
| `GROUNDING_DINO_BOX_THRESHOLD` | Umbral de confianza del bounding box (0–1) | `0.30` |
| `GROUNDING_DINO_TEXT_THRESHOLD` | Umbral de alineación texto-imagen (0–1) | `0.25` |

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Info de la API y enlaces |
| GET | `/health` | Health check |
| GET | `/docs` | Documentación Swagger UI |
| POST | `/detect` | Sube imagen → JSON con ingredientes (label, score, opcional box) |
| POST | `/detect/image` | Sube imagen → imagen con cajas y etiquetas dibujadas (JPEG) |

### Parámetros de POST /detect

- **category** (opcional): `breakfast`, `lunch`, `snack`, `dinner` — filtra ingredientes por categoría.
- **ingredients_prompt** (opcional): ingredientes separados por comas (ej: `rice, lentils, tomato`). Si no se envía, se usa la lista base.
- **box_threshold**, **text_threshold** (opcional): umbrales del modelo (0–1).
- **include_boxes** (default `true`): incluir coordenadas de las cajas en la respuesta.

Formatos de imagen: JPEG, PNG, WebP, BMP.

## Uso local

```bash
cd nutri-ai-backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Abre **http://localhost:8000/docs** y prueba **POST /detect** con una foto de un plato.

### Probar con curl

```bash
curl -X POST "http://localhost:8000/detect" -F "file=@ruta/a/tu/foto.jpg"
```

Con categoría y umbrales:

```bash
curl -X POST "http://localhost:8000/detect?category=lunch&box_threshold=0.35" -F "file=@plato.jpg"
```

## Docker

```bash
docker build -t nutri-ai-backend .
docker run -p 7860:7860 nutri-ai-backend
```

API en **http://localhost:7860** (docs en http://localhost:7860/docs).

## Despliegue en Hugging Face Spaces

1. Crea un nuevo Space con SDK **Docker**.
2. Sube `main.py`, `detection/`, `requirements.txt`, `Dockerfile`, `README.md`.
3. El Space construirá la imagen y expondrá la API en el puerto 7860.
4. Opcional: en **Settings → Variables and secrets** puedes definir `GROUNDING_DINO_MODEL_ID`, `GROUNDING_DINO_BOX_THRESHOLD`, `GROUNDING_DINO_TEXT_THRESHOLD`.
