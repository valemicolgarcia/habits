import { useState } from 'react'
import { useHabits } from '../contexts/HabitsContext'
import { formatDate } from '../lib/utils'
import type { NutritionMeal } from '../contexts/HabitsContext'

interface NutritionSectionProps {
  onBack: () => void
}

export default function NutritionSection({ onBack }: NutritionSectionProps) {
  const { getDayHabits, updateNutricion, getNutritionScore, getNutritionColor } = useHabits()
  const today = formatDate(new Date())
  const dayHabits = getDayHabits(today)
  const [meals, setMeals] = useState<NutritionMeal[]>(dayHabits.nutricion)
  const [showModal, setShowModal] = useState(false)

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
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          currentScore === scoreValue
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
