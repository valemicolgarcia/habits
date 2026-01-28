import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { RoutineBlock, RoutineExercise, BlockWithExercises } from '../lib/types'

export function useRoutineBlocks(routineDayId: string | null) {
  const [blocks, setBlocks] = useState<BlockWithExercises[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (routineDayId) {
      loadBlocks()
    } else {
      setBlocks([])
      setLoading(false)
    }
  }, [routineDayId])

  const loadBlocks = async () => {
    if (!routineDayId) return

    try {
      setLoading(true)
      setError(null)

      // Cargar bloques
      const { data: blocksData, error: blocksError } = await supabase
        .from('routine_blocks')
        .select('*')
        .eq('routine_day_id', routineDayId)
        .order('order_index')

      if (blocksError) throw blocksError

      // Para cada bloque, cargar sus ejercicios
      const blocksWithExercises = await Promise.all(
        (blocksData || []).map(async (block) => {
          const { data: exercisesData, error: exercisesError } = await supabase
            .from('routine_exercises')
            .select('*')
            .eq('block_id', block.id)
            .order('order_index')

          if (exercisesError) throw exercisesError

          return {
            ...block,
            exercises: exercisesData || [],
          } as BlockWithExercises
        })
      )

      setBlocks(blocksWithExercises)
    } catch (err: any) {
      setError(err.message || 'Error al cargar los bloques')
      console.error('Error loading blocks:', err)
    } finally {
      setLoading(false)
    }
  }

  const createBlock = async (restSeconds: number, notes?: string | null) => {
    if (!routineDayId) throw new Error('No hay rutina configurada')

    try {
      const maxOrder = blocks.length > 0
        ? Math.max(...blocks.map(b => b.order_index))
        : -1

      const { data, error: insertError } = await supabase
        .from('routine_blocks')
        .insert({
          routine_day_id: routineDayId,
          name: `Bloque ${maxOrder + 2}`, // Nombre temporal, se mostrará basado en order_index
          rest_seconds: restSeconds,
          notes: notes || null,
          order_index: maxOrder + 1,
        })
        .select()
        .single()

      if (insertError) throw insertError

      await loadBlocks()
      return data
    } catch (err: any) {
      throw new Error(err.message || 'Error al crear el bloque')
    }
  }

  const updateBlock = async (blockId: string, restSeconds: number, notes?: string | null) => {
    try {
      const { error: updateError } = await supabase
        .from('routine_blocks')
        .update({ rest_seconds: restSeconds, notes: notes || null })
        .eq('id', blockId)

      if (updateError) throw updateError

      await loadBlocks()
    } catch (err: any) {
      throw new Error(err.message || 'Error al actualizar el bloque')
    }
  }

  const deleteBlock = async (blockId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('routine_blocks')
        .delete()
        .eq('id', blockId)

      if (deleteError) throw deleteError

      await loadBlocks()
    } catch (err: any) {
      throw new Error(err.message || 'Error al eliminar el bloque')
    }
  }

  const createExercise = async (
    blockId: string,
    name: string,
    targetSets: number,
    targetReps: string,
    measurementType: 'reps' | 'time' = 'reps',
    targetTimeSeconds: number = 0
  ) => {
    try {
      const block = blocks.find(b => b.id === blockId)
      const maxOrder = block && block.exercises.length > 0
        ? Math.max(...block.exercises.map(e => e.order_index))
        : -1

      const { data, error: insertError } = await supabase
        .from('routine_exercises')
        .insert({
          block_id: blockId,
          name,
          target_sets: targetSets,
          target_reps: targetReps,
          measurement_type: measurementType,
          target_time_seconds: measurementType === 'time' ? targetTimeSeconds : null,
          order_index: maxOrder + 1,
        })
        .select()
        .single()

      if (insertError) throw insertError

      await loadBlocks()
      return data
    } catch (err: any) {
      throw new Error(err.message || 'Error al crear el ejercicio')
    }
  }

  const updateExercise = async (
    exerciseId: string,
    name: string,
    targetSets: number,
    targetReps: string,
    measurementType: 'reps' | 'time' = 'reps',
    targetTimeSeconds: number = 0
  ) => {
    try {
      const { error: updateError } = await supabase
        .from('routine_exercises')
        .update({
          name,
          target_sets: targetSets,
          target_reps: targetReps,
          measurement_type: measurementType,
          target_time_seconds: measurementType === 'time' ? targetTimeSeconds : null,
        })
        .eq('id', exerciseId)

      if (updateError) throw updateError

      await loadBlocks()
    } catch (err: any) {
      throw new Error(err.message || 'Error al actualizar el ejercicio')
    }
  }

  const deleteExercise = async (exerciseId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('routine_exercises')
        .delete()
        .eq('id', exerciseId)

      if (deleteError) throw deleteError

      await loadBlocks()
    } catch (err: any) {
      throw new Error(err.message || 'Error al eliminar el ejercicio')
    }
  }

  const reorderBlocks = async (blockIds: string[]) => {
    try {
      // Actualizar el order_index de cada bloque según su nueva posición
      const updates = blockIds.map((blockId, index) => ({
        id: blockId,
        order_index: index,
      }))

      // Actualizar todos los bloques en paralelo
      await Promise.all(
        updates.map((update) =>
          supabase
            .from('routine_blocks')
            .update({ order_index: update.order_index })
            .eq('id', update.id)
        )
      )

      await loadBlocks()
    } catch (err: any) {
      throw new Error(err.message || 'Error al reordenar los bloques')
    }
  }

  return {
    blocks,
    loading,
    error,
    createBlock,
    updateBlock,
    deleteBlock,
    createExercise,
    updateExercise,
    deleteExercise,
    reorderBlocks,
    reload: loadBlocks,
  }
}
