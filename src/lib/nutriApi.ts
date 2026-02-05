/**
 * Cliente para la API de detección de ingredientes (nutri-ai-backend).
 * Detecta ingredientes en fotos de comida y devuelve imagen segmentada + lista.
 */

const API_BASE = import.meta.env.VITE_NUTRI_AI_API_URL || 'http://localhost:8000'

export type MealCategory = 'breakfast' | 'lunch' | 'snack' | 'dinner'

export interface DetectedIngredient {
  label: string
  score: number
  box: number[] | null
}

export interface DetectionResponse {
  ingredients: DetectedIngredient[]
}

/** MLOps: ítem corregido por el usuario (label + box opcional para detección). */
export interface CorrectedIngredientItem {
  label: string
  box: number[] | null
}

/** Payload para enviar una corrección human-in-the-loop. */
export interface CorrectionPayload {
  detected: { label: string }[]
  corrected: CorrectedIngredientItem[]
}

/**
 * Mapeo inglés -> español para ingredientes del modelo (alineado con backend detection/config.py).
 */
export const INGREDIENT_ES: Record<string, string> = {
  rice: 'arroz',
  'white rice': 'arroz blanco',
  'brown rice': 'arroz integral',
  lentils: 'lentejas',
  chickpeas: 'garbanzos',
  beans: 'porotos',
  peas: 'arvejas',
  lettuce: 'lechuga',
  tomato: 'tomate',
  'cherry tomato': 'tomate cherry',
  potato: 'papa',
  'sweet potato': 'batata',
  pumpkin: 'calabaza',
  'french fries': 'papas fritas',
  'mashed potatoes': 'puré de papa',
  bread: 'pan',
  'whole wheat bread': 'pan integral',
  tortilla: 'tortilla',
  wrap: 'wrap',
  pasta: 'pasta',
  'whole wheat pasta': 'pasta integral',
  egg: 'huevo',
  'boiled egg': 'huevo duro',
  'fried egg': 'huevo frito',
  beef: 'carne de vaca',
  chicken: 'pollo',
  pork: 'cerdo',
  fish: 'pescado',
  tuna: 'atún',
  salmon: 'salmón',
  cheese: 'queso',
  mozzarella: 'mozzarella',
  parmesan: 'parmesano',
  'cream cheese': 'queso crema',
  avocado: 'palta',
  olives: 'aceitunas',
  carrot: 'zanahoria',
  'grated carrot': 'zanahoria rallada',
  onion: 'cebolla',
  'red onion': 'cebolla morada',
  'green onion': 'cebolla de verdeo',
  'bell pepper': 'morrón',
  'red pepper': 'pimiento rojo',
  'green pepper': 'pimiento verde',
  broccoli: 'brócoli',
  cauliflower: 'coliflor',
  spinach: 'espinaca',
  arugula: 'rúcula',
  zucchini: 'zucchini',
  eggplant: 'berenjena',
  pizza: 'pizza',
  hamburger: 'hamburguesa',
  sushi: 'sushi',
  'olive oil': 'aceite de oliva',
  butter: 'manteca',
  'peanut butter': 'manteca de maní',
  oats: 'avena',
  oatmeal: 'avena',
  banana: 'banana',
  apple: 'manzana',
  strawberry: 'frutilla',
  'ice cream': 'helado',
  cake: 'torta',
  'chocolate cake': 'torta de chocolate',
  cookies: 'galletitas',
  biscuits: 'galletas',
  croissant: 'medialuna',
  medialuna: 'medialuna',
  // Variantes que el modelo puede devolver (rice, etc.)
  'steamed rice': 'arroz',
  'cooked rice': 'arroz',
  'jasmine rice': 'arroz',
  'long grain rice': 'arroz',
}

export function translateIngredient(label: string): string {
  const key = label.toLowerCase().trim()
  if (INGREDIENT_ES[key]) return INGREDIENT_ES[key]
  // Fallback: si contiene "rice" (u otras palabras clave) mostrar en español
  if (key.includes('rice')) return 'arroz'
  return label
}

/**
 * Detecta ingredientes en la imagen y devuelve JSON con lista (label, score, box).
 * No envía categoría para que el backend devuelva todos los ingredientes detectados.
 */
export async function detectIngredients(
  file: File,
  _mealType: 'desayuno' | 'almuerzo' | 'merienda' | 'cena',
  options?: { boxThreshold?: number; textThreshold?: number }
): Promise<DetectionResponse> {
  const params = new URLSearchParams()
  if (options?.boxThreshold != null) params.set('box_threshold', String(options.boxThreshold))
  if (options?.textThreshold != null) params.set('text_threshold', String(options.textThreshold))

  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`${API_BASE}/detect?${params}`, {
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
 * Detecta ingredientes y devuelve la imagen con segmentación (JPEG).
 * No envía categoría para que el backend devuelva todos los ingredientes detectados.
 */
export async function detectIngredientsImage(
  file: File,
  _mealType: 'desayuno' | 'almuerzo' | 'merienda' | 'cena',
  options?: { boxThreshold?: number; textThreshold?: number }
): Promise<Blob> {
  const params = new URLSearchParams()
  if (options?.boxThreshold != null) params.set('box_threshold', String(options.boxThreshold))
  if (options?.textThreshold != null) params.set('text_threshold', String(options.textThreshold))

  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`${API_BASE}/detect/image?${params}`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `Error ${res.status}`)
  }
  return res.blob()
}

/**
 * MLOps: envía una corrección human-in-the-loop al backend.
 * Solo se guarda si consent === true.
 * @param imageFile - Archivo de imagen del plato
 * @param detected - Ingredientes que devolvió el modelo (solo label)
 * @param corrected - Ingredientes corregidos por el usuario (label + box opcional)
 * @param consent - Debe ser true para que el backend persista
 */
export async function sendCorrection(
  imageFile: File,
  detected: { label: string }[],
  corrected: CorrectedIngredientItem[],
  consent: boolean
): Promise<{ ok: boolean; image_id: string }> {
  if (!consent) {
    throw new Error('Se requiere consentimiento para enviar la corrección.')
  }
  const formData = new FormData()
  formData.append('file', imageFile)
  formData.append('detected_ingredients', JSON.stringify(detected))
  formData.append('corrected_ingredients', JSON.stringify(corrected))
  formData.append('consent', consent ? 'true' : 'false')

  const res = await fetch(`${API_BASE}/corrections`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || `Error ${res.status}`)
  }
  return res.json()
}
