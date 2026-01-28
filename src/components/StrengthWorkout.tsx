import { useState, useEffect } from 'react'
import { useWorkoutSessionV2 } from '../hooks/useWorkoutSessionV2'
import { usePreviousWeekData } from '../hooks/usePreviousWeekData'
import { useHabits } from '../contexts/HabitsContext'
import { getDayOfWeek, formatDate } from '../lib/utils'
import type { BlockWithExercises, DayType } from '../lib/types'
import ExerciseProgress from './ExerciseProgress'
import Timer from './Timer'
import RestTimer from './RestTimer'

interface StrengthWorkoutProps {
  blocks: BlockWithExercises[]
  session: any
  date: Date
  dayType: DayType
}

interface SetData {
  reps: number
  timeSeconds: number
  completed: boolean
}

interface ExerciseData {
  weight: number // Peso único para todas las series
  sets: SetData[] // Array de sets, cada uno con sus propias reps
  note?: string // Nota del ejercicio
}

export default function StrengthWorkout({
  blocks,
  session,
  date,
  dayType,
}: StrengthWorkoutProps) {
  const { saveStrengthSession } = useWorkoutSessionV2(date, dayType)
  const { updateMovimiento, getDayHabits } = useHabits()
  const [exerciseData, setExerciseData] = useState<Record<string, ExerciseData>>({})
  const [completed, setCompleted] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedExerciseForProgress, setSelectedExerciseForProgress] = useState<{
    name: string
    blockId: string
  } | null>(null)

  // Obtener nombres de todos los ejercicios
  const allExerciseNames = blocks.flatMap((block) =>
    block.exercises.map((ex) => ex.name)
  )

  // Cargar datos de la semana anterior
  const dayOfWeek = getDayOfWeek(date)
  const { previousData, loading: loadingPrevious } = usePreviousWeekData(
    date,
    dayOfWeek,
    allExerciseNames
  )

  // Inicializar datos desde la sesión o crear estructura vacía
  useEffect(() => {
    if (session?.strengthLogs && session.strengthLogs.length > 0) {
      // Cargar datos de la sesión existente
      const data: Record<string, ExerciseData> = {}

      blocks.forEach((block) => {
        block.exercises.forEach((exercise) => {
          const exerciseLogs = session.strengthLogs.filter(
            (log: any) =>
              log.block_id === block.id && log.exercise_name === exercise.name
          )

          // Obtener el peso (debe ser el mismo para todas las series, tomar el primero)
          const weight = exerciseLogs.length > 0 ? exerciseLogs[0].weight : 0

          // Crear array de sets basado en target_sets
          const sets: SetData[] = Array(exercise.target_sets)
            .fill(null)
            .map((_, index) => {
              // Buscar log para esta serie (set_number es 1-indexed)
              const log = exerciseLogs.find((l: any) => l.set_number === index + 1)
              return {
                reps: log?.reps || 0,
                timeSeconds: log?.time_seconds || 0,
                completed: !!log,
              }
            })

          // Obtener nota del ejercicio
          const exerciseNote = session.exerciseNotes?.find(
            (note: any) => note.block_id === block.id && note.exercise_name === exercise.name
          )

          data[`${block.id}-${exercise.name}`] = {
            weight,
            sets,
            note: exerciseNote?.note || '',
          }
        })
      })

      setExerciseData(data)
      setCompleted(session.completed)
    } else {
      // Crear estructura vacía
      const data: Record<string, ExerciseData> = {}
      blocks.forEach((block) => {
        block.exercises.forEach((exercise) => {
          data[`${block.id}-${exercise.name}`] = {
            weight: 0,
            sets: Array(exercise.target_sets).fill(null).map(() => ({
              reps: 0,
              timeSeconds: 0,
              completed: false,
            })),
            note: '',
          }
        })
      })
      setExerciseData(data)
      setCompleted(false)
    }
  }, [blocks, session])

  const handleWeightChange = (blockId: string, exerciseName: string, value: number) => {
    setExerciseData((prev) => {
      const newData = { ...prev }
      const key = `${blockId}-${exerciseName}`
      if (newData[key]) {
        newData[key] = {
          ...newData[key],
          weight: value,
        }
      }
      return newData
    })
  }

  const handleSetChange = (
    blockId: string,
    exerciseName: string,
    setIndex: number,
    field: 'reps' | 'timeSeconds',
    value: number
  ) => {
    setExerciseData((prev) => {
      const newData = { ...prev }
      const key = `${blockId}-${exerciseName}`
      if (newData[key]) {
        const newSets = [...newData[key].sets]
        newSets[setIndex] = {
          ...newSets[setIndex],
          [field]: value,
        }
        newData[key] = {
          ...newData[key],
          sets: newSets,
        }
      }
      return newData
    })
  }

  const handleSetToggle = (blockId: string, exerciseName: string, setIndex: number) => {
    setExerciseData((prev) => {
      const newData = { ...prev }
      const key = `${blockId}-${exerciseName}`
      if (newData[key]) {
        const newSets = [...newData[key].sets]
        newSets[setIndex] = {
          ...newSets[setIndex],
          completed: !newSets[setIndex].completed,
        }
        newData[key] = {
          ...newData[key],
          sets: newSets,
        }
      }
      return newData
    })
  }

  const handleNoteChange = (blockId: string, exerciseName: string, note: string) => {
    setExerciseData((prev) => {
      const newData = { ...prev }
      const key = `${blockId}-${exerciseName}`
      if (newData[key]) {
        newData[key] = {
          ...newData[key],
          note,
        }
      }
      return newData
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Convertir datos al formato esperado por saveStrengthSession
      const blockData = blocks.map((block) => ({
        blockId: block.id,
        exercises: block.exercises.map((exercise) => {
          const key = `${block.id}-${exercise.name}`
          const data = exerciseData[key] || { weight: 0, sets: [], note: '' }

          // Crear sets solo para las series completadas, usando el peso único
          const sets = data.sets
            .filter((set) => set.completed && (data.weight > 0 || set.reps > 0 || set.timeSeconds > 0))
            .map((set) => ({
              weight: data.weight, // Mismo peso para todas las series
              reps: set.reps,
              timeSeconds: set.timeSeconds || 0,
            }))

          return {
            exerciseName: exercise.name,
            sets: sets.length > 0 ? sets : [],
            note: data.note || '',
          } as any
        }),
      }))

      await saveStrengthSession(blockData, completed)
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

  if (blocks.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">
        <p className="text-gray-600 dark:text-gray-400">
          No hay ejercicios configurados para este día. Ve a "Mi Rutina" para configurarlos.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Bloques de ejercicios */}
      {blocks.map((block) => {
        return (
          <div key={block.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 sm:p-4">
            <div className="mb-3">
              <h3 className="text-base sm:text-lg font-bold text-gray-800 dark:text-gray-100">
                Bloque {block.order_index + 1}
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2">
                Descanso: {block.rest_seconds}s
              </p>
              {block.notes && (
                <div className="mt-1 p-2 bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-400 dark:border-blue-500 rounded text-xs text-gray-700 dark:text-gray-300">
                  <span className="font-medium text-blue-700 dark:text-blue-400">Nota: </span>
                  {block.notes}
                </div>
              )}
              {/* Temporizador de descanso */}
              <div className="mt-2">
                <RestTimer restSeconds={block.rest_seconds} />
              </div>
            </div>

            <div className="space-y-4">
              {block.exercises.map((exercise) => {
                const key = `${block.id}-${exercise.name}`
                const data = exerciseData[key] || {
                  weight: 0,
                  sets: Array(exercise.target_sets).fill(null).map(() => ({
                    reps: 0,
                    timeSeconds: 0,
                    completed: false,
                  })),
                  note: '',
                }
                const previousWeek = previousData[exercise.name]
                const isTimeBased = exercise.measurement_type === 'time'

                return (
                  <div key={exercise.id} className="border-t border-gray-200 dark:border-gray-700 pt-3">
                    {/* Información del ejercicio */}
                    <div className="mb-3">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-gray-800 dark:text-gray-100 text-sm sm:text-base">
                          {exercise.name}
                        </h4>
                        <button
                          onClick={() =>
                            setSelectedExerciseForProgress({ name: exercise.name, blockId: block.id })
                          }
                          className="px-2 py-1 bg-purple-600 dark:bg-purple-500 text-white rounded text-xs sm:text-sm font-medium hover:bg-purple-700 dark:hover:bg-purple-600"
                        >
                          Progreso
                        </button>
                      </div>
                      
                      {/* Información objetivo y semana anterior */}
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-2 mb-2">
                        <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                          <div>
                            <span className="text-gray-600 dark:text-gray-400 block mb-0.5">Series objetivo:</span>
                            <span className="font-semibold text-gray-800 dark:text-gray-100">
                              {exercise.target_sets}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 dark:text-gray-400 block mb-0.5">
                              {isTimeBased ? 'Tiempo objetivo:' : 'Reps objetivo:'}
                            </span>
                            <span className="font-semibold text-gray-800 dark:text-gray-100">
                              {isTimeBased
                                ? `${exercise.target_time_seconds || 0}s`
                                : exercise.target_reps}
                            </span>
                          </div>
                        </div>
                        
                        {/* Datos de la semana anterior */}
                        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                          <div className="mb-1">
                            <span className="text-gray-600 dark:text-gray-400 block mb-0.5 text-xs">
                              Semana anterior:
                            </span>
                            {loadingPrevious ? (
                              <span className="text-gray-400 dark:text-gray-500 text-xs">Cargando...</span>
                            ) : previousWeek && previousWeek.weight > 0 ? (
                              <div>
                                <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">
                                  {previousWeek.weight} kg
                                </span>
                                <span className="text-gray-500 dark:text-gray-400 text-xs ml-1">
                                  ×{' '}
                                  {isTimeBased
                                    ? `${previousWeek.timeSeconds || 0}s`
                                    : previousWeek.repsArray && previousWeek.repsArray.length > 0
                                    ? previousWeek.repsArray.join('-')
                                    : previousWeek.reps}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-500 text-xs">Sin datos previos</span>
                            )}
                          </div>
                          {/* Nota de la semana anterior */}
                          {previousWeek?.note && (
                            <div className="mt-1 pt-1 border-t border-gray-200 dark:border-gray-600">
                              <span className="text-gray-600 dark:text-gray-400 block mb-0.5 text-xs">
                                Nota de la semana anterior:
                              </span>
                              <span className="text-gray-700 dark:text-gray-300 text-xs italic">
                                {previousWeek.note}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Temporizador si es tiempo */}
                    {isTimeBased && exercise.target_time_seconds && (
                      <div className="mb-2">
                        <Timer
                          targetSeconds={exercise.target_time_seconds}
                          initialSeconds={0}
                          onComplete={() => {
                            // El timer se puede usar para cada serie individual si es necesario
                          }}
                        />
                      </div>
                    )}

                    {/* Input de peso único */}
                    <div className="mb-2">
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Peso (kg) - mismo para todas las series
                      </label>
                      <input
                        type="number"
                        value={data.weight || ''}
                        onChange={(e) =>
                          handleWeightChange(
                            block.id,
                            exercise.name,
                            parseFloat(e.target.value) || 0
                          )
                        }
                        min="0"
                        step="0.5"
                        className="w-full px-2 py-1.5 sm:px-3 sm:py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm sm:text-base"
                        placeholder="0"
                      />
                    </div>

                    {/* Series con inputs de reps individuales */}
                    <div className={`grid gap-2 ${
                      data.sets.length === 1 
                        ? 'grid-cols-1' 
                        : data.sets.length === 2
                        ? 'grid-cols-2'
                        : data.sets.length === 3
                        ? 'grid-cols-3'
                        : data.sets.length === 4
                        ? 'grid-cols-4'
                        : 'grid-cols-2 sm:grid-cols-4'
                    }`}>
                      {data.sets.map((set, setIndex) => (
                        <div
                          key={setIndex}
                          className={`border rounded p-2 ${
                            set.completed
                              ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                              : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <h5 className="font-semibold text-gray-800 dark:text-gray-100 text-xs sm:text-sm">
                              Serie {setIndex + 1}
                            </h5>
                            <label className="flex items-center space-x-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={set.completed}
                                onChange={() => handleSetToggle(block.id, exercise.name, setIndex)}
                                className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 dark:text-blue-400 rounded focus:ring-2 focus:ring-blue-500"
                              />
                              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 hidden sm:inline">
                                ✓
                              </span>
                            </label>
                          </div>

                          <div className="flex gap-2 items-end">
                            {isTimeBased ? (
                              <div className="flex-1">
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                                  Tiempo (s)
                                </label>
                                <input
                                  type="number"
                                  value={set.timeSeconds || ''}
                                  onChange={(e) =>
                                    handleSetChange(
                                      block.id,
                                      exercise.name,
                                      setIndex,
                                      'timeSeconds',
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  min="0"
                                  className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-xs sm:text-sm"
                                  placeholder="0"
                                />
                              </div>
                            ) : (
                              <div className="flex-1">
                                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                                  Reps
                                </label>
                                <input
                                  type="number"
                                  value={set.reps || ''}
                                  onChange={(e) =>
                                    handleSetChange(
                                      block.id,
                                      exercise.name,
                                      setIndex,
                                      'reps',
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  min="0"
                                  className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-xs sm:text-sm"
                                  placeholder="0"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Campo de nota */}
                    <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Nota (opcional):
                      </label>
                      <textarea
                        value={data.note || ''}
                        onChange={(e) => handleNoteChange(block.id, exercise.name, e.target.value)}
                        rows={2}
                        className="w-full px-2 py-1.5 sm:px-3 sm:py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-xs sm:text-sm resize-none"
                        placeholder="Escribe una nota sobre este ejercicio..."
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Checkbox de completado */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-3 sm:p-4">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={completed}
            onChange={(e) => setCompleted(e.target.checked)}
            className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400 rounded focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm sm:text-base font-semibold text-gray-800 dark:text-gray-100">
            Entrenamiento realizado
          </span>
        </label>
      </div>

      {/* Botón guardar */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-blue-600 dark:bg-blue-500 text-white py-2.5 sm:py-3 rounded-lg font-bold text-sm sm:text-base hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
      >
        {saving ? 'Guardando...' : 'Guardar Sesión'}
      </button>

      {/* Modal de progreso */}
      {selectedExerciseForProgress && (
        <ExerciseProgress
          exerciseName={selectedExerciseForProgress.name}
          blockId={selectedExerciseForProgress.blockId}
          onClose={() => setSelectedExerciseForProgress(null)}
        />
      )}
    </div>
  )
}
