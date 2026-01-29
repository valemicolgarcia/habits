import { useState, useEffect } from 'react'
import { useRoutineBlocks } from '../hooks/useRoutineBlocks'

interface MuscleDayConfigProps {
  routineDayId: string
  onSaveComplete?: () => void
}

// Tipos para bloques y ejercicios locales (pueden tener IDs temporales)
interface LocalBlock {
  id: string // ID real o temporal
  isNew: boolean // true si es nuevo y no está guardado
  rest_seconds: number
  notes?: string | null
  order_index: number
  exercises: LocalExercise[]
}

interface LocalExercise {
  id: string // ID real o temporal
  isNew: boolean // true si es nuevo y no está guardado
  block_id: string
  name: string
  target_sets: number
  target_reps: string
  measurement_type: 'reps' | 'time'
  target_time_seconds: number
  order_index: number
}

export default function MuscleDayConfig({ routineDayId, onSaveComplete }: MuscleDayConfigProps) {
  const {
    blocks: dbBlocks,
    loading,
    error,
    createBlock,
    updateBlock,
    deleteBlock,
    createExercise,
    updateExercise,
    deleteExercise,
    reorderBlocks,
    reload,
  } = useRoutineBlocks(routineDayId)

  const [localBlocks, setLocalBlocks] = useState<LocalBlock[]>([])
  const [showBlockForm, setShowBlockForm] = useState(false)
  const [editingBlock, setEditingBlock] = useState<string | null>(null)
  const [showExerciseForm, setShowExerciseForm] = useState<string | null>(null)
  const [editingExercise, setEditingExercise] = useState<string | null>(null)
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null)
  const [dragOverBlockId, setDragOverBlockId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [nextTempId, setNextTempId] = useState(1)
  const [hasLocalChanges, setHasLocalChanges] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  // Sincronizar bloques de la DB con estado local solo en la carga inicial o después de guardar
  useEffect(() => {
    if (dbBlocks && !loading) {
      // Solo sincronizar si no hay cambios locales pendientes o si es la carga inicial
      if (isInitialLoad || !hasLocalChanges) {
        const converted: LocalBlock[] = dbBlocks.map((block) => ({
          id: block.id,
          isNew: false,
          rest_seconds: block.rest_seconds,
          notes: block.notes,
          order_index: block.order_index,
          exercises: block.exercises.map((ex) => ({
            id: ex.id,
            isNew: false,
            block_id: block.id,
            name: ex.name,
            target_sets: ex.target_sets,
            target_reps: ex.target_reps,
            measurement_type: ex.measurement_type || 'reps',
            target_time_seconds: ex.target_time_seconds || 0,
            order_index: ex.order_index,
          })),
        }))
        setLocalBlocks(converted)
        setIsInitialLoad(false)
        setHasLocalChanges(false)
      }
    }
  }, [dbBlocks, loading, isInitialLoad, hasLocalChanges])

  const getTempId = () => {
    const id = `temp-${nextTempId}`
    setNextTempId((prev) => prev + 1)
    return id
  }

  const handleCreateBlock = (restSeconds: number, notes?: string | null, initialExercises?: Omit<LocalExercise, 'id' | 'isNew' | 'block_id' | 'order_index'>[]) => {
    const newBlock: LocalBlock = {
      id: getTempId(),
      isNew: true,
      rest_seconds: restSeconds,
      notes: notes || null,
      order_index: localBlocks.length,
      exercises: initialExercises ? initialExercises.map((ex, index) => ({
        ...ex,
        id: getTempId(),
        isNew: true,
        block_id: '', // Se asignará después
        order_index: index,
      })) : [],
    }
    // Asignar el block_id a los ejercicios después de crear el bloque
    newBlock.exercises = newBlock.exercises.map(ex => ({
      ...ex,
      block_id: newBlock.id,
    }))
    setLocalBlocks((prev) => [...prev, newBlock])
    setHasLocalChanges(true)
    setShowBlockForm(false)
    // Si se agregaron ejercicios, mostrar el formulario de ejercicios para ese bloque
    if (initialExercises && initialExercises.length > 0) {
      setShowExerciseForm(newBlock.id)
    }
  }

  const handleUpdateBlock = (blockId: string, restSeconds: number, notes?: string | null) => {
    setLocalBlocks((prev) =>
      prev.map((block) =>
        block.id === blockId
          ? { ...block, rest_seconds: restSeconds, notes: notes || null }
          : block
      )
    )
    setHasLocalChanges(true)
    setEditingBlock(null)
  }

  const handleDeleteBlock = (blockId: string) => {
    setLocalBlocks((prev) => prev.filter((block) => block.id !== blockId))
    setHasLocalChanges(true)
  }

  const handleCreateExercise = (
    blockId: string,
    name: string,
    targetSets: number,
    targetReps: string,
    measurementType: 'reps' | 'time',
    targetTimeSeconds: number
  ) => {
    const block = localBlocks.find((b) => b.id === blockId)
    if (!block) return

    const newExercise: LocalExercise = {
      id: getTempId(),
      isNew: true,
      block_id: blockId,
      name,
      target_sets: targetSets,
      target_reps: targetReps,
      measurement_type: measurementType,
      target_time_seconds: targetTimeSeconds,
      order_index: block.exercises.length,
    }

    setLocalBlocks((prev) =>
      prev.map((b) =>
        b.id === blockId
          ? { ...b, exercises: [...b.exercises, newExercise] }
          : b
      )
    )
    setHasLocalChanges(true)
    setShowExerciseForm(null)
  }

  const handleUpdateExercise = (
    exerciseId: string,
    name: string,
    targetSets: number,
    targetReps: string,
    measurementType: 'reps' | 'time',
    targetTimeSeconds: number
  ) => {
    setLocalBlocks((prev) =>
      prev.map((block) => ({
        ...block,
        exercises: block.exercises.map((ex) =>
          ex.id === exerciseId
            ? {
              ...ex,
              name,
              target_sets: targetSets,
              target_reps: targetReps,
              measurement_type: measurementType,
              target_time_seconds: targetTimeSeconds,
            }
            : ex
        ),
      }))
    )
    setHasLocalChanges(true)
    setEditingExercise(null)
  }

  const handleDeleteExercise = (exerciseId: string) => {
    setLocalBlocks((prev) =>
      prev.map((block) => ({
        ...block,
        exercises: block.exercises.filter((ex) => ex.id !== exerciseId),
      }))
    )
    setHasLocalChanges(true)
  }

  const handleDragStart = (blockId: string) => {
    setDraggedBlockId(blockId)
  }

  const handleDragOver = (e: React.DragEvent, blockId: string) => {
    e.preventDefault()
    if (draggedBlockId && draggedBlockId !== blockId) {
      setDragOverBlockId(blockId)
    }
  }

  const handleDragLeave = () => {
    setDragOverBlockId(null)
  }

  const handleDrop = (e: React.DragEvent, targetBlockId: string) => {
    e.preventDefault()
    setDragOverBlockId(null)

    if (!draggedBlockId || draggedBlockId === targetBlockId) {
      setDraggedBlockId(null)
      return
    }

    // Reordenar localmente
    const currentOrder = localBlocks.map((b) => b.id)
    const draggedIndex = currentOrder.indexOf(draggedBlockId)
    const targetIndex = currentOrder.indexOf(targetBlockId)

    const newOrder = [...currentOrder]
    const [removed] = newOrder.splice(draggedIndex, 1)
    newOrder.splice(targetIndex, 0, removed)

    setLocalBlocks((prev) => {
      const reordered = newOrder.map((id, index) => {
        const block = prev.find((b) => b.id === id)
        return block ? { ...block, order_index: index } : null
      })
      return reordered.filter((b) => b !== null) as LocalBlock[]
    })

    setDraggedBlockId(null)
  }

  const handleDragEnd = () => {
    setDraggedBlockId(null)
    setDragOverBlockId(null)
  }

  const handleSaveAll = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }

    setSaving(true)
    try {
      console.log('Iniciando guardado...', { localBlocks, dbBlocks })

      // 1. Eliminar bloques que fueron eliminados localmente
      const deletedBlockIds = dbBlocks
        .map((b) => b.id)
        .filter((id) => !localBlocks.some((lb) => lb.id === id && !lb.isNew))

      console.log('Bloques a eliminar:', deletedBlockIds)
      for (const blockId of deletedBlockIds) {
        await deleteBlock(blockId)
      }

      // 2. Crear/actualizar bloques y mapear IDs temporales a reales
      const tempToRealIdMap: Record<string, string> = {}
      for (let i = 0; i < localBlocks.length; i++) {
        const localBlock = localBlocks[i]
        if (localBlock.isNew) {
          console.log('Creando nuevo bloque:', localBlock)
          // Crear nuevo bloque
          const newBlock = await createBlock(localBlock.rest_seconds, localBlock.notes)
          const newBlockId = newBlock.id
          tempToRealIdMap[localBlock.id] = newBlockId
          console.log('Bloque creado con ID:', newBlockId)

          // Si el bloque nuevo tiene ejercicios, crearlos inmediatamente
          if (localBlock.exercises.length > 0) {
            console.log('Creando ejercicios para bloque nuevo:', localBlock.exercises.length)
            for (const localExercise of localBlock.exercises) {
              try {
                await createExercise(
                  newBlockId,
                  localExercise.name,
                  localExercise.target_sets,
                  localExercise.target_reps,
                  localExercise.measurement_type,
                  localExercise.target_time_seconds
                )
                console.log('Ejercicio creado:', localExercise.name)
              } catch (exErr: any) {
                console.error('Error creando ejercicio:', exErr)
                throw new Error(`Error al crear ejercicio "${localExercise.name}": ${exErr.message}`)
              }
            }
          }
        } else {
          // Verificar si el bloque necesita actualización
          const dbBlock = dbBlocks.find(b => b.id === localBlock.id)
          const needsUpdate = !dbBlock ||
            dbBlock.rest_seconds !== localBlock.rest_seconds ||
            dbBlock.notes !== localBlock.notes

          if (needsUpdate) {
            console.log('Actualizando bloque existente:', localBlock.id, {
              old: { rest_seconds: dbBlock?.rest_seconds, notes: dbBlock?.notes },
              new: { rest_seconds: localBlock.rest_seconds, notes: localBlock.notes }
            })
            // Actualizar bloque existente
            await updateBlock(localBlock.id, localBlock.rest_seconds, localBlock.notes)
          } else {
            console.log('Bloque sin cambios:', localBlock.id)
          }
          tempToRealIdMap[localBlock.id] = localBlock.id
        }
      }

      // 3. Reordenar bloques si es necesario
      const realBlockIds = localBlocks.map((b) => tempToRealIdMap[b.id] || b.id)
      const currentOrder = dbBlocks.map((b) => b.id)
      // Solo reordenar si hay diferencias y tenemos bloques
      if (realBlockIds.length > 0 && JSON.stringify(currentOrder) !== JSON.stringify(realBlockIds)) {
        console.log('Reordenando bloques')
        await reorderBlocks(realBlockIds)
      }

      // 4. Crear/actualizar/eliminar ejercicios (solo para bloques existentes, los nuevos ya se crearon arriba)
      for (const localBlock of localBlocks) {
        // Solo procesar bloques que ya existían (no nuevos)
        if (!localBlock.isNew) {
          const realBlockId = tempToRealIdMap[localBlock.id] || localBlock.id
          const dbBlock = dbBlocks.find((b) => b.id === realBlockId)

          // Eliminar ejercicios que fueron eliminados
          if (dbBlock) {
            const deletedExerciseIds = dbBlock.exercises
              .map((e) => e.id)
              .filter((id) => !localBlock.exercises.some((le) => le.id === id && !le.isNew))
            for (const exerciseId of deletedExerciseIds) {
              await deleteExercise(exerciseId)
            }
          }

          // Crear/actualizar ejercicios
          for (const localExercise of localBlock.exercises) {
            if (localExercise.isNew) {
              try {
                console.log('Creando ejercicio nuevo:', localExercise.name)
                await createExercise(
                  realBlockId,
                  localExercise.name,
                  localExercise.target_sets,
                  localExercise.target_reps,
                  localExercise.measurement_type,
                  localExercise.target_time_seconds
                )
                console.log('Ejercicio creado exitosamente:', localExercise.name)
              } catch (exErr: any) {
                console.error('Error creando ejercicio:', exErr)
                throw new Error(`Error al crear ejercicio "${localExercise.name}": ${exErr.message}`)
              }
            } else {
              // Verificar si el ejercicio necesita actualización
              const dbExercise = dbBlock?.exercises.find(e => e.id === localExercise.id)
              const needsUpdate = !dbExercise ||
                dbExercise.name !== localExercise.name ||
                dbExercise.target_sets !== localExercise.target_sets ||
                dbExercise.target_reps !== localExercise.target_reps ||
                dbExercise.measurement_type !== localExercise.measurement_type ||
                (dbExercise.target_time_seconds || 0) !== localExercise.target_time_seconds

              if (needsUpdate) {
                try {
                  console.log('Actualizando ejercicio:', localExercise.name, {
                    old: dbExercise ? {
                      name: dbExercise.name,
                      sets: dbExercise.target_sets,
                      reps: dbExercise.target_reps,
                      type: dbExercise.measurement_type,
                      time: dbExercise.target_time_seconds
                    } : 'no existe',
                    new: {
                      name: localExercise.name,
                      sets: localExercise.target_sets,
                      reps: localExercise.target_reps,
                      type: localExercise.measurement_type,
                      time: localExercise.target_time_seconds
                    }
                  })
                  await updateExercise(
                    localExercise.id,
                    localExercise.name,
                    localExercise.target_sets,
                    localExercise.target_reps,
                    localExercise.measurement_type,
                    localExercise.target_time_seconds
                  )
                  console.log('Ejercicio actualizado exitosamente:', localExercise.name)
                } catch (exErr: any) {
                  console.error('Error actualizando ejercicio:', exErr)
                  throw new Error(`Error al actualizar ejercicio "${localExercise.name}": ${exErr.message}`)
                }
              } else {
                console.log('Ejercicio sin cambios:', localExercise.name)
              }
            }
          }
        }
      }

      // Recargar datos
      console.log('Recargando datos...')
      await reload()
      console.log('Guardado completado exitosamente')

      // Marcar que ya no hay cambios locales pendientes
      setHasLocalChanges(false)
      setIsInitialLoad(true) // Permitir que el useEffect sincronice después del guardado

      // Notificar al componente padre que se completó el guardado
      if (onSaveComplete) {
        await onSaveComplete()
      }

      alert('¡Cambios guardados exitosamente!')
    } catch (err: any) {
      console.error('Error saving:', err)
      const errorMessage = err.message || err.toString() || 'Error desconocido'
      alert('Error al guardar: ' + errorMessage)
      throw err // Re-lanzar para que el componente padre pueda manejarlo si es necesario
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-gray-600 py-4">Cargando bloques...</div>
  }

  return (
    <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
      <div className="flex justify-between items-center">
        <div>
          <h4 className="font-semibold text-gray-800">Bloques de ejercicios</h4>
          {(localBlocks.some(b => b.isNew || b.exercises.some(e => e.isNew)) ||
            localBlocks.some(b => {
              const dbBlock = dbBlocks.find(db => db.id === b.id)
              if (!dbBlock) return false
              return b.rest_seconds !== dbBlock.rest_seconds ||
                b.notes !== dbBlock.notes ||
                b.exercises.length !== dbBlock.exercises.length ||
                b.exercises.some(le => {
                  const dbEx = dbBlock.exercises.find(de => de.id === le.id)
                  if (!dbEx) return true
                  return le.name !== dbEx.name ||
                    le.target_sets !== dbEx.target_sets ||
                    le.target_reps !== dbEx.target_reps ||
                    le.measurement_type !== dbEx.measurement_type ||
                    le.target_time_seconds !== (dbEx.target_time_seconds || 0)
                })
            })) && (
              <p className="text-xs text-yellow-600 mt-1">
                ⚠️ Tienes cambios sin guardar
              </p>
            )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setShowBlockForm(true)
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            + Agregar Bloque
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              handleSaveAll(e)
            }}
            disabled={saving || (localBlocks.length === dbBlocks.length &&
              !localBlocks.some(b => {
                const dbBlock = dbBlocks.find(db => db.id === b.id)
                if (!dbBlock) return b.isNew || b.exercises.some(e => e.isNew)
                return b.isNew ||
                  b.exercises.some(e => e.isNew) ||
                  b.rest_seconds !== dbBlock.rest_seconds ||
                  b.notes !== dbBlock.notes ||
                  b.exercises.length !== dbBlock.exercises.length ||
                  b.exercises.some(le => {
                    const dbEx = dbBlock.exercises.find(de => de.id === le.id)
                    if (!dbEx) return true
                    return le.name !== dbEx.name ||
                      le.target_sets !== dbEx.target_sets ||
                      le.target_reps !== dbEx.target_reps ||
                      le.measurement_type !== dbEx.measurement_type ||
                      le.target_time_seconds !== (dbEx.target_time_seconds || 0)
                  })
              }))}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Guardando...' : 'Guardar Todo'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Formulario para crear bloque */}
      {showBlockForm && (
        <BlockForm
          onSubmit={(restSeconds, notes, exercises) => handleCreateBlock(restSeconds, notes, exercises)}
          onCancel={() => setShowBlockForm(false)}
          allowAddExercises={true}
        />
      )}

      {/* Lista de bloques */}
      {localBlocks.length === 0 ? (
        <div className="text-gray-500 text-center py-8 bg-gray-50 rounded-lg">
          No hay bloques configurados. Agrega tu primer bloque.
        </div>
      ) : (
        localBlocks.map((block) => (
          <div
            key={block.id}
            draggable
            onDragStart={(e) => {
              e.stopPropagation()
              handleDragStart(block.id)
            }}
            onDragOver={(e) => {
              e.stopPropagation()
              handleDragOver(e, block.id)
            }}
            onDragLeave={(e) => {
              e.stopPropagation()
              handleDragLeave()
            }}
            onDrop={(e) => {
              e.stopPropagation()
              handleDrop(e, block.id)
            }}
            onDragEnd={(e) => {
              e.stopPropagation()
              handleDragEnd()
            }}
            onClick={(e) => e.stopPropagation()}
            className={`border border-gray-200 rounded-lg p-4 bg-gray-50 transition-all cursor-move ${draggedBlockId === block.id
              ? 'opacity-50 scale-95'
              : dragOverBlockId === block.id
                ? 'border-blue-500 border-2 bg-blue-50 scale-105'
                : 'hover:shadow-md'
              } ${block.isNew ? 'border-yellow-400 border-2' : ''}`}
          >
            {block.isNew && (
              <div className="mb-2 text-xs text-yellow-700 bg-yellow-50 px-2 py-1 rounded">
                Nuevo (sin guardar)
              </div>
            )}
            {editingBlock === block.id ? (
              <div onClick={(e) => e.stopPropagation()}>
                <BlockForm
                  initialRestSeconds={block.rest_seconds}
                  initialNotes={block.notes || ''}
                  onSubmit={(restSeconds, notes) =>
                    handleUpdateBlock(block.id, restSeconds, notes)
                  }
                  onCancel={() => setEditingBlock(null)}
                />
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2 flex-1">
                    <svg
                      className="w-5 h-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 8h16M4 16h16"
                      />
                    </svg>
                    <div className="flex-1">
                      <h5 className="font-semibold text-gray-800">
                        Bloque {block.order_index + 1}
                      </h5>
                      <p className="text-sm text-gray-600">
                        Descanso: {block.rest_seconds} segundos
                      </p>
                      {block.notes && (
                        <div className="mt-2 p-2 bg-blue-50 border-l-4 border-blue-400 rounded text-sm text-gray-700">
                          <span className="font-medium text-blue-700">Nota: </span>
                          {block.notes}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setEditingBlock(block.id)
                      }}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        if (confirm('¿Eliminar este bloque y todos sus ejercicios?')) {
                          handleDeleteBlock(block.id)
                        }
                      }}
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>

                {/* Ejercicios del bloque */}
                <div className="space-y-2 ml-4">
                  {block.exercises.map((exercise) => (
                    <div
                      key={exercise.id}
                      className="bg-white rounded p-3 flex justify-between items-center"
                    >
                      {editingExercise === exercise.id ? (
                        <div onClick={(e) => e.stopPropagation()}>
                          <ExerciseForm
                            initialName={exercise.name}
                            initialTargetSets={exercise.target_sets}
                            initialTargetReps={exercise.target_reps}
                            initialMeasurementType={exercise.measurement_type}
                            initialTargetTimeSeconds={exercise.target_time_seconds}
                            onSubmit={(name, targetSets, targetReps, measurementType, targetTimeSeconds) =>
                              handleUpdateExercise(
                                exercise.id,
                                name,
                                targetSets,
                                targetReps,
                                measurementType,
                                targetTimeSeconds
                              )
                            }
                            onCancel={() => setEditingExercise(null)}
                          />
                        </div>
                      ) : (
                        <>
                          <div>
                            <span className="font-medium text-gray-800">{exercise.name}</span>
                            <span className="text-sm text-gray-600 ml-2">
                              {exercise.target_sets} series ×{' '}
                              {exercise.measurement_type === 'time'
                                ? `${exercise.target_time_seconds || 0}s`
                                : `${exercise.target_reps} reps`}
                            </span>
                            {exercise.isNew && (
                              <span className="ml-2 text-xs text-yellow-700">(nuevo)</span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setEditingExercise(exercise.id)
                              }}
                              className="text-blue-600 hover:text-blue-700 text-sm"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                if (confirm('¿Eliminar este ejercicio?')) {
                                  handleDeleteExercise(exercise.id)
                                }
                              }}
                              className="text-red-600 hover:text-red-700 text-sm"
                            >
                              Eliminar
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}

                  {/* Botón para agregar ejercicio */}
                  {showExerciseForm === block.id ? (
                    <div onClick={(e) => e.stopPropagation()}>
                      <ExerciseForm
                        onSubmit={(name, targetSets, targetReps, measurementType, targetTimeSeconds) =>
                          handleCreateExercise(
                            block.id,
                            name,
                            targetSets,
                            targetReps,
                            measurementType,
                            targetTimeSeconds
                          )
                        }
                        onCancel={() => setShowExerciseForm(null)}
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setShowExerciseForm(block.id)
                      }}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium py-2"
                    >
                      + Agregar ejercicio
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        ))
      )}
    </div>
  )
}

// Componente para formulario de bloque
function BlockForm({
  initialRestSeconds = 60,
  initialNotes = '',
  onSubmit,
  onCancel,
  allowAddExercises = false,
}: {
  initialRestSeconds?: number
  initialNotes?: string
  onSubmit: (restSeconds: number, notes?: string, exercises?: Omit<LocalExercise, 'id' | 'isNew' | 'block_id' | 'order_index'>[]) => void
  onCancel: () => void
  allowAddExercises?: boolean
}) {
  const [restSeconds, setRestSeconds] = useState(initialRestSeconds)
  const [notes, setNotes] = useState(initialNotes)
  const [exercises, setExercises] = useState<Omit<LocalExercise, 'id' | 'isNew' | 'block_id' | 'order_index'>[]>([])
  const [showExerciseForm, setShowExerciseForm] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const trimmedNotes = notes.trim() || undefined
    onSubmit(restSeconds, trimmedNotes, exercises.length > 0 ? exercises : undefined)
  }

  const handleAddExercise = (
    name: string,
    targetSets: number,
    targetReps: string,
    measurementType: 'reps' | 'time',
    targetTimeSeconds: number
  ) => {
    setExercises((prev) => [
      ...prev,
      {
        name,
        target_sets: targetSets,
        target_reps: targetReps,
        measurement_type: measurementType,
        target_time_seconds: targetTimeSeconds,
      },
    ])
    setShowExerciseForm(false)
  }

  const handleRemoveExercise = (index: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <form
      onSubmit={handleSubmit}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      className="bg-white rounded-lg p-4 border border-gray-200"
    >
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descanso entre series (segundos)
          </label>
          <input
            type="number"
            value={restSeconds}
            onChange={(e) => setRestSeconds(parseInt(e.target.value) || 60)}
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nota (opcional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
            placeholder="Agrega una nota para este bloque (ej: 'Enfoque en técnica', 'Aumentar peso gradualmente', etc.)"
          />
        </div>

        {/* Sección para agregar ejercicios al crear bloque */}
        {allowAddExercises && (
          <div className="border-t border-gray-200 pt-3">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Ejercicios (opcional)
              </label>
              {!showExerciseForm && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowExerciseForm(true)
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  + Agregar ejercicio
                </button>
              )}
            </div>

            {/* Lista de ejercicios agregados */}
            {exercises.length > 0 && (
              <div className="space-y-2 mb-2">
                {exercises.map((exercise, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-gray-50 p-2 rounded-lg"
                  >
                    <div className="flex-1">
                      <span className="font-medium text-gray-800">{exercise.name}</span>
                      <span className="text-sm text-gray-600 ml-2">
                        {exercise.target_sets} series ×{' '}
                        {exercise.measurement_type === 'time'
                          ? `${exercise.target_time_seconds || 0}s`
                          : `${exercise.target_reps} reps`}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveExercise(index)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Formulario para agregar ejercicio */}
            {showExerciseForm && (
              <div
                className="bg-gray-50 p-3 rounded-lg border border-gray-200"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <ExerciseForm
                  onSubmit={handleAddExercise}
                  onCancel={() => setShowExerciseForm(false)}
                />
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="submit"
            onClick={(e) => {
              e.stopPropagation()
            }}
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium"
          >
            {allowAddExercises ? 'Crear Bloque' : 'Agregar'}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onCancel()
            }}
            className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 font-medium"
          >
            Cancelar
          </button>
        </div>
      </div>
    </form>
  )
}

// Componente para formulario de ejercicio
function ExerciseForm({
  initialName = '',
  initialTargetSets = 3,
  initialTargetReps = '8-12',
  initialMeasurementType = 'reps',
  initialTargetTimeSeconds = 0,
  onSubmit,
  onCancel,
}: {
  initialName?: string
  initialTargetSets?: number
  initialTargetReps?: string
  initialMeasurementType?: 'reps' | 'time'
  initialTargetTimeSeconds?: number
  onSubmit: (
    name: string,
    targetSets: number,
    targetReps: string,
    measurementType: 'reps' | 'time',
    targetTimeSeconds: number
  ) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initialName)
  const [targetSets, setTargetSets] = useState(initialTargetSets)
  const [targetReps, setTargetReps] = useState(initialTargetReps)
  const [measurementType, setMeasurementType] = useState<'reps' | 'time'>(initialMeasurementType)
  const [targetTimeSeconds, setTargetTimeSeconds] = useState(initialTargetTimeSeconds)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      if (name.trim()) {
        onSubmit(name.trim(), targetSets, targetReps, measurementType, targetTimeSeconds)
      }
    }
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onKeyDown={handleKeyDown}
      className="bg-white rounded-lg p-3 border border-gray-200"
    >
      <div className="space-y-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              e.stopPropagation()
              if (name.trim()) {
                onSubmit(name.trim(), targetSets, targetReps, measurementType, targetTimeSeconds)
              }
            }
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
          placeholder="Nombre del ejercicio"
        />
        <div>
          <label className="block text-xs text-gray-600 mb-2">Tipo de medición:</label>
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => setMeasurementType('reps')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${measurementType === 'reps'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              Repeticiones
            </button>
            <button
              type="button"
              onClick={() => setMeasurementType('time')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${measurementType === 'time'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              Tiempo
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Series</label>
            <input
              type="number"
              value={targetSets}
              onChange={(e) => setTargetSets(parseInt(e.target.value) || 3)}
              min="1"
              className="w-full px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
            />
          </div>
          <div>
            {measurementType === 'reps' ? (
              <>
                <label className="block text-xs text-gray-600 mb-1">Reps (ej: 8-12)</label>
                <input
                  type="text"
                  value={targetReps}
                  onChange={(e) => setTargetReps(e.target.value)}
                  required
                  className="w-full px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                  placeholder="8-12"
                />
              </>
            ) : (
              <>
                <label className="block text-xs text-gray-600 mb-1">Tiempo (segundos)</label>
                <input
                  type="number"
                  value={targetTimeSeconds}
                  onChange={(e) => setTargetTimeSeconds(parseInt(e.target.value) || 0)}
                  min="0"
                  required
                  className="w-full px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
                  placeholder="60"
                />
              </>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (name.trim()) {
                onSubmit(name.trim(), targetSets, targetReps, measurementType, targetTimeSeconds)
              }
            }}
            className="flex-1 bg-blue-600 text-white py-1.5 rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            Agregar
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onCancel()
            }}
            className="flex-1 bg-gray-200 text-gray-700 py-1.5 rounded-lg hover:bg-gray-300 text-sm font-medium"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}
