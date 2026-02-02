"""
Motor RAG (Retrieval-Augmented Generation) para consultas sobre nutrición y entrenamiento.

Inicializa el índice vectorial desde PDFs en ./data_source, persiste en ./storage
y expone un chat engine con historial de conversación. Usa Groq (Llama 3.1).
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

load_dotenv()

# Rutas por defecto (relativas al directorio de trabajo del servicio)
DATA_SOURCE_DIR = Path(os.getenv("RAG_DATA_SOURCE", "data_source"))
STORAGE_DIR = Path(os.getenv("RAG_STORAGE", "storage"))

# Asegurar que existan las carpetas
DATA_SOURCE_DIR.mkdir(parents=True, exist_ok=True)
STORAGE_DIR.mkdir(parents=True, exist_ok=True)


def _get_llm():
    """
    Devuelve el LLM configurado: Groq (Llama 3.1).
    Requiere GROQ_API_KEY en las variables de entorno.
    """
    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    
    if not groq_key:
        raise ValueError(
            "GROQ_API_KEY no está configurada. "
            "Configura GROQ_API_KEY en tu archivo .env"
        )
    
    try:
        from llama_index.llms.groq import Groq
    except ImportError:
        # Fallback: intentar importar desde el paquete instalado
        from llama_index_llms_groq import Groq
    return Groq(
        model="llama-3.1-8b-instant",
        api_key=groq_key,
        temperature=0.2,
    )


def _get_embed_model():
    """Modelo de embeddings local (gratuito) para el índice vectorial."""
    try:
        from llama_index.embeddings.huggingface import HuggingFaceEmbedding
    except ImportError:
        # Fallback: intentar importar desde el paquete instalado
        from llama_index_embeddings_huggingface import HuggingFaceEmbedding
    return HuggingFaceEmbedding(
        model_name="BAAI/bge-small-en-v1.5",
        trust_remote_code=True,
    )


def _load_documents():
    """Carga todos los PDFs (y otros documentos) desde data_source."""
    from llama_index.core import SimpleDirectoryReader
    from llama_index.core import Document

    if not DATA_SOURCE_DIR.exists():
        return []
    
    # Verificar si hay archivos PDF antes de intentar leerlos
    pdf_files = list(DATA_SOURCE_DIR.glob("**/*.pdf"))
    if not pdf_files:
        return []
    
    try:
        reader = SimpleDirectoryReader(
            input_dir=str(DATA_SOURCE_DIR),
            required_exts=[".pdf"],
            recursive=True,
        )
        return reader.load_data()
    except Exception as e:
        # Si hay error al leer, retornar lista vacía (se usará documento dummy)
        print(f"Advertencia al cargar documentos: {e}")
        return []


def get_or_create_index():
    """
    Carga el índice desde ./storage si existe; si no, indexa los PDFs de ./data_source
    y persiste en ./storage para no re-indexar en cada reinicio.
    """
    from llama_index.core import VectorStoreIndex, StorageContext, load_index_from_storage, Settings

    llm = _get_llm()
    embed_model = _get_embed_model()
    Settings.llm = llm
    Settings.embed_model = embed_model

    # Intentar cargar índice persistido
    if (STORAGE_DIR / "docstore.json").exists():
        try:
            storage_context = StorageContext.from_defaults(persist_dir=str(STORAGE_DIR))
            return load_index_from_storage(storage_context)
        except Exception:
            pass

    # Construir índice desde documentos
    from llama_index.core import Document

    documents = _load_documents()
    if not documents:
        # Crear un documento dummy para que el índice exista
        # El LLM responderá con su conocimiento general sobre nutrición y entrenamiento
        from llama_index.core import Document
        documents = [Document(
            text=(
                "Eres un asistente experto en nutrición y entrenamiento físico. "
                "Responde preguntas sobre nutrición, ejercicio, suplementos, rutinas de entrenamiento, "
                "y temas relacionados con la salud y el fitness usando tu conocimiento general. "
                "Proporciona respuestas útiles, precisas y basadas en principios científicos conocidos."
            )
        )]
    index = VectorStoreIndex.from_documents(documents, embed_model=embed_model)
    index.storage_context.persist(persist_dir=str(STORAGE_DIR))
    return index


def _build_memory_from_history(chat_history: list[dict[str, str]]):
    """
    Construye un ChatMemoryBuffer a partir de una lista de mensajes previos.
    Formato esperado: [ {"role": "user"|"assistant", "content": "..."}, ... ]
    """
    from llama_index.core.memory import ChatMemoryBuffer
    from llama_index.core.llms import ChatMessage, MessageRole

    memory = ChatMemoryBuffer.from_defaults()
    for msg in (chat_history or []):
        role_str = (msg.get("role") or "user").lower()
        content = msg.get("content") or ""
        if not content:
            continue
        role = MessageRole.USER if role_str == "user" else MessageRole.ASSISTANT
        memory.put(ChatMessage(role=role, content=content))
    return memory


def chat(message: str, chat_history: list[dict[str, str]] | None = None) -> str:
    """
    Responde al mensaje del usuario usando el índice RAG y el historial de conversación.
    Permite preguntas de seguimiento gracias al historial.
    """
    from llama_index.core.chat_engine import ContextChatEngine
    from llama_index.core.memory import ChatMemoryBuffer

    index = get_or_create_index()
    memory = _build_memory_from_history(chat_history or [])

    chat_engine = index.as_chat_engine(
        chat_mode="condense_plus_context",
        memory=memory,
        verbose=False,
    )
    response = chat_engine.chat(message)
    return str(response)
