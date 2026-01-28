import { useState } from 'react'
import { useHabits } from '../contexts/HabitsContext'
import { formatDate } from '../lib/utils'

interface StudySectionProps {
  onBack: () => void
}

export default function StudySection({ onBack }: StudySectionProps) {
  const { getDayHabits, updateEstudio } = useHabits()
  const today = formatDate(new Date())
  const dayHabits = getDayHabits(today)
  const [completed, setCompleted] = useState(dayHabits.estudio)

  const handleToggle = () => {
    const newValue = !completed
    setCompleted(newValue)
    updateEstudio(today, newValue)
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
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">💼 Profesional</h1>
            <div className="w-6" />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          <div className="text-center">
            <div className="text-6xl mb-6">💼</div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">
              ¿Trabajaste en tu desarrollo profesional hoy?
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Marca si completaste tu sesión profesional
            </p>
            <button
              onClick={handleToggle}
              className={`w-full py-6 rounded-xl font-bold text-xl transition-all ${
                completed
                  ? 'bg-green-500 dark:bg-green-600 text-white shadow-lg'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              {completed ? '✓ Completado' : 'Marcar como completado'}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
