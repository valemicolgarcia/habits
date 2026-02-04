"""
Modelos Pydantic para el agente de análisis de etiquetas nutricionales.
"""
from typing import Optional
from pydantic import BaseModel, Field


class NutritionalResponse(BaseModel):
    """Respuesta final del análisis nutricional."""
    producto: str = Field(..., description="Nombre del producto identificado")
    categoria_nova: int = Field(..., ge=1, le=4, description="Categoría NOVA (1-4)")
    es_ultraprocesado: bool = Field(..., description="Si el producto es ultraprocesado (NOVA 3-4)")
    analisis_critico: str = Field(..., description="Análisis crítico del producto")
    alternativa_saludable: Optional[str] = Field(None, description="Alternativa saludable encontrada")
    link_alternativa: Optional[str] = Field(None, description="Link a la alternativa saludable")
    score_salud: int = Field(..., ge=1, le=10, description="Score de salud del producto (1-10)")
    ingredientes_principales: Optional[list[str]] = Field(None, description="Ingredientes principales identificados")
    advertencias: Optional[list[str]] = Field(None, description="Advertencias nutricionales")


class AnalysisResult(BaseModel):
    """Resultado del análisis inicial con Gemini."""
    producto: str
    categoria_nova: int = Field(..., ge=1, le=4)
    es_ultraprocesado: bool
    ingredientes_principales: Optional[list[str]] = None
    razonamiento: Optional[str] = None
