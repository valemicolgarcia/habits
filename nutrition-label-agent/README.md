# Nutrition Label Agent

Microservicio FastAPI con LangGraph para análisis de etiquetas nutricionales. Analiza imágenes de etiquetas, clasifica el nivel de procesamiento (NOVA 1-4) y busca alternativas saludables si es necesario.

## Características

- **Análisis de Etiquetas**: Usa Gemini 1.5 Flash para analizar imágenes de etiquetas nutricionales
- **Clasificación NOVA**: Identifica el nivel de procesamiento (1-4)
- **Búsqueda Inteligente**: Si es ultraprocesado, busca alternativas saludables usando Tavily
- **Arquitectura LangGraph**: Flujo de decisión basado en el estado del análisis

## Requisitos

- Python 3.10+
- API keys de Google Gemini y Tavily

## Instalación

1. **Instalar dependencias**:
   ```bash
   pip install -r requirements.txt
   ```

2. **Configurar variables de entorno**:
   ```bash
   cp .env.example .env
   # Editar .env y agregar tus API keys
   ```

## Uso

### Desarrollo local

```bash
uvicorn main:app --host 0.0.0.0 --port 8002 --reload
```

### Endpoints

- `POST /analyze-label`: Analiza una imagen de etiqueta nutricional
- `GET /health`: Health check
- `GET /docs`: Documentación Swagger UI

## Arquitectura

- `nodes.py`: Funciones de los nodos del grafo (Analyzer, Searcher, Finalizer)
- `graph.py`: Definición del StateGraph y edges condicionales
- `main.py`: FastAPI con endpoints y manejo de imágenes
- `models.py`: Modelos Pydantic para request/response
