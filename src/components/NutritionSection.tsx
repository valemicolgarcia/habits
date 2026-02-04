import { useState, useRef } from 'react'
import { useHabits } from '../contexts/HabitsContext'
import { formatDate } from '../lib/utils'
import type { NutritionMeal } from '../contexts/HabitsContext'
import {
  processLabel,
  type NutritionalResponse,
  NOVA_LABELS,
  getNovaColor,
  getNovaDescription,
} from '../lib/labelAnalyzerApi'
import { Loader2, X, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react'

interface NutritionSectionProps {
  onBack: () => void
}

export default function NutritionSection({ onBack }: NutritionSectionProps) {
  const { getDayHabits, updateNutricion, getNutritionScore, getNutritionColor } = useHabits()
  const today = formatDate(new Date())
  const dayHabits = getDayHabits(today)
  const [meals, setMeals] = useState<NutritionMeal[]>(dayHabits.nutricion)
  const [labelAnalysis, setLabelAnalysis] = useState<NutritionalResponse | null>(null)
  const [analyzingLabel, setAnalyzingLabel] = useState(false)
  const [labelError, setLabelError] = useState<string | null>(null)
  const labelFileInputRef = useRef<HTMLInputElement>(null)

  const score = getNutritionScore(today)
  const color = getNutritionColor(today)

  const mealLabels: Record<NutritionMeal['meal'], string> = {
    desayuno: 'Desayuno',
    almuerzo: 'Almuerzo',
    merienda: 'Merienda',
    cena: 'Cena',
  }

  const scoreLabels: Record<0 | 1 | 2, string> = {
    0: 'Mal',
    1: 'Regular',
    2: 'Sano',
  }

  const handleMealScore = (meal: NutritionMeal['meal'], score: 0 | 1 | 2) => {
    const updatedMeals = meals.filter((m) => m.meal !== meal)
    updatedMeals.push({ meal, score })
    updatedMeals.sort((a, b) => {
      const order = ['desayuno', 'almuerzo', 'merienda', 'cena']
      return order.indexOf(a.meal) - order.indexOf(b.meal)
    })
    setMeals(updatedMeals)
    updateNutricion(today, updatedMeals)
  }

  const getMealScore = (meal: NutritionMeal['meal']): 0 | 1 | 2 | null => {
    const mealData = meals.find((m) => m.meal === meal)
    return mealData ? mealData.score : null
  }

  const getColorClass = () => {
    if (color === 'green') return 'bg-green-500 dark:bg-green-600'
    if (color === 'yellow') return 'bg-yellow-500 dark:bg-yellow-600'
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
    const novaColor = getNovaColor(categoriaNova)
    if (novaColor === 'green') return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
    if (novaColor === 'blue') return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
    if (novaColor === 'yellow') return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
    if (novaColor === 'red') return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
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
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">🥗 Nutrición</h1>
            <div className="w-6" />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
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
                  <h4 className="font-semibold text-gray-800 dark:text-gray-100">
                    {labelAnalysis.producto}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {labelAnalysis.analisis_critico}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setLabelAnalysis(null)
                    setLabelError(null)
                  }}
                  className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  title="Cerrar análisis"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className={`p-3 rounded-lg ${getNovaColorClass(labelAnalysis.categoria_nova)}`}>
                  <div className="text-xs font-medium mb-1">Clasificación NOVA</div>
                  <div className="text-lg font-bold">
                    {NOVA_LABELS[labelAnalysis.categoria_nova]?.label}
                  </div>
                  <div className="text-xs mt-1 opacity-80">
                    {getNovaDescription(labelAnalysis.categoria_nova)}
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                  <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Score de Salud
                  </div>
                  <div className={`text-lg font-bold ${getScoreColorClass(labelAnalysis.score_salud)}`}>
                    {labelAnalysis.score_salud}/10
                  </div>
                </div>
              </div>

              {labelAnalysis.ingredientes_principales && labelAnalysis.ingredientes_principales.length > 0 && (
                <div>
                  <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                    Ingredientes principales:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {labelAnalysis.ingredientes_principales.map((ing, i) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-700 dark:text-gray-300"
                      >
                        {ing}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {labelAnalysis.advertencias && labelAnalysis.advertencias.length > 0 && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="text-xs font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                    ⚠️ Advertencias:
                  </div>
                  <ul className="space-y-1">
                    {labelAnalysis.advertencias.map((adv, i) => (
                      <li key={i} className="text-sm text-yellow-700 dark:text-yellow-300">
                        • {adv}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {labelAnalysis.es_ultraprocesado && labelAnalysis.alternativa_saludable && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">
                        Alternativa saludable sugerida:
                      </div>
                      <div className="text-sm text-green-700 dark:text-green-300">
                        {labelAnalysis.alternativa_saludable}
                      </div>
                      {labelAnalysis.link_alternativa && (
                        <a
                          href={labelAnalysis.link_alternativa}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 hover:underline mt-2"
                        >
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

        {/* Resumen del día */}
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

        {/* Lista de comidas */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">
            Comidas del día
          </h3>
          <div className="space-y-4">
            {(['desayuno', 'almuerzo', 'merienda', 'cena'] as NutritionMeal['meal'][]).map((meal) => {
              const currentScore = getMealScore(meal)
              return (
                <div
                  key={meal}
                  className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <div>
                    <h4 className="font-semibold text-gray-800 dark:text-gray-100">
                      {mealLabels[meal]}
                    </h4>
                    {currentScore !== null && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {scoreLabels[currentScore]}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {([2, 1, 0] as const).map((scoreValue) => (
                      <button
                        key={scoreValue}
                        onClick={() => handleMealScore(meal, scoreValue)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${currentScore === scoreValue
                            ? scoreValue === 2
                              ? 'bg-green-500 dark:bg-green-600 text-white'
                              : scoreValue === 1
                                ? 'bg-yellow-500 dark:bg-yellow-600 text-white'
                                : 'bg-red-500 dark:bg-red-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                          }`}
                      >
                        {scoreLabels[scoreValue]}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Leyenda */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">
            Sistema de puntuación
          </h3>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500" />
              <span><strong>Sano (2 pts):</strong> Comida balanceada y nutritiva</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-yellow-500" />
              <span><strong>Regular (1 pt):</strong> Comida aceptable pero mejorable</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-500" />
              <span><strong>Mal (0 pts):</strong> Comida poco saludable</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
