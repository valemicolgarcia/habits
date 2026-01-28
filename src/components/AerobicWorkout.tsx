import { useState, useEffect } from 'react'
import { useWorkoutSessionV2 } from '../hooks/useWorkoutSessionV2'
import { useHabits } from '../contexts/HabitsContext'
import { formatDate } from '../lib/utils'
import type { DayType } from '../lib/types'

interface AerobicWorkoutProps {
  session: any
  date: Date
  dayType: DayType
}

export default function AerobicWorkout({ session, date, dayType }: AerobicWorkoutProps) {
  const { saveAerobicSession } = useWorkoutSessionV2(date, dayType)
  const { updateMovimiento, getDayHabits } = useHabits()
  const [exercise, setExercise] = useState('')
  const [timeMinutes, setTimeMinutes] = useState(0)
  const [calories, setCalories] = useState<number | null>(null)
  const [completed, setCompleted] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (session?.aerobicLog) {
      setExercise(session.aerobicLog.exercise)
      setTimeMinutes(session.aerobicLog.time_minutes)
      setCalories(session.aerobicLog.calories)
      setCompleted(session.completed)
    } else {
      setExercise('')
      setTimeMinutes(0)
      setCalories(null)
      setCompleted(false)
    }
  }, [session])

  const handleSave = async () => {
    if (!exercise.trim()) {
      alert('Por favor ingresa el nombre del ejercicio')
      return
    }

    setSaving(true)
    try {
      await saveAerobicSession(exercise.trim(), timeMinutes, calories, completed)
      // Actualizar hábito de movimiento según el estado de completado
      if (completed) {
        updateMovimiento(formatDate(date), true, true) // Rutina completada
      } else {
        // Si se desmarca, eliminar el marcado de rutina completada
        // pero mantener movimiento si existe (podría ser movimiento manual)
        const dayHabits = getDayHabits(formatDate(date))
        updateMovimiento(formatDate(date), dayHabits.movimiento, false)
      }
      alert('¡Sesión guardada exitosamente!')
    } catch (err: any) {
      alert('Error al guardar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Ejercicio
          </label>
          <input
            type="text"
            value={exercise}
            onChange={(e) => setExercise(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            placeholder="Ej: Ciclismo, Natación, Elíptica..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Tiempo (minutos)
          </label>
          <input
            type="number"
            value={timeMinutes || ''}
            onChange={(e) => setTimeMinutes(parseInt(e.target.value) || 0)}
            min="0"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            placeholder="0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Calorías (opcional)
          </label>
          <input
            type="number"
            value={calories || ''}
            onChange={(e) =>
              setCalories(e.target.value ? parseInt(e.target.value) : null)
            }
            min="0"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            placeholder="Opcional"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={completed}
            onChange={(e) => setCompleted(e.target.checked)}
            className="w-6 h-6 text-blue-600 dark:text-blue-400 rounded focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Entrenamiento realizado
          </span>
        </label>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-blue-600 dark:bg-blue-500 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
      >
        {saving ? 'Guardando...' : 'Guardar Sesión'}
      </button>
    </div>
  )
}
