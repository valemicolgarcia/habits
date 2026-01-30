# Detección de ingredientes (Grounding DINO)

Pipeline de detección de objetos guiado por texto, sin entrenar modelos. Usado por la API en `main.py`.

## Uso desde código

```python
from detection.grounding_dino import GroundingDinoDetector
from detection.config import INGREDIENTS_LIST

detector = GroundingDinoDetector()
detector.load_model()

detections = detector.detect(
    image="plato.jpg",
    text_prompts=INGREDIENTS_LIST,  # o lista propia / string separado por comas
    box_threshold=0.30,
    text_threshold=0.25,
)
# detections = [ {"label": "...", "box": [x0,y0,x1,y1], "score": 0.9}, ... ]
```

## Umbrales

- **box_threshold** (0.0–1.0): confianza mínima del bounding box. ~0.30 por defecto.
- **text_threshold** (0.0–1.0): alineación texto-imagen. ~0.25 por defecto.

Variables de entorno: `GROUNDING_DINO_BOX_THRESHOLD`, `GROUNDING_DINO_TEXT_THRESHOLD`.

## Integración en API

La API (`main.py`) usa este módulo en `POST /detect`: carga el modelo una vez y devuelve lista de ingredientes con score y opcionalmente `box`.
