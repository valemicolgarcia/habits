import { useState, useEffect } from 'react'
import { useWorkoutSessionV2 } from '../hooks/useWorkoutSessionV2'
import type { DayType } from '../lib/types'
import RunningProgress from './RunningProgress'

interface RunningWorkoutProps {
  session: any
  date: Date
  dayType: DayType
}

export default function RunningWorkout({ session, date, dayType }: RunningWorkoutProps) {
  const { saveRunningSession } = useWorkoutSessionV2(date, dayType)
  const [km, setKm] = useState(0)
  const [timeMinutes, setTimeMinutes] = useState(0)
  const [calories, setCalories] = useState<number | null>(null)
  const [heartRateMin, setHeartRateMin] = useState<number | null>(null)
  const [heartRateMax, setHeartRateMax] = useState<number | null>(null)
  const [completed, setCompleted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showProgress, setShowProgress] = useState(false)

  useEffect(() => {
    if (session?.runningLog) {
      setKm(session.runningLog.km)
      setTimeMinutes(session.runningLog.time_minutes)
      setCalories(session.runningLog.calories)
      setHeartRateMin(session.runningLog.heart_rate_min || null)
      setHeartRateMax(session.runningLog.heart_rate_max || null)
      setCompleted(session.completed)
    } else {
      setKm(0)
      setTimeMinutes(0)
      setCalories(null)
      setHeartRateMin(null)
      setHeartRateMax(null)
      setCompleted(false)
    }
  }, [session])

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveRunningSession(km, timeMinutes, calories, heartRateMin, heartRateMax, completed)
      alert('¡Sesión guardada exitosamente!')
    } catch (err: any) {
      alert('Error al guardar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header con botón de progreso */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Running</h2>
          <button
            onClick={() => setShowProgress(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
          >
            Ver Progreso
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Kilómetros
          </label>
          <input
            type="number"
            value={km || ''}
            onChange={(e) => setKm(parseFloat(e.target.value) || 0)}
            min="0"
            step="0.1"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            placeholder="0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tiempo (minutos)
          </label>
          <input
            type="number"
            value={timeMinutes || ''}
            onChange={(e) => setTimeMinutes(parseInt(e.target.value) || 0)}
            min="0"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            placeholder="0"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Calorías (opcional)
            </label>
            <input
              type="number"
              value={calories || ''}
              onChange={(e) =>
                setCalories(e.target.value ? parseInt(e.target.value) : null)
              }
              min="0"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="Opcional"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ritmo cardíaco mínimo (bpm)
            </label>
            <input
              type="number"
              value={heartRateMin || ''}
              onChange={(e) =>
                setHeartRateMin(e.target.value ? parseInt(e.target.value) : null)
              }
              min="0"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="Opcional"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ritmo cardíaco máximo (bpm)
            </label>
            <input
              type="number"
              value={heartRateMax || ''}
              onChange={(e) =>
                setHeartRateMax(e.target.value ? parseInt(e.target.value) : null)
              }
              min="0"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="Opcional"
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6">
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={completed}
            onChange={(e) => setCompleted(e.target.checked)}
            className="w-6 h-6 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-lg font-semibold text-gray-800">
            Entrenamiento realizado
          </span>
        </label>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
      >
        {saving ? 'Guardando...' : 'Guardar Sesión'}
      </button>

      {/* Modal de progreso */}
      {showProgress && (
        <RunningProgress onClose={() => setShowProgress(false)} />
      )}
    </div>
  )
}
