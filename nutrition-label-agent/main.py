"""
Microservicio FastAPI para análisis de etiquetas nutricionales usando LangGraph.
"""
import base64
import os
from io import BytesIO
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from PIL import Image

from models import NutritionalResponse
from graph import get_nutrition_agent_graph

# Cargar .env desde la carpeta del proyecto (nutrition-label-agent)
_env_path = Path(__file__).resolve().parent / ".env"
load_dotenv(dotenv_path=_env_path)

app = FastAPI(
    title="Nutrition Label Agent API",
    description=(
        "API para análisis de etiquetas nutricionales usando LangGraph. "
        "Analiza imágenes de etiquetas, clasifica NOVA y busca alternativas saludables."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
    ],
    allow_origin_regex=r"^https://[\w-]+\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/bmp"}


def image_to_base64(image: Image.Image) -> str:
    """Convierte una imagen PIL a base64 string."""
    buffered = BytesIO()
    # Convertir a RGB si es necesario
    if image.mode != "RGB":
        image = image.convert("RGB")
    image.save(buffered, format="JPEG", quality=95)
    img_bytes = buffered.getvalue()
    return base64.b64encode(img_bytes).decode("utf-8")


@app.get("/")
async def root():
    return {
        "message": "Nutrition Label Agent API",
        "description": "Analiza etiquetas nutricionales con LangGraph y Gemini",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    # Verificar que las API keys estén configuradas
    google_key = os.getenv("GOOGLE_API_KEY")
    tavily_key = os.getenv("TAVILY_API_KEY")
    
    status = "ok"
    details = {}
    
    if not google_key:
        status = "error"
        details["google_api_key"] = "missing"
    else:
        details["google_api_key"] = "configured"
    
    if not tavily_key:
        status = "warning"
        details["tavily_api_key"] = "missing"
    else:
        details["tavily_api_key"] = "configured"
    
    return {
        "status": status,
        "details": details,
    }


@app.post("/analyze-label", response_model=NutritionalResponse)
async def analyze_label(file: UploadFile = File(...)):
    """
    Analiza una imagen de etiqueta nutricional.
    
    El flujo del agente:
    1. Analyzer: Analiza la imagen con Gemini 1.5 Flash
    2. Edge condicional: Si es ultraprocesado, busca alternativas
    3. Searcher: Busca alternativas saludables con Tavily (solo si es necesario)
    4. Finalizer: Consolida toda la información en el formato final
    """
    # Validar tipo de archivo
    if file.content_type and file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Tipo de archivo no válido. Se requiere una imagen (JPEG, PNG, WebP o BMP). Recibido: {file.content_type}",
        )
    
    try:
        # Leer y validar imagen
        contents = await file.read()
        if not contents:
            raise HTTPException(status_code=400, detail="El archivo está vacío.")
        
        # Convertir a PIL Image
        try:
            image = Image.open(BytesIO(contents)).convert("RGB")
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Imagen no válida o corrupta: {str(e)}",
            )
        
        # Convertir a base64 para el agente
        image_base64 = image_to_base64(image)
        
        # Inicializar estado del agente
        initial_state = {
            "image_data": image_base64,
            "analysis": {},
            "search_results": "",
            "final_report": {},
        }
        
        # Ejecutar el grafo del agente
        try:
            graph = get_nutrition_agent_graph()
            result = graph.invoke(initial_state)
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error al ejecutar el agente: {str(e)}",
            )
        
        # Obtener reporte final
        final_report = result.get("final_report", {})
        
        if not final_report:
            raise HTTPException(
                status_code=500,
                detail="El agente no generó un reporte final.",
            )
        
        # Validar y retornar respuesta
        try:
            response = NutritionalResponse(**final_report)
            return response
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error al validar la respuesta: {str(e)}. Reporte: {final_report}",
            )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error inesperado: {str(e)}",
        )


if __name__ == "__main__":
    import uvicorn
    # Puerto 7860 para HF Spaces, 8002 para desarrollo local, o PORT desde variables de entorno
    port = int(os.getenv("PORT", 8002))
    uvicorn.run(app, host="0.0.0.0", port=port)
