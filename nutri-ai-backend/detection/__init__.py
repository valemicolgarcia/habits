"""
Pipeline de detección de ingredientes guiado por texto (Grounding DINO).
"""

from detection.config import (
    DEFAULT_INGREDIENTS,
    INGREDIENTS_LIST,
    INGREDIENTS_PROMPT_STR,
    LABEL_ES,
    BOX_THRESHOLD,
    TEXT_THRESHOLD,
    ingredients_from_string,
)
from detection.grounding_dino import GroundingDinoDetector

__all__ = [
    "GroundingDinoDetector",
    "DEFAULT_INGREDIENTS",
    "INGREDIENTS_LIST",
    "INGREDIENTS_PROMPT_STR",
    "LABEL_ES",
    "BOX_THRESHOLD",
    "TEXT_THRESHOLD",
    "ingredients_from_string",
]
