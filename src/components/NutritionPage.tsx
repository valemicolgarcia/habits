import { useState, useEffect, useRef } from 'react'
import { useHabits } from '../contexts/HabitsContext'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/utils'
import {
  detectIngredients,
  detectIngredientsImage,
  translateIngredient,
} from '../lib/nutriApi'
import {
  processLabel,
  type NutritionalResponse,
  NOVA_LABELS,
  getNovaColor,
  getNovaDescription,
} from '../lib/labelAnalyzerApi'
import type { Meal, MealIngredient, MealType } from '../lib/types'
import { Star, Plus, X, Loader2, History, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react'

const MEAL_TYPES: MealType[] = ['desayuno', 'almuerzo', 'merienda', 'cena']

const MEAL_LABELS: Record<MealType, string> = {
  desayuno: 'Desayuno',
  almuerzo: 'Almuerzo',
  merienda: 'Merienda',
  cena: 'Cena',
}

const SCORE_LABELS: Record<0 | 1 | 2, string> = {
  0: 'Mal',
  1: 'Regular',
  2: 'Sano',
}

interface IngredientWithConfirm {
  labelEn: string
  labelEs: string
  confirmed: boolean
  addedManually: boolean
}

interface MealFormState {
  file: File | null
  segmentedImageUrl: string | null
  ingredients: IngredientWithConfirm[]
  manualInput: string
  healthLevel: 0 | 1 | 2 | null
  starRating: number | null
  loading: boolean
  error: string | null
  isRegistering: boolean // true = usuario hizo clic en "Registrar comida" (puede anotar a mano sin foto)
}

const BUCKET_MEAL_IMAGES = 'meal-images'

interface NutritionPageProps {
  onBack: () => void
  date?: string
  onOpenHistory?: () => void
}

export default function NutritionPage({ onBack, date, onOpenHistory }: NutritionPageProps) {
  const { user } = useAuth()
  const { getDayHabits, updateNutricion, getNutritionScore, getNutritionColor } = useHabits()
  const today = formatDate(new Date())
  const selectedDate = date ?? today
  const dayHabits = getDayHabits(selectedDate)
  const [mealsFromDb, setMealsFromDb] = useState<(Meal & { ingredients?: MealIngredient[] })[]>([])
  const [loadingMeals, setLoadingMeals] = useState(true)
  const initialFormState: MealFormState = {
    file: null,
    segmentedImageUrl: null,
    ingredients: [],
    manualInput: '',
    healthLevel: null,
    starRating: null,
    loading: false,
    error: null,
    isRegistering: false,
  }
  const [forms, setForms] = useState<Record<MealType, MealFormState>>({
    desayuno: { ...initialFormState },
    almuerzo: { ...initialFormState },
    merienda: { ...initialFormState },
    cena: { ...initialFormState },
  })
  const fileInputRefs = useRef<Record<MealType, HTMLInputElement | null>>({
    desayuno: null,
    almuerzo: null,
    merienda: null,
    cena: null,
  })
  const [saveLoading, setSaveLoading] = useState<MealType | null>(null)
  const [saveSuccess, setSaveSuccess] = useState<MealType | null>(null)
  const [labelAnalysis, setLabelAnalysis] = useState<NutritionalResponse | null>(null)
  const [analyzingLabel, setAnalyzingLabel] = useState(false)
  const [labelError, setLabelError] = useState<string | null>(null)
  const labelFileInputRef = useRef<HTMLInputElement>(null)

  // Cargar comidas guardadas para la fecha seleccionada
  useEffect(() => {
    if (!user) return
    let cancelled = false
    const load = async () => {
      setLoadingMeals(true)
      const { data: mealsData, error: mealsError } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', selectedDate)
        .order('meal_type')

      if (cancelled) return
      if (mealsError) {
        setMealsFromDb([])
        setLoadingMeals(false)
        return
      }

      const mealIds = (mealsData || []).map((m) => m.id)
      if (mealIds.length === 0) {
        setMealsFromDb(mealsData || [])
        setLoadingMeals(false)
        return
      }

      const { data: ingredientsData } = await supabase
        .from('meal_ingredients')
        .select('*')
        .in('meal_id', mealIds)

      const ingredientsByMeal: Record<string, MealIngredient[]> = {}
        ; (ingredientsData || []).forEach((i) => {
          if (!ingredientsByMeal[i.meal_id]) ingredientsByMeal[i.meal_id] = []
          ingredientsByMeal[i.meal_id].push(i)
        })

      const withIngredients = (mealsData || []).map((m) => ({
        ...m,
        ingredients: ingredientsByMeal[m.id] || [],
      }))
      setMealsFromDb(withIngredients)
      setLoadingMeals(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [user, selectedDate])

  const getMealForType = (mealType: MealType) =>
    mealsFromDb.find((m) => m.meal_type === mealType)

  const getMealScoreFromHabits = (mealType: MealType): 0 | 1 | 2 | null => {
    const m = dayHabits.nutricion.find((n) => n.meal === mealType)
    return m ? m.score : null
  }

  const handleHealthScore = (mealType: MealType, score: 0 | 1 | 2) => {
    const updatedNutricion = dayHabits.nutricion.filter((m) => m.meal !== mealType)
    updatedNutricion.push({ meal: mealType, score })
    updatedNutricion.sort((a, b) => MEAL_TYPES.indexOf(a.meal) - MEAL_TYPES.indexOf(b.meal))
    updateNutricion(selectedDate, updatedNutricion)
    setForms((prev) => ({ ...prev, [mealType]: { ...prev[mealType], healthLevel: score } }))
  }

  const updateSavedMealHealth = async (mealType: MealType, newLevel: 0 | 1 | 2) => {
    const saved = getMealForType(mealType)
    if (!saved || !user) return
    const { error } = await supabase
      .from('meals')
      .update({ health_level: newLevel })
      .eq('id', saved.id)
    if (error) return
    const updatedNutricion = dayHabits.nutricion.filter((m) => m.meal !== mealType)
    updatedNutricion.push({ meal: mealType, score: newLevel })
    updatedNutricion.sort((a, b) => MEAL_TYPES.indexOf(a.meal) - MEAL_TYPES.indexOf(b.meal))
    updateNutricion(selectedDate, updatedNutricion)
    setMealsFromDb((prev) =>
      prev.map((m) =>
        m.meal_type === mealType ? { ...m, health_level: newLevel } : m
      )
    )
  }

  const handleFileSelect = async (mealType: MealType, file: File) => {
    if (!file.type.startsWith('image/')) {
      setForms((prev) => ({
        ...prev,
        [mealType]: { ...prev[mealType], error: 'Elige una imagen (JPEG, PNG, etc.)' },
      }))
      return
    }
    setForms((prev) => ({
      ...prev,
      [mealType]: {
        ...prev[mealType],
        file,
        loading: true,
        error: null,
        segmentedImageUrl: null,
        ingredients: [],
      },
    }))

    try {
      const [detection, imageBlob] = await Promise.all([
        detectIngredients(file, mealType),
        detectIngredientsImage(file, mealType),
      ])

      const segmentedUrl = URL.createObjectURL(imageBlob)
      const seenEn = new Set<string>()
      const ingredients: IngredientWithConfirm[] = detection.ingredients
        .filter((d) => {
          const key = d.label.toLowerCase().trim()
          if (seenEn.has(key)) return false
          seenEn.add(key)
          return true
        })
        .map((d) => ({
          labelEn: d.label,
          labelEs: translateIngredient(d.label),
          confirmed: true,
          addedManually: false,
        }))

      setForms((prev) => ({
        ...prev,
        [mealType]: {
          ...prev[mealType],
          loading: false,
          segmentedImageUrl: segmentedUrl,
          ingredients,
          error: null,
        },
      }))
    } catch (e) {
      setForms((prev) => ({
        ...prev,
        [mealType]: {
          ...prev[mealType],
          loading: false,
          error: e instanceof Error ? e.message : 'Error al analizar la imagen',
        },
      }))
    }
  }

  const removeIngredient = (mealType: MealType, index: number) => {
    setForms((prev) => {
      const list = prev[mealType].ingredients.filter((_, i) => i !== index)
      return { ...prev, [mealType]: { ...prev[mealType], ingredients: list } }
    })
  }

  const addManualIngredient = (mealType: MealType) => {
    const form = forms[mealType]
    const name = form.manualInput.trim()
    if (!name) return
    const key = name.toLowerCase()
    const alreadyExists = form.ingredients.some(
      (i) => i.labelEs.toLowerCase() === key
    )
    if (alreadyExists) return
    setForms((prev) => ({
      ...prev,
      [mealType]: {
        ...prev[mealType],
        ingredients: [
          ...prev[mealType].ingredients,
          { labelEn: name, labelEs: name, confirmed: true, addedManually: true },
        ],
        manualInput: '',
      },
    }))
  }

  const setStarRating = (mealType: MealType, stars: number) => {
    setForms((prev) => ({
      ...prev,
      [mealType]: { ...prev[mealType], starRating: stars },
    }))
  }

  const saveMeal = async (mealType: MealType) => {
    const form = forms[mealType]
    const effectiveHealth = form.healthLevel ?? getMealScoreFromHabits(mealType)

    if (!user) {
      setForms((prev) => ({
        ...prev,
        [mealType]: { ...prev[mealType], error: 'Debes iniciar sesión para guardar.' },
      }))
      return
    }
    if (effectiveHealth === null) {
      setForms((prev) => ({
        ...prev,
        [mealType]: { ...prev[mealType], error: 'Selecciona qué tan sana fue la comida (Sano / Regular / Mal).' },
      }))
      return
    }
    if (form.starRating === null) {
      setForms((prev) => ({
        ...prev,
        [mealType]: { ...prev[mealType], error: 'Selecciona las estrellas (cómo te cayó).' },
      }))
      return
    }

    setSaveLoading(mealType)
    setForms((prev) => ({ ...prev, [mealType]: { ...prev[mealType], error: null } }))

    let imageUrl: string | null = null
    if (form.file && form.segmentedImageUrl) {
      try {
        const blob = await fetch(form.segmentedImageUrl).then((r) => r.blob())
        const path = `${user.id}/${selectedDate}/${mealType}.jpg`
        const { error: uploadError } = await supabase.storage
          .from(BUCKET_MEAL_IMAGES)
          .upload(path, blob, { contentType: 'image/jpeg', upsert: true })
        if (uploadError) {
          console.error('Error subiendo imagen:', uploadError)
          // Seguimos guardando la comida sin imagen
        } else {
          const { data: urlData } = supabase.storage.from(BUCKET_MEAL_IMAGES).getPublicUrl(path)
          imageUrl = urlData.publicUrl
        }
      } catch (e) {
        console.error('Error al obtener blob de la imagen:', e)
        // Seguimos guardando la comida sin imagen
      }
    }

    const { data: mealRow, error: mealError } = await supabase
      .from('meals')
      .upsert(
        {
          user_id: user.id,
          date: selectedDate,
          meal_type: mealType,
          image_url: imageUrl,
          health_level: effectiveHealth,
          star_rating: form.starRating,
        },
        { onConflict: 'user_id,date,meal_type' }
      )
      .select('id')
      .maybeSingle()

    if (mealError) {
      setSaveLoading(null)
      setForms((prev) => ({
        ...prev,
        [mealType]: { ...prev[mealType], error: `Error al guardar la comida: ${mealError.message}` },
      }))
      return
    }
    if (!mealRow?.id) {
      setSaveLoading(null)
      setForms((prev) => ({
        ...prev,
        [mealType]: { ...prev[mealType], error: 'No se recibió el ID de la comida. ¿Ejecutaste la migración de Supabase (meals)?' },
      }))
      return
    }

    await supabase.from('meal_ingredients').delete().eq('meal_id', mealRow.id)

    // Incluir ingredientes del formulario + si hay texto en manualInput sin añadir, agregarlo también
    const manualText = (form.manualInput || '').trim()
    const ingredientsToSave: IngredientWithConfirm[] = [...form.ingredients]
    if (manualText) {
      const key = manualText.toLowerCase()
      if (!ingredientsToSave.some((i) => i.labelEs.toLowerCase() === key)) {
        ingredientsToSave.push({
          labelEn: manualText,
          labelEs: manualText,
          confirmed: true,
          addedManually: true,
        })
      }
    }

    if (ingredientsToSave.length > 0) {
      const { error: ingError } = await supabase.from('meal_ingredients').insert(
        ingredientsToSave.map((i) => ({
          meal_id: mealRow.id,
          ingredient_name: i.labelEs,
          confirmed: true,
          added_manually: i.addedManually,
        }))
      )
      if (ingError) {
        setSaveLoading(null)
        setForms((prev) => ({
          ...prev,
          [mealType]: { ...prev[mealType], error: `Comida guardada pero error en ingredientes: ${ingError.message}` },
        }))
        return
      }
    }

    const updatedNutricion = dayHabits.nutricion.filter((m) => m.meal !== mealType)
    updatedNutricion.push({ meal: mealType, score: effectiveHealth })
    updatedNutricion.sort((a, b) => MEAL_TYPES.indexOf(a.meal) - MEAL_TYPES.indexOf(b.meal))
    updateNutricion(selectedDate, updatedNutricion)

    setMealsFromDb((prev) => {
      const rest = prev.filter((m) => m.meal_type !== mealType)
      return [
        ...rest,
        {
          id: mealRow.id,
          user_id: user.id,
          date: selectedDate,
          meal_type: mealType,
          image_url: imageUrl,
          health_level: effectiveHealth,
          star_rating: form.starRating,
          ingredients: ingredientsToSave.map((ing, i) => ({
            id: `temp-${i}`,
            meal_id: mealRow.id,
            ingredient_name: ing.labelEs,
            confirmed: true,
            added_manually: ing.addedManually,
          })),
        },
      ].sort((a, b) => MEAL_TYPES.indexOf(a.meal_type) - MEAL_TYPES.indexOf(b.meal_type))
    })

    setForms((prev) => ({
      ...prev,
      [mealType]: {
        file: null,
        segmentedImageUrl: null,
        ingredients: [],
        manualInput: '',
        healthLevel: null,
        starRating: null,
        loading: false,
        error: null,
        isRegistering: false,
      },
    }))
    if (form.segmentedImageUrl) URL.revokeObjectURL(form.segmentedImageUrl)
    setSaveLoading(null)
    setSaveSuccess(mealType)
    setTimeout(() => setSaveSuccess(null), 3000)
  }

  const score = getNutritionScore(selectedDate)
  const color = getNutritionColor(selectedDate)

  const getColorClass = () => {
    if (color === 'green') return 'bg-green-500 dark:bg-green-600'
    if (color === 'yellow') return 'bg-yellow-500 dark:bg-yellow-600'
    if (color === 'orange') return 'bg-orange-500 dark:bg-orange-600'
    if (color === 'purple') return 'bg-purple-500 dark:bg-purple-600'
    return 'bg-red-500 dark:bg-red-600'
  }

  const handleLabelFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setLabelError('Elige una imagen (JPEG, PNG, etc.)')
      return
    }
    setAnalyzingLabel(true)
    setLabelError(null)
    setLabelAnalysis(null)
    try {
      const result = await processLabel(file)
      setLabelAnalysis(result)
    } catch (e) {
      setLabelError(e instanceof Error ? e.message : 'Error al analizar la etiqueta')
    } finally {
      setAnalyzingLabel(false)
    }
  }

  const getNovaColorClass = (categoriaNova: number) => {
    const c = getNovaColor(categoriaNova)
    if (c === 'green') return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
    if (c === 'blue') return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
    if (c === 'yellow') return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
    if (c === 'red') return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
    return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
  }

  const getScoreColorClass = (score: number) => {
    if (score >= 8) return 'text-green-600 dark:text-green-400'
    if (score >= 5) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Volver"
            >
              <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">🥗 Nutrición</h1>
            <div className="w-10" />
          </div>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Análisis de Etiqueta Nutricional */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">
            📋 Análisis de Etiqueta Nutricional
          </h3>
          <input
            ref={labelFileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleLabelFileSelect(file)
              e.target.value = ''
            }}
          />
          {!labelAnalysis && !analyzingLabel && (
            <button
              type="button"
              onClick={() => labelFileInputRef.current?.click()}
              className="w-full py-3 px-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary dark:hover:border-primary transition-colors text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary"
            >
              📷 Subir foto de etiqueta nutricional
            </button>
          )}
          {analyzingLabel && (
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 py-4">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Analizando etiqueta nutricional...</span>
            </div>
          )}
          {labelError && (
            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-400">{labelError}</p>
            </div>
          )}
          {labelAnalysis && (
            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-gray-800 dark:text-gray-100">{labelAnalysis.producto}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{labelAnalysis.analisis_critico}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setLabelAnalysis(null); setLabelError(null) }}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
                  title="Cerrar análisis"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-3 rounded-lg ${getNovaColorClass(labelAnalysis.categoria_nova)}`}>
                  <div className="text-xs font-medium mb-1">Clasificación NOVA</div>
                  <div className="text-lg font-bold">{NOVA_LABELS[labelAnalysis.categoria_nova]?.label}</div>
                  <div className="text-xs mt-1 opacity-80">{getNovaDescription(labelAnalysis.categoria_nova)}</div>
                </div>
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                  <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Score de Salud</div>
                  <div className={`text-lg font-bold ${getScoreColorClass(labelAnalysis.score_salud)}`}>{labelAnalysis.score_salud}/10</div>
                </div>
              </div>
              {labelAnalysis.ingredientes_principales && labelAnalysis.ingredientes_principales.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Ingredientes principales:</div>
                  <div className="flex flex-wrap gap-2">
                    {labelAnalysis.ingredientes_principales.map((ing, i) => (
                      <span key={i} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-700 dark:text-gray-300">{ing}</span>
                    ))}
                  </div>
                </div>
              )}
              {labelAnalysis.advertencias && labelAnalysis.advertencias.length > 0 && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="text-xs font-medium text-yellow-800 dark:text-yellow-200 mb-2">⚠️ Advertencias:</div>
                  <ul className="space-y-1">
                    {labelAnalysis.advertencias.map((adv, i) => (
                      <li key={i} className="text-sm text-yellow-700 dark:text-yellow-300">• {adv}</li>
                    ))}
                  </ul>
                </div>
              )}
              {labelAnalysis.es_ultraprocesado && labelAnalysis.alternativa_saludable && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">Alternativa saludable sugerida:</div>
                      <div className="text-sm text-green-700 dark:text-green-300">{labelAnalysis.alternativa_saludable}</div>
                      {labelAnalysis.link_alternativa && (
                        <a href={labelAnalysis.link_alternativa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 hover:underline mt-2">
                          Ver más <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={`${getColorClass()} text-white rounded-xl shadow-lg p-6 mb-6`}>
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Puntuación del día</h2>
            <div className="text-5xl font-bold mb-2">{score}/8</div>
            <p className="text-sm opacity-90">
              {score === 8 && '¡Excelente! Todo perfecto 🎉'}
              {score >= 5 && score <= 7 && 'Buen trabajo, puedes mejorar 💪'}
              {score >= 3 && score <= 4 && 'Hay espacio para mejorar 📈'}
              {score <= 2 && 'Vamos a mejorar juntos 🌱'}
            </p>
          </div>
        </div>

        {loadingMeals ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6 mb-6">
            {MEAL_TYPES.map((mealType) => {
              const saved = getMealForType(mealType)
              const form = forms[mealType]

              const currentScore = getMealScoreFromHabits(mealType)
              const healthLevel = saved ? (saved.health_level as 0 | 1 | 2) : (form.healthLevel ?? currentScore)

              return (
                <div
                  key={mealType}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 border border-gray-200 dark:border-gray-700"
                >
                  <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-3">
                    {MEAL_LABELS[mealType]}
                  </h3>

                  {/* Sano | Regular | Mal: siempre editables. Registrar comida solo si no está guardada */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {([2, 1, 0] as const).map((scoreValue) => (
                      <button
                        key={scoreValue}
                        type="button"
                        onClick={() =>
                          saved
                            ? updateSavedMealHealth(mealType, scoreValue)
                            : handleHealthScore(mealType, scoreValue)
                        }
                        className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${healthLevel === scoreValue
                          ? scoreValue === 2
                            ? 'bg-green-500 dark:bg-green-600 text-white'
                            : scoreValue === 1
                              ? 'bg-yellow-500 dark:bg-yellow-600 text-white'
                              : 'bg-red-500 dark:bg-red-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                        title={saved ? 'Cambiar (Sano/Regular/Mal)' : undefined}
                      >
                        {SCORE_LABELS[scoreValue]}
                      </button>
                    ))}
                    {!saved && (
                      <button
                        type="button"
                        onClick={() =>
                          setForms((prev) => ({
                            ...prev,
                            [mealType]: { ...prev[mealType], isRegistering: true, error: null },
                          }))
                        }
                        className="px-4 py-2 rounded-lg font-medium text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                        title="Anotar lo que comiste (con o sin foto) y guardar en el historial"
                      >
                        Registrar comida
                      </button>
                    )}
                  </div>

                  {!saved && (
                    <input
                      ref={(el) => { fileInputRefs.current[mealType] = el }}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) handleFileSelect(mealType, f)
                        e.target.value = ''
                      }}
                    />
                  )}

                  {form.loading && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analizando imagen...
                    </div>
                  )}

                  {form.error && (
                    <p className="mt-2 text-sm text-red-600 dark:text-red-400">{form.error}</p>
                  )}

                  {saved ? (
                    <>
                      {saved.image_url && (
                        <img
                          src={saved.image_url}
                          alt={MEAL_LABELS[mealType]}
                          className="w-full rounded-lg object-cover max-h-48 mt-3"
                        />
                      )}
                      {saved.star_rating != null && (
                        <div className="flex gap-0.5 mt-2">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Star
                              key={n}
                              className={`w-5 h-5 ${n <= saved.star_rating!
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-gray-300 dark:text-gray-600'
                                }`}
                            />
                          ))}
                        </div>
                      )}
                      {saved.ingredients && saved.ingredients.filter((i) => i.confirmed).length > 0 && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {saved.ingredients.filter((i) => i.confirmed).map((i) => i.ingredient_name).join(', ')}
                        </p>
                      )}
                    </>
                  ) : (form.segmentedImageUrl || form.isRegistering) ? (
                    <>
                      {form.isRegistering && !form.segmentedImageUrl && (
                        <div className="mt-3 mb-3">
                          <button
                            type="button"
                            onClick={() => fileInputRefs.current[mealType]?.click()}
                            disabled={form.loading}
                            className="text-sm text-primary hover:underline"
                          >
                            📷 Adjuntar foto (opcional) — detectar ingredientes con el modelo
                          </button>
                        </div>
                      )}
                      {form.segmentedImageUrl && (
                        <img
                          src={form.segmentedImageUrl}
                          alt="Segmentación"
                          className="w-full rounded-lg object-cover max-h-56 mt-3 mb-3"
                        />
                      )}
                      {form.segmentedImageUrl && form.ingredients.length > 0 ? (
                        <>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            ¿Comiste estos alimentos? (Sí / No). Elimina el que no corresponda para mejorar futuras respuestas.
                          </p>
                          <ul className="space-y-2 mb-3">
                            {form.ingredients.map((ing, i) => (
                              <li key={i} className="flex items-center gap-2">
                                <span className="flex-1 text-gray-800 dark:text-gray-200 text-sm">
                                  {ing.labelEs}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => removeIngredient(mealType, i)}
                                  className="p-1.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                  title="Eliminar de la lista (no lo comí)"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </li>
                            ))}
                          </ul>
                        </>
                      ) : form.segmentedImageUrl ? (
                        <p className="text-sm text-amber-600 dark:text-amber-400 mb-3">
                          No se detectaron ingredientes. Puedes agregarlos a mano abajo.
                        </p>
                      ) : null}
                      <div className="flex gap-2 mb-3">
                        <input
                          type="text"
                          value={form.manualInput}
                          onChange={(e) =>
                            setForms((prev) => ({
                              ...prev,
                              [mealType]: { ...prev[mealType], manualInput: e.target.value },
                            }))
                          }
                          placeholder={form.isRegistering && !form.segmentedImageUrl ? '¿Qué comiste? (ej: café con leche, tostadas). Se guarda al dar Guardar.' : 'Escribe un ingrediente y pulsa + para añadirlo'}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => addManualIngredient(mealType)}
                          className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        ¿Qué tan sana fue esta comida?
                      </p>
                      <div className="flex gap-2 mb-3">
                        {([2, 1, 0] as const).map((scoreValue) => (
                          <button
                            key={scoreValue}
                            type="button"
                            onClick={() => handleHealthScore(mealType, scoreValue)}
                            className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors ${form.healthLevel === scoreValue
                              ? scoreValue === 2
                                ? 'bg-green-500 dark:bg-green-600 text-white'
                                : scoreValue === 1
                                  ? 'bg-yellow-500 dark:bg-yellow-600 text-white'
                                  : 'bg-red-500 dark:bg-red-600 text-white'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                              }`}
                          >
                            {SCORE_LABELS[scoreValue]}
                          </button>
                        ))}
                      </div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        ¿Cómo te cayó? (1-5 estrellas)
                      </p>
                      <div className="flex gap-0.5 mb-3">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setStarRating(mealType, n)}
                            className="p-0.5"
                          >
                            <Star
                              className={`w-7 h-7 ${form.starRating != null && n <= form.starRating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-gray-300 dark:text-gray-600'
                                }`}
                            />
                          </button>
                        ))}
                      </div>
                      {saveSuccess === mealType && (
                        <p className="text-sm text-green-600 dark:text-green-400 font-medium mb-2">
                          ✓ Comida guardada correctamente
                        </p>
                      )}
                      {form.isRegistering && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                          Anota lo que comiste y las estrellas; se guardará en tu historial.
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => saveMeal(mealType)}
                        disabled={healthLevel === null || form.starRating === null || saveLoading === mealType}
                        className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {saveLoading === mealType ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Guardando...
                          </>
                        ) : (
                          'Guardar comida'
                        )}
                      </button>
                    </>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-1">Permitido</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Marca si tuviste un permitido este día
              </p>
            </div>
            <PermitidoToggle date={selectedDate} />
          </div>
        </div>

        {onOpenHistory && (
          <button
            type="button"
            onClick={onOpenHistory}
            className="w-full py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center gap-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <History className="w-5 h-5" />
            Historial de comidas
          </button>
        )}

        <div className="mt-6 p-4 bg-white dark:bg-gray-800 rounded-xl text-sm text-gray-600 dark:text-gray-400">
          <h4 className="font-semibold text-gray-800 dark:text-gray-100 mb-2">Sistema de puntuación</h4>
          <p><strong>Sano (2 pts):</strong> Comida balanceada y nutritiva</p>
          <p><strong>Regular (1 pt):</strong> Comida aceptable pero mejorable</p>
          <p><strong>Mal (0 pts):</strong> Comida poco saludable</p>
        </div>
      </main>
    </div>
  )
}

function PermitidoToggle({ date }: { date: string }) {
  const { getDayHabits, updateNutricionPermitido } = useHabits()
  const dayHabits = getDayHabits(date)
  const permitido = dayHabits.nutricionPermitido ?? false

  return (
    <button
      onClick={() => updateNutricionPermitido(date, !permitido)}
      className={`px-6 py-3 rounded-lg font-medium ${permitido
        ? 'bg-yellow-500 dark:bg-yellow-600 text-white'
        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
        }`}
    >
      {permitido ? 'Permitido ✓' : 'Marcar Permitido'}
    </button>
  )
}
