---
title: RAG Nutrición y Entrenamiento
emoji: 💪
colorFrom: green
colorTo: blue
sdk: docker
pinned: false
license: mit
---

# RAG Service: Nutrición y Entrenamiento

Microservicio FastAPI con LlamaIndex para consultas técnicas sobre nutrición y entrenamiento usando RAG (Retrieval-Augmented Generation).

## 🚀 Características

- **RAG con LlamaIndex**: Responde preguntas usando documentos PDF como contexto
- **Modelo LLM**: Groq (Llama 3.1) - Gratis y rápido
- **Historial de conversación**: Soporta preguntas de seguimiento
- **Persistencia**: El índice se guarda para evitar re-indexar en cada reinicio
- **Sin PDFs**: Funciona con conocimiento general del LLM si no hay documentos

## 📡 API Endpoints

### POST /chat
Envía un mensaje y recibe respuesta basada en RAG.

**Request**:
```json
{
  "message": "¿Cuántas proteínas necesito al día?",
  "chat_history": []
}
```

**Response**:
```json
{
  "response": "La recomendación general es..."
}
```

### GET /health
Verifica el estado del servicio.

### GET /docs
Documentación interactiva de la API (Swagger UI).

## ⚙️ Configuración

### Variables Secretas (Settings → Variables and secrets)

- `GROQ_API_KEY`: Tu API key de Groq (obtener en https://console.groq.com/keys)

## 📁 Agregar PDFs (Opcional)

1. Sube tus PDFs en la carpeta `data_source/` del Space
2. El servicio los indexará automáticamente en el próximo reinicio
3. Las respuestas usarán el contenido de los PDFs como contexto

## 🔗 Uso desde Frontend

Configura la URL de este Space en tu aplicación frontend:

```env
VITE_RAG_API_URL=https://TU_USUARIO-rag-nutricion-entrenamiento.hf.space
```

## 📚 Documentación

- API Docs: `/docs` (Swagger UI)
- Health Check: `/health`

---

Desarrollado con ❤️ usando FastAPI, LlamaIndex y Groq.
