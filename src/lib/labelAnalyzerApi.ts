/**
 * Cliente para la API de análisis de etiquetas nutricionales (nutrition-label-agent).
 * Analiza etiquetas nutricionales, clasifica NOVA y busca alternativas saludables.
 */

const API_BASE = import.meta.env.VITE_LABEL_ANALYZER_API_URL || 'http://localhost:8002'

export interface NutritionalResponse {
  producto: string
  categoria_nova: number // 1-4
  es_ultraprocesado: boolean
  analisis_critico: string
  alternativa_saludable: string | null
  link_alternativa: string | null
  score_salud: number // 1-10
  ingredientes_principales: string[] | null
  advertencias: string[] | null
}

export const NOVA_LABELS: Record<number, { label: string; color: string; description: string }> = {
  1: {
    label: 'NOVA 1',
    color: 'green',
    description: 'Sin procesar o mínimamente procesado',
  },
  2: {
    label: 'NOVA 2',
    color: 'blue',
    description: 'Ingrediente culinario procesado',
  },
  3: {
    label: 'NOVA 3',
    color: 'yellow',
    description: 'Alimento procesado',
  },
  4: {
    label: 'NOVA 4',
    color: 'red',
    description: 'Alimento ultraprocesado',
  },
}

/**
 * Analiza una imagen de etiqueta nutricional.
 * Devuelve información sobre el producto, clasificación NOVA, alternativas saludables y score.
 */
export async function processLabel(file: File): Promise<NutritionalResponse> {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`${API_BASE}/analyze-label`, {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `Error ${res.status}`)
  }

  return res.json()
}

/**
 * Obtiene el color de la categoría NOVA para usar en la UI.
 */
export function getNovaColor(categoriaNova: number): string {
  return NOVA_LABELS[categoriaNova]?.color || 'gray'
}

/**
 * Obtiene la descripción de la categoría NOVA.
 */
export function getNovaDescription(categoriaNova: number): string {
  return NOVA_LABELS[categoriaNova]?.description || 'Desconocido'
}
