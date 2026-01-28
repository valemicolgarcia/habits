import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import type { WeeklyRoutine, DayOfWeek, DayType } from '../lib/types'

export function useWeeklyRoutine() {
  const [routines, setRoutines] = useState<WeeklyRoutine[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadRoutines()
  }, [])

  const loadRoutines = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data, error: fetchError } = await supabase
        .from('weekly_routines')
        .select('*')
        .eq('user_id', user.id)
        .order('day_of_week')

      if (fetchError) throw fetchError

      setRoutines(data || [])
    } catch (err: any) {
      setError(err.message || 'Error al cargar la rutina semanal')
      console.error('Error loading weekly routine:', err)
    } finally {
      setLoading(false)
    }
  }

  const getRoutineForDay = (dayOfWeek: DayOfWeek): WeeklyRoutine | null => {
    return routines.find(r => r.day_of_week === dayOfWeek) || null
  }

  const saveRoutine = async (dayOfWeek: DayOfWeek, type: DayType) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuario no autenticado')

      // Verificar si ya existe
      const existing = routines.find(r => r.day_of_week === dayOfWeek)

      if (existing) {
        const { error: updateError } = await supabase
          .from('weekly_routines')
          .update({ type })
          .eq('id', existing.id)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase
          .from('weekly_routines')
          .insert({
            user_id: user.id,
            day_of_week: dayOfWeek,
            type,
          })

        if (insertError) throw insertError
      }

      await loadRoutines()
    } catch (err: any) {
      throw new Error(err.message || 'Error al guardar la rutina')
    }
  }

  const isComplete = (): boolean => {
    // Verificar que los 7 días estén configurados
    const daysConfigured = routines.length
    return daysConfigured === 7
  }

  return {
    routines,
    loading,
    error,
    getRoutineForDay,
    saveRoutine,
    isComplete,
    reload: loadRoutines,
  }
}
