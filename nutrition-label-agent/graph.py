"""
Definición del grafo LangGraph para el agente de análisis nutricional.
"""
from typing import Literal
from langgraph.graph import StateGraph, END
from nodes import AgentState, analyzer_node, searcher_node, finalizer_node


def should_search(state: AgentState) -> Literal["search", "finalize"]:
    """
    Edge condicional: Decide si buscar alternativas o ir directamente a finalizar.
    """
    analysis = state.get("analysis", {})
    es_ultraprocesado = analysis.get("es_ultraprocesado", False)
    
    if es_ultraprocesado:
        return "search"
    return "finalize"


def create_nutrition_agent_graph():
    """
    Crea y configura el grafo del agente nutricional.
    
    Flujo:
    1. Analyzer -> analiza la imagen con Gemini
    2. Edge condicional -> si es ultraprocesado, va a Searcher; si no, a Finalizer
    3. Searcher -> busca alternativas con Tavily (solo si es ultraprocesado)
    4. Finalizer -> consolida toda la información
    """
    workflow = StateGraph(AgentState)
    
    # Agregar nodos
    workflow.add_node("analyzer", analyzer_node)
    workflow.add_node("searcher", searcher_node)
    workflow.add_node("finalizer", finalizer_node)
    
    # Definir flujo
    workflow.set_entry_point("analyzer")
    
    # Edge condicional después del analyzer
    workflow.add_conditional_edges(
        "analyzer",
        should_search,
        {
            "search": "searcher",
            "finalize": "finalizer",
        }
    )
    
    # Después del searcher, siempre va al finalizer
    workflow.add_edge("searcher", "finalizer")
    
    # El finalizer termina el flujo
    workflow.add_edge("finalizer", END)
    
    return workflow.compile()


# Instancia global del grafo compilado
nutrition_agent_graph = None


def get_nutrition_agent_graph():
    """Obtiene o crea la instancia del grafo del agente."""
    global nutrition_agent_graph
    if nutrition_agent_graph is None:
        nutrition_agent_graph = create_nutrition_agent_graph()
    return nutrition_agent_graph
