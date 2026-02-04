"""
Nodos del grafo LangGraph para análisis de etiquetas nutricionales.
"""
import json
import base64
import os
from io import BytesIO
from pathlib import Path
from typing import TypedDict
from PIL import Image

from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI

# Asegurar que .env se cargue desde esta carpeta (por si main no se cargó antes)
load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env")
from langchain_community.tools.tavily_search import TavilySearchResults
from langchain_core.messages import HumanMessage

from models import AnalysisResult


class AgentState(TypedDict):
    """Estado del agente durante el procesamiento."""
    image_data: str  # Base64 de la imagen
    analysis: dict  # Resultado del análisis inicial
    search_results: str  # Resultados de búsqueda (si aplica)
    final_report: dict  # Reporte final consolidado


def get_gemini_model():
    """Inicializa el modelo Gemini (vision para análisis de imágenes)."""
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY no está configurada en las variables de entorno")
    # Free tier: gemini-2.0-flash suele tener cuota 0. Usar 2.5-flash-lite o 2.5-flash.
    # Opciones: gemini-2.5-flash-lite (recomendado free), gemini-2.5-flash, gemini-2.0-flash-lite
    model_name = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite")
    return ChatGoogleGenerativeAI(
        model=model_name,
        google_api_key=api_key,
        temperature=0.3,
    )


def get_tavily_tool():
    """Inicializa la herramienta de búsqueda Tavily."""
    api_key = os.getenv("TAVILY_API_KEY")
    if not api_key:
        raise ValueError("TAVILY_API_KEY no está configurada en las variables de entorno")
    return TavilySearchResults(
        max_results=8,
        tavily_api_key=api_key,
    )


def analyzer_node(state: AgentState) -> AgentState:
    """
    Nodo Analyzer: Analiza la imagen de la etiqueta con Gemini (modelo con visión).
    Devuelve JSON con producto, categoria_nova, es_ultraprocesado.
    """
    try:
        model = get_gemini_model()
        
        # Convertir base64 a imagen para Gemini
        image_bytes = base64.b64decode(state["image_data"])
        image = Image.open(BytesIO(image_bytes))
        
        # Prompt para análisis nutricional
        prompt = """Analiza esta imagen de una etiqueta nutricional y devuelve un JSON con la siguiente estructura:

{
  "producto": "nombre del producto",
  "categoria_nova": 1-4,
  "es_ultraprocesado": true/false,
  "ingredientes_principales": ["ingrediente1", "ingrediente2", ...],
  "razonamiento": "breve explicación de por qué es NOVA X"
}

Clasificación NOVA:
- NOVA 1: Alimentos sin procesar o mínimamente procesados (frutas frescas, verduras, carnes frescas, etc.)
- NOVA 2: Ingredientes culinarios procesados (aceites, sal, azúcar, miel, etc.)
- NOVA 3: Alimentos procesados (panes, quesos, conservas simples, etc.)
- NOVA 4: Alimentos ultraprocesados (productos con muchos aditivos, conservantes, edulcorantes artificiales, etc.)

Un producto es ultraprocesado (es_ultraprocesado: true) si es NOVA 3 o NOVA 4.

Responde SOLO con el JSON, sin texto adicional."""

        # Crear mensaje con imagen para Gemini
        # langchain_google_genai acepta imágenes en formato base64 data URI
        from langchain_core.messages import HumanMessage
        
        # Crear mensaje multimodal para Gemini
        # El formato correcto es usar image_url con url que contiene el data URI
        message = HumanMessage(
            content=[
                {"type": "text", "text": prompt},
                {
                    "type": "image_url",
                    "image_url": f"data:image/jpeg;base64,{state['image_data']}",
                },
            ]
        )
        
        response = model.invoke([message])
        response_text = response.content.strip()
        
        # Limpiar respuesta si tiene markdown
        if response_text.startswith("```json"):
            response_text = response_text.replace("```json", "").replace("```", "").strip()
        elif response_text.startswith("```"):
            response_text = response_text.replace("```", "").strip()
        
        # Parsear JSON
        analysis_data = json.loads(response_text)
        
        # Validar estructura
        analysis_result = AnalysisResult(**analysis_data)
        
        return {
            **state,
            "analysis": analysis_result.model_dump(),
        }
    except json.JSONDecodeError as e:
        response_text = locals().get("response_text", "No disponible")
        raise ValueError(f"Error al parsear respuesta JSON de Gemini: {e}. Respuesta recibida: {response_text}")
    except Exception as e:
        raise ValueError(f"Error en el nodo Analyzer: {str(e)}")


def _is_explanatory_page(title: str, url: str, content: str) -> bool:
    """
    True si la página es explicativa (NOVA, guías, enciclopedias), NO un alimento/producto.
    Solo deben pasar resultados que sean alimentos concretos o recetas.
    """
    t = (title + " " + url + " " + (content or "")[:300]).lower()
    # Cualquier mención a clasificación NOVA / escala NOVA / Open Food Facts como guía
    if "clasificación nova" in t or "clasificacion nova" in t:
        return True
    if "nova scale" in t or "escala nova" in t:
        return True
    if "open food facts" in t and ("nova" in t or "clasificación" in t or "clasificacion" in t):
        return True
    if "qué es nova" in t or "que es nova" in t or "qué es la nova" in t:
        return True
    if "wikipedia" in url:
        return True
    # Guías genéricas, no productos
    if "guía " in t and ("nova" in t or "ultraprocesado" in t):
        return True
    if "guia " in t and ("nova" in t or "ultraprocesado" in t):
        return True
    return False


def _looks_like_food_or_recipe(title: str, content: str) -> bool:
    """True si el resultado parece un alimento, producto o receta concreta."""
    t = (title + " " + (content or "")[:200]).lower()
    # Palabras que suelen indicar producto/receta real
    food_hints = (
        "receta", "recetas", "comprar", "producto", "marca", "ingredientes",
        "cómo hacer", "como hacer", "alternativa a", "sustituto", "sustituir",
        "en lugar de", "opción saludable", "versión casera", "versión natural"
    )
    return any(h in t for h in food_hints)


def searcher_node(state: AgentState) -> AgentState:
    """
    Nodo Searcher: Busca alternativas que sean ALIMENTOS o recetas concretas.
    Excluye siempre páginas explicativas (NOVA, guías, enciclopedias).
    """
    try:
        analysis = state["analysis"]
        producto = analysis.get("producto", "producto")
        tool = get_tavily_tool()

        def search_and_filter(query: str):
            results = tool.invoke({"query": query})
            alternatives = []
            for result in results:
                title = result.get("title", "")
                url = result.get("url", "")
                content = result.get("content", "")
                if not url or not title:
                    continue
                if _is_explanatory_page(title, url, content or ""):
                    continue
                alternatives.append({
                    "titulo": title,
                    "url": url,
                    "descripcion": content[:200] if content else "",
                })
            return alternatives

        # Búsqueda 1: sustituto / alternativa como alimento o producto
        alternatives = search_and_filter(
            f"alimento sustituto de {producto} opción más saludable natural"
        )
        # Búsqueda 2 si faltan resultados: recetas o productos concretos
        if len(alternatives) < 3:
            extra = search_and_filter(
                f"receta casera o producto natural similar a {producto} menos procesado"
            )
            seen_urls = {a["url"] for a in alternatives}
            for alt in extra:
                if alt["url"] not in seen_urls:
                    alternatives.append(alt)
                    seen_urls.add(alt["url"])
                    if len(alternatives) >= 3:
                        break

        # Priorizar resultados que parezcan alimento/receta
        alternatives.sort(
            key=lambda a: (1 if _looks_like_food_or_recipe(a["titulo"], a["descripcion"]) else 0),
            reverse=True,
        )
        alternatives = alternatives[:3]

        # Extraer solo el nombre de un alimento (sin enlaces): usar Gemini para derivar 1 nombre
        search_results_text = ""
        if alternatives:
            listado = "\n".join([
                f"- {alt['titulo']}. {alt['descripcion'][:120]}"
                for alt in alternatives
            ])
            prompt = f"""Producto analizado: {producto}.

Resultados de búsqueda de alternativas:
{listado}

De lo anterior, extrae ÚNICAMENTE el nombre de un alimento o producto concreto que sea una alternativa más saludable (ej: "Yogur natural", "Pan integral", "Frutas frescas"). Responde en una sola línea, solo el nombre del alimento, sin enlaces ni explicaciones."""
            try:
                model = get_gemini_model()
                resp = model.invoke([prompt])
                nombre = (resp.content or "").strip().strip('"')
                if nombre and len(nombre) < 120:
                    search_results_text = nombre
                else:
                    search_results_text = alternatives[0]["titulo"].split("|")[0].split("-")[0].strip()[:80]
            except Exception:
                search_results_text = alternatives[0]["titulo"].split("|")[0].split("-")[0].strip()[:80]
        else:
            search_results_text = ""

        return {
            **state,
            "search_results": search_results_text,
        }
    except Exception as e:
        return {
            **state,
            "search_results": "",
        }


def finalizer_node(state: AgentState) -> AgentState:
    """
    Nodo Finalizer: Consolida toda la información en el formato final.
    """
    try:
        analysis = state["analysis"]
        search_results = state.get("search_results", "")
        
        producto = analysis.get("producto", "Producto desconocido")
        categoria_nova = analysis.get("categoria_nova", 4)
        es_ultraprocesado = analysis.get("es_ultraprocesado", True)
        ingredientes = analysis.get("ingredientes_principales", [])
        razonamiento = analysis.get("razonamiento", "")
        
        # Generar análisis crítico
        analisis_critico = f"Producto clasificado como NOVA {categoria_nova}. "
        if razonamiento:
            analisis_critico += razonamiento + " "
        
        if es_ultraprocesado:
            analisis_critico += "Este producto es considerado ultraprocesado debido a su alto nivel de procesamiento y posible presencia de aditivos artificiales. "
            if ingredientes:
                analisis_critico += f"Ingredientes principales: {', '.join(ingredientes[:5])}. "
        else:
            analisis_critico += "Este producto tiene un nivel de procesamiento bajo o moderado. "
            if ingredientes:
                analisis_critico += f"Ingredientes principales: {', '.join(ingredientes[:5])}. "
        
        # Calcular score de salud (1-10)
        # NOVA 1-2: 8-10, NOVA 3: 5-7, NOVA 4: 1-4
        if categoria_nova == 1:
            score_salud = 10
        elif categoria_nova == 2:
            score_salud = 8
        elif categoria_nova == 3:
            score_salud = 6
        else:  # NOVA 4
            score_salud = 3
        
        # Ajustar score según ingredientes problemáticos
        ingredientes_texto = " ".join(ingredientes).lower() if ingredientes else ""
        if any(word in ingredientes_texto for word in ["conservante", "edulcorante artificial", "colorante", "saborizante artificial"]):
            score_salud = max(1, score_salud - 2)
        
        # Alternativa = solo nombre del alimento (sin enlace a página)
        alternativa_saludable = (search_results.strip() or None) if (es_ultraprocesado and search_results) else None
        link_alternativa = None  # No derivar a ninguna página; solo mostrar el alimento
        
        # Generar advertencias
        advertencias = []
        if es_ultraprocesado:
            advertencias.append("Producto ultraprocesado - consumo ocasional recomendado")
        if categoria_nova == 4:
            advertencias.append("Alto nivel de procesamiento - revisar lista de ingredientes")
        if any(word in ingredientes_texto for word in ["azúcar", "jarabe", "sirope", "edulcorante"]):
            advertencias.append("Alto contenido de azúcares o edulcorantes")
        
        final_report = {
            "producto": producto,
            "categoria_nova": categoria_nova,
            "es_ultraprocesado": es_ultraprocesado,
            "analisis_critico": analisis_critico.strip(),
            "alternativa_saludable": alternativa_saludable,
            "link_alternativa": link_alternativa,
            "score_salud": score_salud,
            "ingredientes_principales": ingredientes[:10] if ingredientes else [],
            "advertencias": advertencias if advertencias else None,
        }
        
        return {
            **state,
            "final_report": final_report,
        }
    except Exception as e:
        raise ValueError(f"Error en el nodo Finalizer: {str(e)}")
