"""
Servidor FastAPI del microservicio RAG.

Expone POST /chat para consultas sobre nutrición y entrenamiento basadas en
documentos PDF en ./data_source, con historial de conversación para preguntas de seguimiento.
"""

from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from ai_engine import chat as rag_chat

app = FastAPI(
    title="RAG Nutrición y Entrenamiento",
    description=(
        "API de consultas sobre nutrición y entrenamiento usando RAG (LlamaIndex). "
        "Lee PDFs desde ./data_source y responde con historial de conversación."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_origin_regex=r"^https://[\w-]+\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatMessage(BaseModel):
    """Un mensaje del historial de chat (usuario o asistente)."""
    role: str = Field(..., description="'user' o 'assistant'")
    content: str = Field(..., description="Contenido del mensaje")


class ChatRequest(BaseModel):
    """Cuerpo del POST /chat."""
    message: str = Field(..., description="Pregunta o mensaje del usuario")
    chat_history: list[ChatMessage] | None = Field(
        default_factory=list,
        description="Historial previo de la conversación para preguntas de seguimiento",
    )


class ChatResponse(BaseModel):
    """Respuesta del asistente RAG."""
    response: str = Field(..., description="Respuesta generada por la IA")


@app.get("/")
def root():
    return {
        "message": "RAG Nutrición y Entrenamiento",
        "docs": "/docs",
        "health": "/health",
        "chat": "POST /chat",
    }


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse)
def post_chat(body: ChatRequest):
    """
    Envía un mensaje y recibe la respuesta del asistente basada en los documentos RAG.
    Incluye chat_history para mantener contexto y permitir preguntas de seguimiento.
    """
    if not (body.message or "").strip():
        raise HTTPException(status_code=400, detail="El mensaje no puede estar vacío.")

    history = None
    if body.chat_history:
        history = [{"role": m.role, "content": m.content} for m in body.chat_history]

    try:
        response_text = rag_chat(message=body.message.strip(), chat_history=history)
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en el motor RAG: {e}")

    return ChatResponse(response=response_text)
