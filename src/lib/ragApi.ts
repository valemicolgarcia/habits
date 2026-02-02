/**
 * Cliente para la API RAG de nutrición y entrenamiento.
 * Permite hacer preguntas técnicas basadas en documentos PDF con historial de conversación.
 */

const API_BASE = import.meta.env.VITE_RAG_API_URL || 'http://localhost:8001'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatRequest {
  message: string
  chat_history?: ChatMessage[]
}

export interface ChatResponse {
  response: string
}

/**
 * Envía un mensaje al asistente RAG y recibe la respuesta.
 * Incluye chat_history para mantener contexto y permitir preguntas de seguimiento.
 */
export async function chatRAG(
  message: string,
  chatHistory: ChatMessage[] = []
): Promise<string> {
  const body: ChatRequest = {
    message,
    chat_history: chatHistory.length > 0 ? chatHistory : undefined,
  }

  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `Error ${res.status}`)
  }

  const data: ChatResponse = await res.json()
  return data.response
}
