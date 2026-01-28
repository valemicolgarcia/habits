import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/utils'
import type { DayOfWeek } from '../lib/types'

interface PreviousWeekExerciseData {
  exerciseName: string
  weight: number
  reps: number
  timeSeconds: number
}

export function usePreviousWeekData(
  currentDate: Date,
  dayOfWeek: DayOfWeek,
  exerciseNames: string[]
) {
  const [previousData, setPreviousData] = useState<Record<string, PreviousWeekExerciseData>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (exerciseNames.length === 0) {
      setLoading(false)
      return
    }
    loadPreviousWeekData()
  }, [currentDate, dayOfWeek, exerciseNames.join(',')])

  const loadPreviousWeekData = async () => {
    try {
      setLoading(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // Calcular fecha de la semana anterior (mismo día de la semana, 7 días antes)
      const previousWeekDate = new Date(currentDate)
      previousWeekDate.setDate(previousWeekDate.getDate() - 7)
      const previousWeekDateString = formatDate(previousWeekDate)

      // Buscar sesión de la semana anterior (sin .single() para manejar el caso de no existencia)
      const { data: previousSessionData, error: sessionError } = await supabase
        .from('workout_sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('date', previousWeekDateString)
        .eq('type', 'musculacion')
        .maybeSingle()

      const previousSession = previousSessionData

      if (sessionError) {
        console.error('Error loading previous session:', sessionError)
        setPreviousData({})
        setLoading(false)
        return
      }

      if (!previousSession) {
        // No hay sesión anterior, está bien
        setPreviousData({})
        setLoading(false)
        return
      }

      // Obtener logs de fuerza de la semana anterior
      const { data: strengthLogs, error: logsError } = await supabase
        .from('strength_logs')
        .select('*')
        .eq('session_id', previousSession.id)
        .in('exercise_name', exerciseNames)

      if (logsError) {
        console.error('Error loading previous week data:', logsError)
        setPreviousData({})
        setLoading(false)
        return
      }

      // Agrupar por ejercicio y obtener el peso y reps más comunes o el promedio
      const exerciseData: Record<string, PreviousWeekExerciseData> = {}

      exerciseNames.forEach((exerciseName) => {
        const exerciseLogs = strengthLogs?.filter((log) => log.exercise_name === exerciseName) || []

        if (exerciseLogs.length > 0) {
          // Obtener el peso más común (o el máximo)
          const weights = exerciseLogs.map((log) => log.weight)
          const maxWeight = Math.max(...weights)

          // Obtener las reps más comunes (o el promedio)
          const reps = exerciseLogs.map((log) => log.reps)
          const avgReps = Math.round(reps.reduce((sum, r) => sum + r, 0) / reps.length)

          // Obtener el tiempo promedio (si existe)
          const timeSeconds = exerciseLogs
            .map((log) => log.time_seconds || 0)
            .filter((t) => t > 0)
          const avgTimeSeconds =
            timeSeconds.length > 0
              ? Math.round(timeSeconds.reduce((sum, t) => sum + t, 0) / timeSeconds.length)
              : 0

          exerciseData[exerciseName] = {
            exerciseName,
            weight: maxWeight,
            reps: avgReps,
            timeSeconds: avgTimeSeconds,
          }
        } else {
          exerciseData[exerciseName] = {
            exerciseName,
            weight: 0,
            reps: 0,
            timeSeconds: 0,
          }
        }
      })

      setPreviousData(exerciseData)
    } catch (err: any) {
      console.error('Error loading previous week data:', err)
      setPreviousData({})
    } finally {
      setLoading(false)
    }
  }

  return {
    previousData,
    loading,
  }
}
