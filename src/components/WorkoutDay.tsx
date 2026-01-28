import { useState, useEffect } from 'react'
import { RoutineInfo } from '../lib/routine'
import { useWorkoutSession } from '../hooks/useWorkoutSession'
import ExerciseCard from './ExerciseCard'
import ExerciseHistory from './ExerciseHistory'

interface WorkoutDayProps {
  routineInfo: RoutineInfo
  date: Date
}

export default function WorkoutDay({ routineInfo, date }: WorkoutDayProps) {
  const { session, loading, error, saveSession } = useWorkoutSession(date, routineInfo.day)
  const [exerciseData, setExerciseData] = useState<Record<string, Array<{ weight: number; reps: number }>>>({})
  const [completed, setCompleted] = useState(false)
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Cargar datos de la sesión existente
  useEffect(() => {
    if (session) {
      setCompleted(session.completed)
      
      const data: Record<string, Array<{ weight: number; reps: number }>> = {}
      session.exercises.forEach(({ exercise, sets }) => {
        if (sets.length > 0) {
          data[exercise.exercise_name] = sets.map(s => ({ weight: s.weight, reps: s.reps }))
        }
      })
      setExerciseData(data)
    } else {
      // Inicializar con arrays vacíos para cada ejercicio
      const initialData: Record<string, Array<{ weight: number; reps: number }>> = {}
      routineInfo.exercises.forEach(ex => {
        initialData[ex.name] = Array(ex.targetSets).fill(null).map(() => ({ weight: 0, reps: 0 }))
      })
      setExerciseData(initialData)
    }
  }, [session, routineInfo.exercises])

  const handleSetChange = (exerciseName: string, setIndex: number, field: 'weight' | 'reps', value: number) => {
    setExerciseData(prev => {
      const newData = { ...prev }
      if (!newData[exerciseName]) {
        newData[exerciseName] = []
      }
      const sets = [...newData[exerciseName]]
      if (!sets[setIndex]) {
        sets[setIndex] = { weight: 0, reps: 0 }
      }
      sets[setIndex] = { ...sets[setIndex], [field]: value }
      newData[exerciseName] = sets
      return newData
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const exercisesToSave = routineInfo.exercises.map(ex => ({
        name: ex.name,
        sets: exerciseData[ex.name] || [],
      }))

      await saveSession(exercisesToSave, completed)
      alert('¡Sesión guardada exitosamente!')
    } catch (err: any) {
      alert('Error al guardar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-600">Cargando...</div>
      </div>
    )
  }

  if (routineInfo.day === 'descanso') {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">😴</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Día de Descanso</h2>
            <p className="text-gray-600">
              Hoy es tu día de descanso. ¡Disfruta y recupérate!
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 pb-20">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">{routineInfo.name}</h1>
          <p className="text-gray-600 text-sm">
            {date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Ejercicios */}
        <div className="space-y-4 mb-6">
          {routineInfo.exercises.map((exercise) => (
            <ExerciseCard
              key={exercise.name}
              exercise={exercise}
              sets={exerciseData[exercise.name] || []}
              onSetChange={(setIndex, field, value) =>
                handleSetChange(exercise.name, setIndex, field, value)
              }
              onViewHistory={() => setSelectedExercise(exercise.name)}
            />
          ))}
        </div>

        {/* Checkbox de completado */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
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

        {/* Botón guardar */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
        >
          {saving ? 'Guardando...' : 'Guardar Sesión'}
        </button>

        {/* Modal de historial */}
        {selectedExercise && (
          <ExerciseHistory
            exerciseName={selectedExercise}
            onClose={() => setSelectedExercise(null)}
          />
        )}
      </div>
    </div>
  )
}
