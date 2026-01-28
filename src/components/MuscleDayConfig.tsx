import { useState, useEffect } from 'react'
import { useRoutineBlocks } from '../hooks/useRoutineBlocks'
import type { BlockWithExercises } from '../lib/types'

interface MuscleDayConfigProps {
  routineDayId: string
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

export default function MuscleDayConfig({ routineDayId }: MuscleDayConfigProps) {
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

  // Sincronizar bloques de la DB con estado local
  useEffect(() => {
    if (dbBlocks && !loading) {
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
    }
  }, [dbBlocks, loading])

  const getTempId = () => {
    const id = `temp-${nextTempId}`
    setNextTempId((prev) => prev + 1)
    return id
  }

  const handleCreateBlock = (restSeconds: number, notes?: string | null) => {
    const newBlock: LocalBlock = {
      id: getTempId(),
      isNew: true,
      rest_seconds: restSeconds,
      notes: notes || null,
      order_index: localBlocks.length,
      exercises: [],
    }
    setLocalBlocks((prev) => [...prev, newBlock])
    setShowBlockForm(false)
  }

  const handleUpdateBlock = (blockId: string, restSeconds: number, notes?: string | null) => {
    setLocalBlocks((prev) =>
      prev.map((block) =>
        block.id === blockId
          ? { ...block, rest_seconds: restSeconds, notes: notes || null }
          : block
      )
    )
    setEditingBlock(null)
  }

  const handleDeleteBlock = (blockId: string) => {
    setLocalBlocks((prev) => prev.filter((block) => block.id !== blockId))
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
    setEditingExercise(null)
  }

  const handleDeleteExercise = (exerciseId: string) => {
    setLocalBlocks((prev) =>
      prev.map((block) => ({
        ...block,
        exercises: block.exercises.filter((ex) => ex.id !== exerciseId),
      }))
    )
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

  const handleSaveAll = async () => {
    setSaving(true)
    try {
      // 1. Eliminar bloques que fueron eliminados localmente
      const deletedBlockIds = dbBlocks
        .map((b) => b.id)
        .filter((id) => !localBlocks.some((lb) => lb.id === id && !lb.isNew))
      for (const blockId of deletedBlockIds) {
        await deleteBlock(blockId)
      }

      // 2. Crear/actualizar bloques y mapear IDs temporales a reales
      const tempToRealIdMap: Record<string, string> = {}
      for (let i = 0; i < localBlocks.length; i++) {
        const localBlock = localBlocks[i]
        if (localBlock.isNew) {
          // Crear nuevo bloque
          const newBlock = await createBlock(localBlock.rest_seconds, localBlock.notes)
          const newBlockId = newBlock.id
          tempToRealIdMap[localBlock.id] = newBlockId
        } else {
          // Actualizar bloque existente
          await updateBlock(localBlock.id, localBlock.rest_seconds, localBlock.notes)
          tempToRealIdMap[localBlock.id] = localBlock.id
        }
      }

      // 3. Reordenar bloques si es necesario
      const realBlockIds = localBlocks.map((b) => tempToRealIdMap[b.id] || b.id)
      const currentOrder = dbBlocks.map((b) => b.id)
      if (JSON.stringify(currentOrder) !== JSON.stringify(realBlockIds)) {
        await reorderBlocks(realBlockIds)
      }

      // 4. Crear/actualizar/eliminar ejercicios
      for (const localBlock of localBlocks) {
        const realBlockId = tempToRealIdMap[localBlock.id] || localBlock.id
        const dbBlock = dbBlocks.find((b) => b.id === realBlockId)

        // Eliminar ejercicios que fueron eliminados (solo para bloques existentes)
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
            await createExercise(
              realBlockId,
              localExercise.name,
              localExercise.target_sets,
              localExercise.target_reps,
              localExercise.measurement_type,
              localExercise.target_time_seconds
            )
          } else {
            await updateExercise(
              localExercise.id,
              localExercise.name,
              localExercise.target_sets,
              localExercise.target_reps,
              localExercise.measurement_type,
              localExercise.target_time_seconds
            )
          }
        }
      }

      // Recargar datos
      await reload()
      alert('¡Cambios guardados exitosamente!')
    } catch (err: any) {
      alert('Error al guardar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-gray-600 py-4">Cargando bloques...</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-semibold text-gray-800">Bloques de ejercicios</h4>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBlockForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            + Agregar Bloque
          </button>
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50"
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
          onSubmit={(restSeconds, notes) => handleCreateBlock(restSeconds, notes)}
          onCancel={() => setShowBlockForm(false)}
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
            onDragStart={() => handleDragStart(block.id)}
            onDragOver={(e) => handleDragOver(e, block.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, block.id)}
            onDragEnd={handleDragEnd}
            className={`border border-gray-200 rounded-lg p-4 bg-gray-50 transition-all cursor-move ${
              draggedBlockId === block.id
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
              <BlockForm
                initialRestSeconds={block.rest_seconds}
                initialNotes={block.notes || ''}
                onSubmit={(restSeconds, notes) =>
                  handleUpdateBlock(block.id, restSeconds, notes)
                }
                onCancel={() => setEditingBlock(null)}
              />
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
                      onClick={() => setEditingBlock(block.id)}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => {
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
                              onClick={() => setEditingExercise(exercise.id)}
                              className="text-blue-600 hover:text-blue-700 text-sm"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => {
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
                  ) : (
                    <button
                      onClick={() => setShowExerciseForm(block.id)}
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
}: {
  initialRestSeconds?: number
  initialNotes?: string
  onSubmit: (restSeconds: number, notes?: string) => void
  onCancel: () => void
}) {
  const [restSeconds, setRestSeconds] = useState(initialRestSeconds)
  const [notes, setNotes] = useState(initialNotes)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(restSeconds, notes.trim() || null)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg p-4 border border-gray-200">
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
        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium"
          >
            Agregar
          </button>
          <button
            type="button"
            onClick={onCancel}
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      onSubmit(name.trim(), targetSets, targetReps, measurementType, targetTimeSeconds)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg p-3 border border-gray-200">
      <div className="space-y-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm"
          placeholder="Nombre del ejercicio"
        />
        <div>
          <label className="block text-xs text-gray-600 mb-2">Tipo de medición:</label>
          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={() => setMeasurementType('reps')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                measurementType === 'reps'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Repeticiones
            </button>
            <button
              type="button"
              onClick={() => setMeasurementType('time')}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                measurementType === 'time'
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
            type="submit"
            className="flex-1 bg-blue-600 text-white py-1.5 rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            Agregar
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-200 text-gray-700 py-1.5 rounded-lg hover:bg-gray-300 text-sm font-medium"
          >
            Cancelar
          </button>
        </div>
      </div>
    </form>
  )
}
