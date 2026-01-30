import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useHabits } from '../contexts/HabitsContext'
import { supabase } from '../lib/supabase'
import type { Meal, MealIngredient, MealType } from '../lib/types'
import { Star, ChevronLeft, ChevronRight, Pencil, Plus, X, Loader2 } from 'lucide-react'

const MEAL_TYPES_ORDER: MealType[] = ['desayuno', 'almuerzo', 'merienda', 'cena']

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

interface MealWithIngredients extends Meal {
  ingredients?: MealIngredient[]
}

interface NutritionHistoryProps {
  onBack: () => void
  refreshKey?: number
}

export default function NutritionHistory({ onBack, refreshKey = 0 }: NutritionHistoryProps) {
  const { user } = useAuth()
  const { getDayHabits, updateNutricion } = useHabits()
  const [days, setDays] = useState<{ date: string; meals: MealWithIngredients[] }[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [editingMeal, setEditingMeal] = useState<MealWithIngredients | null>(null)
  const [editForm, setEditForm] = useState<{
    healthLevel: 0 | 1 | 2
    starRating: number
    ingredients: string[]
    manualInput: string
  } | null>(null)
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const PAGE_SIZE = 7

  const openEdit = (meal: MealWithIngredients) => {
    setEditingMeal(meal)
    setEditForm({
      healthLevel: meal.health_level as 0 | 1 | 2,
      starRating: meal.star_rating ?? 3,
      ingredients: (meal.ingredients || []).map((i) => i.ingredient_name),
      manualInput: '',
    })
    setSaveError(null)
  }

  const closeEdit = () => {
    setEditingMeal(null)
    setEditForm(null)
    setSaveError(null)
  }

  const removeEditIngredient = (index: number) => {
    if (!editForm) return
    setEditForm({
      ...editForm,
      ingredients: editForm.ingredients.filter((_, i) => i !== index),
    })
  }

  const addEditIngredient = () => {
    if (!editForm) return
    const name = editForm.manualInput.trim()
    if (!name) return
    if (editForm.ingredients.some((i) => i.toLowerCase() === name.toLowerCase())) return
    setEditForm({
      ...editForm,
      ingredients: [...editForm.ingredients, name],
      manualInput: '',
    })
  }

  const updateMealHealthOnly = async (meal: MealWithIngredients, newLevel: 0 | 1 | 2) => {
    const { error } = await supabase
      .from('meals')
      .update({ health_level: newLevel })
      .eq('id', meal.id)
    if (error) return
    const dateStr = typeof meal.date === 'string' ? meal.date.slice(0, 10) : String(meal.date).slice(0, 10)
    const dayHabits = getDayHabits(dateStr)
    const updatedNutricion = dayHabits.nutricion.filter((m) => m.meal !== meal.meal_type)
    updatedNutricion.push({ meal: meal.meal_type as MealType, score: newLevel })
    updatedNutricion.sort((a, b) => MEAL_TYPES_ORDER.indexOf(a.meal) - MEAL_TYPES_ORDER.indexOf(b.meal))
    updateNutricion(dateStr, updatedNutricion)
    await loadHistory()
  }

  const saveEdit = async () => {
    if (!user || !editingMeal || !editForm) return
    setSaveLoading(true)
    setSaveError(null)
    const { error: mealError } = await supabase
      .from('meals')
      .update({
        health_level: editForm.healthLevel,
        star_rating: editForm.starRating,
      })
      .eq('id', editingMeal.id)

    if (mealError) {
      setSaveError(mealError.message)
      setSaveLoading(false)
      return
    }

    await supabase.from('meal_ingredients').delete().eq('meal_id', editingMeal.id)
    if (editForm.ingredients.length > 0) {
      const { error: ingError } = await supabase.from('meal_ingredients').insert(
        editForm.ingredients.map((name) => ({
          meal_id: editingMeal.id,
          ingredient_name: name,
          confirmed: true,
          added_manually: true,
        }))
      )
      if (ingError) {
        setSaveError(ingError.message)
        setSaveLoading(false)
        return
      }
    }

    const dateStr = typeof editingMeal.date === 'string' ? editingMeal.date.slice(0, 10) : String(editingMeal.date).slice(0, 10)
    const dayHabits = getDayHabits(dateStr)
    const updatedNutricion = dayHabits.nutricion.filter((m) => m.meal !== editingMeal.meal_type)
    updatedNutricion.push({ meal: editingMeal.meal_type as MealType, score: editForm.healthLevel })
    updatedNutricion.sort((a, b) => MEAL_TYPES_ORDER.indexOf(a.meal) - MEAL_TYPES_ORDER.indexOf(b.meal))
    updateNutricion(dateStr, updatedNutricion)

    await loadHistory()
    setSaveLoading(false)
    closeEdit()
  }

  const loadHistory = async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('meals')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .range(0, 200)

    if (error) {
      setDays([])
      setLoading(false)
      return
    }

    const mealIds = (data || []).map((m) => m.id)
    if (mealIds.length === 0) {
      setDays([])
      setLoading(false)
      return
    }

    const { data: ingredientsData } = await supabase
      .from('meal_ingredients')
      .select('*')
      .in('meal_id', mealIds)

    const ingredientsByMeal: Record<string, MealIngredient[]> = {}
    ;(ingredientsData || []).forEach((i) => {
      if (!ingredientsByMeal[i.meal_id]) ingredientsByMeal[i.meal_id] = []
      ingredientsByMeal[i.meal_id].push(i)
    })

    const mealsWithIngredients = (data || []).map((m) => ({
      ...m,
      date: typeof m.date === 'string' ? m.date.slice(0, 10) : m.date,
      ingredients: ingredientsByMeal[m.id] || [],
    })) as MealWithIngredients[]

    const byDate = groupMealsByDate(mealsWithIngredients)
    setDays(byDate)
    setLoading(false)
  }

  useEffect(() => {
    loadHistory()
  }, [user, refreshKey])

  const paginatedDays = days.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(days.length / PAGE_SIZE)

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
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">📋 Historial de comidas</h1>
            <button
              type="button"
              onClick={() => loadHistory()}
              disabled={loading}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-gray-600 dark:text-gray-400 disabled:opacity-50"
              title="Refrescar"
            >
              {loading ? '...' : 'Refrescar'}
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : days.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-12">
            Aún no hay comidas registradas. Añade fotos en la sección Nutrición.
          </p>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:pointer-events-none"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, days.length)} de {days.length} días
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:pointer-events-none"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {paginatedDays.map(({ date, meals }) => (
                <div
                  key={date}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 border border-gray-200 dark:border-gray-700"
                >
                  <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-3">
                    {new Date(date + 'T12:00:00').toLocaleDateString('es-ES', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </h3>
                  <div className="space-y-4">
                    {meals.map((meal) => (
                      <div
                        key={meal.id}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg p-3"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
                          <span className="font-semibold text-gray-800 dark:text-gray-100">
                            {MEAL_LABELS[meal.meal_type as MealType]}
                          </span>
                          <div className="flex gap-1">
                            {([2, 1, 0] as const).map((level) => (
                              <button
                                key={level}
                                type="button"
                                onClick={() => updateMealHealthOnly(meal, level)}
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  meal.health_level === level
                                    ? level === 2
                                      ? 'bg-green-500 text-white'
                                      : level === 1
                                      ? 'bg-yellow-500 text-white'
                                      : 'bg-red-500 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:opacity-80'
                                }`}
                                title="Cambiar a Sano / Regular / Mal"
                              >
                                {SCORE_LABELS[level]}
                              </button>
                            ))}
                          </div>
                        </div>
                        {meal.image_url && (
                          <img
                            src={meal.image_url}
                            alt={MEAL_LABELS[meal.meal_type as MealType]}
                            className="w-full rounded-lg object-cover max-h-40 mb-2"
                          />
                        )}
                        {meal.star_rating != null && meal.star_rating >= 1 && (
                          <div className="flex gap-0.5 mb-2 items-center">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <Star
                                key={n}
                                className={`w-4 h-4 ${
                                  n <= meal.star_rating!
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-gray-300 dark:text-gray-600'
                                }`}
                              />
                            ))}
                            <span className="ml-1 text-xs text-gray-500">
                              Cómo te cayó
                            </span>
                          </div>
                        )}
                        {meal.ingredients && meal.ingredients.length > 0 ? (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            <span className="font-medium text-gray-700 dark:text-gray-300">Ingredientes: </span>
                            {meal.ingredients.map((i) => i.ingredient_name).join(', ')}
                          </p>
                        ) : (
                          <p className="text-sm text-gray-500 dark:text-gray-500 italic">Sin ingredientes registrados</p>
                        )}
                        <button
                          type="button"
                          onClick={() => openEdit(meal)}
                          className="mt-2 flex items-center gap-1.5 text-sm text-primary hover:underline"
                        >
                          <Pencil className="w-4 h-4" />
                          Editar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Modal editar comida */}
      {editingMeal && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">
                Editar {MEAL_LABELS[editingMeal.meal_type as MealType]}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {new Date(String(editingMeal.date).slice(0, 10) + 'T12:00:00').toLocaleDateString('es-ES', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">¿Qué tan sana fue?</p>
                <div className="flex gap-2">
                  {([2, 1, 0] as const).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setEditForm((f) => f && { ...f, healthLevel: level })}
                      className={`px-4 py-2 rounded-lg font-medium text-sm ${
                        editForm.healthLevel === level
                          ? level === 2
                            ? 'bg-green-500 text-white'
                            : level === 1
                            ? 'bg-yellow-500 text-white'
                            : 'bg-red-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {SCORE_LABELS[level]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">¿Cómo te cayó? (estrellas)</p>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setEditForm((f) => f && { ...f, starRating: n })}
                      className="p-0.5"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          n <= editForm.starRating
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-gray-300 dark:text-gray-600'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Ingredientes</p>
                <ul className="space-y-2 mb-2">
                  {editForm.ingredients.map((name, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="flex-1 text-gray-800 dark:text-gray-200 text-sm">{name}</span>
                      <button
                        type="button"
                        onClick={() => removeEditIngredient(i)}
                        className="p-1.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editForm.manualInput}
                    onChange={(e) => setEditForm((f) => f && { ...f, manualInput: e.target.value })}
                    placeholder="Agregar ingrediente"
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm"
                  />
                  <button
                    type="button"
                    onClick={addEditIngredient}
                    className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
              {saveError && (
                <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>
              )}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-2">
              <button
                type="button"
                onClick={closeEdit}
                disabled={saveLoading}
                className="flex-1 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveEdit}
                disabled={saveLoading}
                className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saveLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar cambios'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function groupMealsByDate(meals: MealWithIngredients[]): { date: string; meals: MealWithIngredients[] }[] {
  const byDate: Record<string, MealWithIngredients[]> = {}
  const order: MealType[] = ['desayuno', 'almuerzo', 'merienda', 'cena']
  meals.forEach((m) => {
    const dateKey = typeof m.date === 'string' ? m.date.slice(0, 10) : String(m.date).slice(0, 10)
    if (!byDate[dateKey]) byDate[dateKey] = []
    byDate[dateKey].push(m)
  })
  Object.keys(byDate).forEach((date) => {
    byDate[date].sort((a, b) => order.indexOf(a.meal_type as MealType) - order.indexOf(b.meal_type as MealType))
  })
  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a))
  return dates.map((date) => ({ date, meals: byDate[date] }))
}
