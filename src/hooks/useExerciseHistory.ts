import { useState, useEffect } from 'react'
import { supabase, SetLog } from '../lib/supabase'

export interface ExerciseHistoryEntry {
  date: string
  sets: SetLog[]
  totalVolume: number // peso total levantado (suma de peso * reps)
  maxWeight: number
  totalReps: number
}

export function useExerciseHistory(exerciseName: string) {
  const [history, setHistory] = useState<ExerciseHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!exerciseName) {
      setLoading(false)
      return
    }
    loadHistory()
  }, [exerciseName])

  const loadHistory = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // Obtener todas las sesiones con este ejercicio
      const { data: exerciseLogs, error: logsError } = await supabase
        .from('exercise_logs')
        .select(`
          id,
          session_id,
          workout_sessions!inner (
            id,
            date,
            user_id
          )
        `)
        .eq('exercise_name', exerciseName)
        .eq('workout_sessions.user_id', user.id)
        .order('workout_sessions.date', { ascending: false })

      if (logsError) throw logsError

      if (!exerciseLogs || exerciseLogs.length === 0) {
        setHistory([])
        setLoading(false)
        return
      }

      // Para cada ejercicio, obtener sus series
      const historyEntries = await Promise.all(
        exerciseLogs.map(async (log: any) => {
          const { data: sets, error: setsError } = await supabase
            .from('set_logs')
            .select('*')
            .eq('exercise_log_id', log.id)
            .order('set_number')

          if (setsError) throw setsError

          const date = log.workout_sessions.date
          const totalVolume = (sets || []).reduce(
            (sum: number, set: SetLog) => sum + set.weight * set.reps,
            0
          )
          const maxWeight = Math.max(...(sets || []).map((s: SetLog) => s.weight), 0)
          const totalReps = (sets || []).reduce((sum: number, set: SetLog) => sum + set.reps, 0)

          return {
            date,
            sets: sets || [],
            totalVolume,
            maxWeight,
            totalReps,
          }
        })
      )

      setHistory(historyEntries)
    } catch (err: any) {
      setError(err.message || 'Error al cargar el historial')
      console.error('Error loading history:', err)
    } finally {
      setLoading(false)
    }
  }

  return {
    history,
    loading,
    error,
    reload: loadHistory,
  }
}
