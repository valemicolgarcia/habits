"""
Detección de objetos guiada por texto con Grounding DINO (transformers).
Entrada: imagen + lista de textos (ej. ingredientes).
Salida: bounding boxes con etiqueta y score.
"""

from __future__ import annotations

from typing import Any

import torch
from PIL import Image

from detection.config import BOX_THRESHOLD, MODEL_ID, TEXT_THRESHOLD, ingredients_from_string


class GroundingDinoDetector:
    """
    Detector basado en Grounding DINO (zero-shot, sin entrenar).
    Usa el modelo de Hugging Face transformers.
    """

    def __init__(
        self,
        model_id: str | None = None,
        device: str | None = None,
    ):
        self.model_id = model_id or MODEL_ID
        self._device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self._processor = None
        self._model = None

    def load_model(self) -> None:
        """Carga el processor y el modelo (solo una vez)."""
        if self._model is not None:
            return
        from transformers import (
            AutoProcessor,
            AutoModelForZeroShotObjectDetection,
        )
        self._processor = AutoProcessor.from_pretrained(self.model_id)
        self._model = AutoModelForZeroShotObjectDetection.from_pretrained(
            self.model_id
        ).to(self._device)
        self._model.eval()

    def detect(
        self,
        image: Image.Image | str,
        text_prompts: list[str] | str | None = None,
        box_threshold: float | None = None,
        text_threshold: float | None = None,
    ) -> list[dict[str, Any]]:
        """
        Detecta objetos en la imagen según los textos (ej. ingredientes).

        Args:
            image: PIL Image o ruta a archivo.
            text_prompts: Lista de frases o string separado por comas (ej. "rice, lentils, tomato").
                          Si es None, se usa la lista por defecto de config.
            box_threshold: Umbral de confianza de la caja (0–1). Default: config.BOX_THRESHOLD.
            text_threshold: Umbral de alineación texto-imagen (0–1). Default: config.TEXT_THRESHOLD.

        Returns:
            Lista de dicts con "label", "box" [x0,y0,x1,y1], "score".
        """
        self.load_model()
        if isinstance(image, str):
            image = Image.open(image).convert("RGB")

        if text_prompts is None:
            from detection.config import INGREDIENTS_LIST
            text_prompts = INGREDIENTS_LIST
        elif isinstance(text_prompts, str):
            text_prompts = ingredients_from_string(text_prompts)

        if not text_prompts:
            return []

        # Un prompt por imagen: todas las categorías en una lista por imagen
        text_labels = [text_prompts]
        inputs = self._processor(
            images=image,
            text=text_labels,
            return_tensors="pt",
        ).to(self._model.device)

        with torch.no_grad():
            outputs = self._model(**inputs)

        # target_sizes = (height, width) de la imagen original
        target_sizes = torch.tensor([[image.height, image.width]])
        results = self._processor.post_process_grounded_object_detection(
            outputs,
            inputs["input_ids"],
            threshold=box_threshold or BOX_THRESHOLD,
            text_threshold=text_threshold or TEXT_THRESHOLD,
            target_sizes=target_sizes,
        )

        out: list[dict[str, Any]] = []
        result = results[0]
        labels_raw = result.get("text_labels", result.get("labels", []))
        boxes = result["boxes"]
        scores = result["scores"]
        for i, (box, score) in enumerate(zip(boxes, scores)):
            raw = labels_raw[i] if i < len(labels_raw) else "object"
            if hasattr(raw, "cpu"):
                raw = raw.cpu()
            if hasattr(raw, "item"):
                idx = int(raw.item()) if raw.numel() == 1 else 0
                label_str = text_prompts[idx] if 0 <= idx < len(text_prompts) else "object"
            else:
                label_str = str(raw).strip() if raw else "object"
            out.append({
                "label": label_str,
                "box": box.cpu().tolist(),
                "score": float(score.cpu().item()),
            })
        return out
