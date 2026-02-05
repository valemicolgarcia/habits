# Zero-Shot Object Detection Service

**Hábitos** · Subproyecto: *PyTorch, TorchVision, Transformers, Grounding DINO, FastAPI*

---

## ¿Para qué sirve?

Permite al usuario de la app **Hábitos** subir una **foto de su comida** (plato, bandeja) y obtener de forma automática:

- Una **lista de ingredientes/alimentos detectados** en la imagen (con etiqueta en inglés, traducida a español en el frontend)
- Opcionalmente una **imagen con la segmentación** (dónde está cada ingrediente detectado)

El modelo **no está entrenado específicamente** en esas comidas: usa detección **zero-shot** guiada por texto (vision–language). Así el usuario puede “registrar comida” con foto y que la app sugiera los ingredientes para confirmar o editar antes de guardar.

---

## ¿Cómo funciona?

1. El usuario, en la sección **Nutrición** de Hábitos, elige “Registrar comida” y opcionalmente “Adjuntar foto” para una comida (desayuno, almuerzo, merienda, cena).
2. El frontend envía la imagen al microservicio **Nutri-AI Backend** (Zero-Shot Object Detection Service) en los endpoints `/detect` (solo lista de ingredientes) y/o `/detect/image` (imagen segmentada en JPEG).
3. El backend carga **Grounding DINO** (modelo de Hugging Face **Transformers**): un modelo de detección de objetos guiado por texto que puede detectar objetos descritos en lenguaje natural sin entrenamiento específico por clase.
4. Se define una lista de **categorías de ingredientes** (ej. arroz, huevo, pollo, lechuga, pan) en texto; el modelo recibe la imagen y esos textos y devuelve **bounding boxes** con etiqueta y score por cada detección.
5. Se aplican umbrales (score, NMS) y se devuelve la lista de ingredientes detectados (y, si se pidió, la imagen dibujando las cajas). El frontend traduce las etiquetas al español con un mapeo fijo y las muestra para que el usuario confirme o elimine antes de guardar la comida.

Todo el pipeline es **zero-shot**: no hace falta entrenar el modelo en “mis platos”; basta con describir en texto lo que se quiere detectar.

---

## Cómo está implementado

- **API:** **FastAPI** con endpoints `/detect` (JSON con lista de ingredientes: label, score, box) y `/detect/image` (respuesta con imagen JPEG segmentada). La imagen llega vía `multipart` o como body; se usa **Pillow** para abrirla y pasarla al modelo.
- **Modelo:** **Grounding DINO** mediante la librería **Transformers** (Hugging Face): `AutoModelForZeroShotObjectDetection` y `AutoProcessor`. El modelo se carga bajo demanda (lazy) en la primera petición y se ejecuta con **PyTorch** en CPU o GPU según disponibilidad.
- **Stack:** **PyTorch** y **TorchVision** para tensores y operaciones sobre imágenes; **Transformers** para el modelo y el processor; **Pillow** para I/O de imágenes; **FastAPI** + **Uvicorn** para el servidor; **python-multipart** para recibir archivos.
- **Configuración:** Parámetros como `BOX_THRESHOLD`, `TEXT_THRESHOLD` y el ID del modelo en Hugging Face están centralizados en `detection/config.py`; la lista de ingredientes/categorías se construye a partir de un string o lista de textos.
- **Despliegue:** Servicio Python independiente (Docker); el modelo se descarga desde Hugging Face la primera vez que se usa. El frontend usa `VITE_NUTRI_AI_API_URL` para llamar a este microservicio.

En conjunto: **PyTorch** y **TorchVision** como backend de cálculo, **Transformers** y **Grounding DINO** para la detección zero-shot, y **FastAPI** para exponer el servicio dentro de **Hábitos**.
