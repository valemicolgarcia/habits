import { useState, useEffect } from 'react'
import { useWorkoutSessionV2 } from '../hooks/useWorkoutSessionV2'
import { usePreviousWeekData } from '../hooks/usePreviousWeekData'
import { getDayOfWeek } from '../lib/utils'
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
}

export default function StrengthWorkout({
  blocks,
  session,
  date,
  dayType,
}: StrengthWorkoutProps) {
  const { saveStrengthSession } = useWorkoutSessionV2(date, dayType)
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

          data[`${block.id}-${exercise.name}`] = {
            weight,
            sets,
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

  const handleSave = async () => {
    setSaving(true)
    try {
      // Convertir datos al formato esperado por saveStrengthSession
      const blockData = blocks.map((block) => ({
        blockId: block.id,
        exercises: block.exercises.map((exercise) => {
          const key = `${block.id}-${exercise.name}`
          const data = exerciseData[key] || { weight: 0, sets: [] }

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
          } as any
        }),
      }))

      await saveStrengthSession(blockData, completed)
      alert('¡Sesión guardada exitosamente!')
    } catch (err: any) {
      alert('Error al guardar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (blocks.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
        <p className="text-gray-600">
          No hay ejercicios configurados para este día. Ve a "Mi Rutina" para configurarlos.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Bloques de ejercicios */}
      {blocks.map((block) => {
        return (
          <div key={block.id} className="bg-white rounded-xl shadow-lg p-5">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-gray-800">
                Bloque {block.order_index + 1}
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Descanso entre series: {block.rest_seconds} segundos
              </p>
              {block.notes && (
                <div className="mt-2 p-3 bg-blue-50 border-l-4 border-blue-400 rounded text-sm text-gray-700">
                  <span className="font-medium text-blue-700">Nota: </span>
                  {block.notes}
                </div>
              )}
              {/* Temporizador de descanso */}
              <div className="mt-3">
                <RestTimer restSeconds={block.rest_seconds} />
              </div>
            </div>

            <div className="space-y-6">
              {block.exercises.map((exercise) => {
                const key = `${block.id}-${exercise.name}`
                const data = exerciseData[key] || {
                  weight: 0,
                  sets: Array(exercise.target_sets).fill(null).map(() => ({
                    reps: 0,
                    timeSeconds: 0,
                    completed: false,
                  })),
                }
                const previousWeek = previousData[exercise.name]
                const isTimeBased = exercise.measurement_type === 'time'

                return (
                  <div key={exercise.id} className="border-t border-gray-200 pt-4">
                    {/* Información del ejercicio */}
                    <div className="mb-4">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-semibold text-gray-800 text-lg">
                          {exercise.name}
                        </h4>
                        <button
                          onClick={() =>
                            setSelectedExerciseForProgress({ name: exercise.name, blockId: block.id })
                          }
                          className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
                        >
                          Progreso
                        </button>
                      </div>
                      
                      {/* Información objetivo y semana anterior */}
                      <div className="bg-gray-50 rounded-lg p-3 mb-3">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-gray-600 block mb-1">Series objetivo:</span>
                            <span className="font-semibold text-gray-800">
                              {exercise.target_sets}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600 block mb-1">
                              {isTimeBased ? 'Tiempo objetivo:' : 'Reps objetivo:'}
                            </span>
                            <span className="font-semibold text-gray-800">
                              {isTimeBased
                                ? `${exercise.target_time_seconds || 0}s`
                                : exercise.target_reps}
                            </span>
                          </div>
                        </div>
                        
                        {/* Datos de la semana anterior - siempre visible */}
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div>
                            <span className="text-gray-600 block mb-1 text-xs">
                              Semana anterior:
                            </span>
                            {loadingPrevious ? (
                              <span className="text-gray-400 text-sm">Cargando...</span>
                            ) : previousWeek && previousWeek.weight > 0 ? (
                              <div>
                                <span className="font-bold text-blue-600 text-base">
                                  {previousWeek.weight} kg
                                </span>
                                <span className="text-gray-500 text-sm ml-2">
                                  ×{' '}
                                  {isTimeBased
                                    ? `${previousWeek.timeSeconds || 0}s`
                                    : `${previousWeek.reps} reps`}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">Sin datos previos</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Temporizador si es tiempo */}
                    {isTimeBased && exercise.target_time_seconds && (
                      <div className="mb-4">
                        <Timer
                          targetSeconds={exercise.target_time_seconds}
                          initialSeconds={0}
                          onComplete={(seconds) => {
                            // El timer se puede usar para cada serie individual si es necesario
                          }}
                        />
                      </div>
                    )}

                    {/* Input de peso único */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Peso usado (kg) - mismo para todas las series
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
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-lg"
                        placeholder="0"
                      />
                    </div>

                    {/* Series con inputs de reps individuales */}
                    <div className="space-y-3">
                      {data.sets.map((set, setIndex) => (
                        <div
                          key={setIndex}
                          className={`border rounded-lg p-3 ${
                            set.completed
                              ? 'bg-green-50 border-green-300'
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="font-semibold text-gray-800 text-sm">
                              Serie {setIndex + 1}
                            </h5>
                            <label className="flex items-center space-x-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={set.completed}
                                onChange={() => handleSetToggle(block.id, exercise.name, setIndex)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                              />
                              <span className="text-xs font-medium text-gray-700">
                                Completada
                              </span>
                            </label>
                          </div>

                          <div className="flex gap-3 items-end">
                            {isTimeBased ? (
                              <div className="flex-1">
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Tiempo (segundos)
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
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                                  placeholder="0"
                                />
                              </div>
                            ) : (
                              <div className="flex-1">
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Repeticiones
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
                                  className="w-full px-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                                  placeholder="0"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Checkbox de completado */}
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

      {/* Botón guardar */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
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
