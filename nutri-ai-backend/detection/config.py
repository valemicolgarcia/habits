"""
Configuración del pipeline de detección de ingredientes con Grounding DINO.
Prompts en inglés (modelo vision-language, sin entrenamiento).
"""

import os

# Modelo Grounding DINO (Hugging Face)
MODEL_ID = os.environ.get("GROUNDING_DINO_MODEL_ID", "IDEA-Research/grounding-dino-tiny")

# Lista base de ingredientes visibles (en inglés) para usar como prompt.
# Solo ingredientes visuales, no recetas abstractas.
INGREDIENTS_LIST = [
    "beef", "chicken", "pork", "fish", "tuna", "salmon",
    "egg", "boiled egg", "fried egg",
    "lentils", "chickpeas", "beans", "peas",
    "rice", "white rice", "brown rice",
    "pasta", "whole wheat pasta",
    "bread", "whole wheat bread", "tortilla", "wrap",
    "oats", "oatmeal", "flour", "breadcrumbs",
    "potato", "sweet potato", "pumpkin",
    "french fries", "mashed potatoes",
    "lettuce", "tomato", "cherry tomato",
    "onion", "red onion", "green onion",
    "carrot", "grated carrot",
    "bell pepper", "red pepper", "green pepper",
    "zucchini", "eggplant",
    "spinach", "arugula",
    "broccoli", "cauliflower",
    "avocado", "olives",
    "cheese", "mozzarella", "parmesan", "cream cheese",
    "butter", "peanut butter", "olive oil",
    "banana", "apple", "strawberry",
    "pizza", "hamburger", "sushi",
    "cookies", "biscuits", "cake", "chocolate cake",
    "croissant", "medialuna", "ice cream",
]

# Prompt como string separado por comas (para API o documentación).
INGREDIENTS_PROMPT_STR = ", ".join(INGREDIENTS_LIST)

DEFAULT_INGREDIENTS = INGREDIENTS_LIST


def ingredients_from_string(prompt_str: str) -> list[str]:
    """
    Convierte un string de ingredientes separados por comas en lista.
    Útil para que la API reciba un prompt personalizado.
    """
    if not prompt_str or not prompt_str.strip():
        return INGREDIENTS_LIST
    return [s.strip() for s in prompt_str.split(",") if s.strip()]


# Umbrales iniciales (box ≈ 0.3, text ≈ 0.25)
BOX_THRESHOLD = float(os.environ.get("GROUNDING_DINO_BOX_THRESHOLD", "0.30"))
TEXT_THRESHOLD = float(os.environ.get("GROUNDING_DINO_TEXT_THRESHOLD", "0.25"))

# Mapeo inglés -> español (opcional, para mostrar al usuario)
LABEL_ES = {
    "rice": "arroz", "white rice": "arroz blanco", "brown rice": "arroz integral",
    "lentils": "lentejas", "chickpeas": "garbanzos", "beans": "porotos", "peas": "arvejas",
    "lettuce": "lechuga", "tomato": "tomate", "cherry tomato": "tomate cherry",
    "potato": "papa", "sweet potato": "batata", "pumpkin": "calabaza",
    "french fries": "papas fritas", "mashed potatoes": "puré de papa",
    "bread": "pan", "tortilla": "tortilla", "wrap": "wrap",
    "pasta": "pasta", "whole wheat pasta": "pasta integral",
    "egg": "huevo", "boiled egg": "huevo duro", "fried egg": "huevo frito",
    "beef": "carne de vaca", "chicken": "pollo", "pork": "cerdo",
    "fish": "pescado", "tuna": "atún", "salmon": "salmón",
    "cheese": "queso", "mozzarella": "mozzarella", "parmesan": "parmesano",
    "avocado": "palta", "olives": "aceitunas",
    "carrot": "zanahoria", "onion": "cebolla", "bell pepper": "morrón",
    "broccoli": "brócoli", "cauliflower": "coliflor", "spinach": "espinaca",
    "pizza": "pizza", "hamburger": "hamburguesa", "sushi": "sushi",
    "ice cream": "helado", "cake": "torta", "chocolate cake": "torta de chocolate",
    "croissant": "medialuna", "medialuna": "medialuna",
}
