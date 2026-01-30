"""
Microservicio FastAPI para detección de ingredientes visibles en fotos de comida.
Usa Grounding DINO (vision-language, zero-shot) con prompts de texto.
No usa Roboflow ni modelos entrenados en datasets cerrados.
"""
from __future__ import annotations

import io
import os

from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from PIL import Image, ImageDraw, ImageFont
from pydantic import BaseModel

from detection.config import (
    BOX_THRESHOLD,
    INGREDIENTS_LIST,
    TEXT_THRESHOLD,
    ingredients_from_string,
)

_detector = None

# Máxima fracción del área de la imagen que puede ocupar una caja (evita falsos positivos tipo "medialuna").
MAX_BOX_AREA_RATIO = 0.45

# Categorías de comida: cada clave tiene una lista de etiquetas (labels) que pertenecen a esa categoría.
# Las etiquetas están en inglés (como devuelve el modelo).
MEAL_CATEGORIES = {
    "breakfast": [
        "egg", "boiled egg", "fried egg",
        "oats", "oatmeal", "bread", "whole wheat bread", "tortilla", "wrap",
        "croissant", "medialuna",
        "banana", "apple", "strawberry",
        "butter", "peanut butter", "cream cheese",
        "avocado",
    ],
    "lunch": [
        "rice", "white rice", "brown rice",
        "pasta", "whole wheat pasta",
        "lentils", "chickpeas", "beans", "peas",
        "beef", "chicken", "pork", "fish", "tuna", "salmon",
        "lettuce", "tomato", "cherry tomato",
        "onion", "red onion", "green onion",
        "carrot", "grated carrot",
        "bell pepper", "red pepper", "green pepper",
        "zucchini", "eggplant",
        "spinach", "arugula",
        "broccoli", "cauliflower",
        "potato", "sweet potato", "pumpkin",
        "french fries", "mashed potatoes",
        "avocado", "olives",
        "cheese", "mozzarella", "parmesan",
        "olive oil",
    ],
    "snack": [
        "bread", "whole wheat bread", "tortilla", "wrap",
        "cookies", "biscuits", "cake", "chocolate cake",
        "croissant", "medialuna", "ice cream",
        "banana", "apple", "strawberry",
        "peanut butter", "cream cheese",
        "avocado", "olives",
    ],
    "dinner": [
        "rice", "white rice", "brown rice",
        "pasta", "whole wheat pasta",
        "lentils", "chickpeas", "beans", "peas",
        "beef", "chicken", "pork", "fish", "tuna", "salmon",
        "lettuce", "tomato", "cherry tomato",
        "onion", "red onion", "green onion",
        "carrot", "grated carrot",
        "bell pepper", "red pepper", "green pepper",
        "zucchini", "eggplant",
        "spinach", "arugula",
        "broccoli", "cauliflower",
        "potato", "sweet potato", "pumpkin",
        "french fries", "mashed potatoes",
        "avocado", "olives",
        "cheese", "mozzarella", "parmesan",
        "pizza", "hamburger", "sushi",
        "olive oil",
    ],
}


def _normalize_label(label: str, ingredients_list: list[str]) -> str:
    """
    Si el modelo devuelve etiquetas concatenadas ("chickpeas beans whole wheat pasta"),
    devuelve el primer ingrediente de la lista que aparezca en la etiqueta.
    Orden de lista: así "rice" matchea antes que "mashed potatoes" en "rice white mashed potatoes".
    """
    label_lower = label.lower().strip()
    label_words = set(label_lower.split())
    for ing in ingredients_list:
        ing_lower = ing.lower()
        if ing_lower in label_lower:
            return ing
        ing_words = set(ing_lower.split())
        if ing_words and ing_words <= label_words:
            return ing
    return label


def _is_box_too_large(box: list[float], image_width: int, image_height: int) -> bool:
    """True si la caja ocupa más de MAX_BOX_AREA_RATIO del área de la imagen (falso positivo)."""
    x0, y0, x1, y1 = box
    w = max(0, x1 - x0)
    h = max(0, y1 - y0)
    box_area = w * h
    image_area = image_width * image_height
    if image_area <= 0:
        return False
    return box_area / image_area > MAX_BOX_AREA_RATIO


def _draw_detections(image: Image.Image, ingredients: list["DetectedIngredient"]) -> Image.Image:
    """Dibuja cajas y etiquetas (label + score) sobre la imagen. Devuelve una copia."""
    img = image.copy()
    draw = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("arial.ttf", size=max(14, img.width // 50))
    except (OSError, IOError):
        font = ImageFont.load_default()
    for ing in ingredients:
        if ing.box is None or len(ing.box) != 4:
            continue
        x0, y0, x1, y1 = [int(round(x)) for x in ing.box]
        draw.rectangle([x0, y0, x1, y1], outline="lime", width=max(2, img.width // 300))
        text = f"{ing.label} {ing.score:.2f}"
        bbox = draw.textbbox((x0, y0), text, font=font)
        draw.rectangle(bbox, fill="green")
        draw.text((x0, y0 - 2), text, fill="white", font=font)
    return img


def get_detector():
    """Carga Grounding DINO una sola vez (singleton). Solo al primer /detect."""
    global _detector
    if _detector is None:
        from detection.grounding_dino import GroundingDinoDetector
        _detector = GroundingDinoDetector()
        _detector.load_model()
    return _detector


app = FastAPI(
    title="Food Ingredients Detection API",
    description=(
        "Detección de ingredientes visibles en fotos de platos con Grounding DINO. "
        "Recibe una imagen y devuelve lista de ingredientes detectados con score. "
        "El usuario puede corregir manualmente los resultados después."
    ),
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_origin_regex=r"^https://[\w-]+\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class DetectedIngredient(BaseModel):
    """Un ingrediente detectado con su confianza."""
    label: str
    score: float
    box: list[float] | None = None  # [x0, y0, x1, y1] para corrección manual en UI


class DetectionResponse(BaseModel):
    """Lista de ingredientes detectados (solo visibles, sin recetas)."""
    ingredients: list[DetectedIngredient]


ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/bmp"}


@app.get("/")
async def root():
    return {
        "message": "Food Ingredients Detection API",
        "model": "Grounding DINO (vision-language, zero-shot)",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/detect", response_model=DetectionResponse)
async def detect_ingredients(
    file: UploadFile = File(...),
    category: str | None = Query(
        None,
        description="Filtrar por categoría: breakfast, lunch, snack, dinner. Si no se envía, se devuelven todas las detecciones.",
    ),
    ingredients_prompt: str | None = Query(
        None,
        description="Ingredientes como string separado por comas (ej: rice, lentils, tomato). Si no se envía, se usa la lista base.",
    ),
    box_threshold: float | None = Query(
        None,
        description="Umbral de confianza de la caja (0-1). Default 0.3.",
    ),
    text_threshold: float | None = Query(
        None,
        description="Umbral de alineación texto-imagen (0-1). Default 0.25.",
    ),
    include_boxes: bool = Query(
        True,
        description="Incluir coordenadas de las cajas para que el usuario corrija en la UI.",
    ),
):
    """
    Recibe una imagen de un plato y devuelve los ingredientes visibles detectados con score.
    Si se envía category (breakfast, lunch, snack, dinner), solo se incluyen ingredientes de esa categoría.
    Usa Grounding DINO con prompts de texto (no entrenamiento).
    El usuario puede corregir manualmente los resultados después.
    """
    if category is not None and category not in MEAL_CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail=f"Categoría inválida: {category}. Valores permitidos: {list(MEAL_CATEGORIES.keys())}",
        )
    if file.content_type and file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Archivo no válido: se requiere una imagen (JPEG, PNG, WebP o BMP). Recibido: {file.content_type}",
        )

    try:
        contents = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al leer el archivo: {str(e)}")

    if not contents:
        raise HTTPException(status_code=400, detail="El archivo está vacío.")

    try:
        image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Imagen no válida o corrupta. No se pudo procesar: {str(e)}",
        )

    # Prompt: lista por defecto o string separado por comas
    text_prompts = ingredients_from_string(ingredients_prompt) if ingredients_prompt else INGREDIENTS_LIST

    try:
        detector = get_detector()
        raw = detector.detect(
            image,
            text_prompts=text_prompts,
            box_threshold=box_threshold or BOX_THRESHOLD,
            text_threshold=text_threshold or TEXT_THRESHOLD,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error en la detección: {str(e)}",
        )

    w, h = image.size
    ingredients = []
    for d in raw:
        box = d["box"]
        if _is_box_too_large(box, w, h):
            continue
        label = _normalize_label(d["label"], text_prompts)
        ingredients.append(
            DetectedIngredient(
                label=label,
                score=round(d["score"], 4),
                box=box if include_boxes else None,
            )
        )

    if category is not None:
        allowed_labels = set(MEAL_CATEGORIES[category])
        ingredients = [i for i in ingredients if i.label in allowed_labels]

    return DetectionResponse(ingredients=ingredients)


@app.post("/detect/image", response_class=Response)
async def detect_ingredients_image(
    file: UploadFile = File(...),
    category: str | None = Query(
        None,
        description="Filtrar por categoría: breakfast, lunch, snack, dinner.",
    ),
    ingredients_prompt: str | None = Query(
        None,
        description="Ingredientes como string separado por comas (ej: rice, lentils, tomato).",
    ),
    box_threshold: float | None = Query(None, description="Umbral de confianza de la caja (0-1)."),
    text_threshold: float | None = Query(None, description="Umbral de alineación texto-imagen (0-1)."),
):
    """
    Recibe una imagen de un plato, detecta ingredientes y devuelve la misma imagen
    con las cajas y etiquetas dibujadas (segmentación visual como antes).
    """
    if category is not None and category not in MEAL_CATEGORIES:
        raise HTTPException(
            status_code=400,
            detail=f"Categoría inválida: {category}. Valores permitidos: {list(MEAL_CATEGORIES.keys())}",
        )
    if file.content_type and file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Archivo no válido: se requiere una imagen (JPEG, PNG, WebP o BMP). Recibido: {file.content_type}",
        )

    try:
        contents = await file.read()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error al leer el archivo: {str(e)}")

    if not contents:
        raise HTTPException(status_code=400, detail="El archivo está vacío.")

    try:
        image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Imagen no válida o corrupta. No se pudo procesar: {str(e)}",
        )

    text_prompts = ingredients_from_string(ingredients_prompt) if ingredients_prompt else INGREDIENTS_LIST

    try:
        detector = get_detector()
        raw = detector.detect(
            image,
            text_prompts=text_prompts,
            box_threshold=box_threshold or BOX_THRESHOLD,
            text_threshold=text_threshold or TEXT_THRESHOLD,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error en la detección: {str(e)}",
        )

    w, h = image.size
    ingredients = []
    for d in raw:
        box = d["box"]
        if _is_box_too_large(box, w, h):
            continue
        label = _normalize_label(d["label"], text_prompts)
        ingredients.append(
            DetectedIngredient(
                label=label,
                score=round(d["score"], 4),
                box=box,
            )
        )

    if category is not None:
        allowed_labels = set(MEAL_CATEGORIES[category])
        ingredients = [i for i in ingredients if i.label in allowed_labels]

    img_with_boxes = _draw_detections(image, ingredients)
    buf = io.BytesIO()
    img_with_boxes.save(buf, format="JPEG", quality=90)
    buf.seek(0)
    return Response(content=buf.getvalue(), media_type="image/jpeg")
