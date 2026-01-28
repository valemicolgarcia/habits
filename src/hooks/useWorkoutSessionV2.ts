import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/utils'
import type { WorkoutSession, DayType, BlockData, StrengthLog, RunningLog, AerobicLog } from '../lib/types'

interface WorkoutSessionData extends WorkoutSession {
  strengthLogs?: StrengthLog[]
  runningLog?: RunningLog | null
  aerobicLog?: AerobicLog | null
}

export function useWorkoutSessionV2(date: Date, dayType: DayType) {
  const [session, setSession] = useState<WorkoutSessionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const dateString = formatDate(date)

  useEffect(() => {
    loadSession()
  }, [dateString, dayType])

  const loadSession = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // Buscar sesión existente
      const { data: sessionData, error: sessionError } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', dateString)
        .single()

      if (sessionError && sessionError.code !== 'PGRST116') {
        throw sessionError
      }

      if (sessionData) {
        let sessionWithLogs: WorkoutSessionData = { ...sessionData }

        // Cargar logs según el tipo
        if (dayType === 'musculacion') {
          const { data: strengthLogs, error: strengthError } = await supabase
            .from('strength_logs')
            .select('*')
            .eq('session_id', sessionData.id)
            .order('block_id, set_number')

          if (strengthError) throw strengthError
          sessionWithLogs.strengthLogs = strengthLogs || []
        } else if (dayType === 'running') {
          const { data: runningLog, error: runningError } = await supabase
            .from('running_logs')
            .select('*')
            .eq('session_id', sessionData.id)
            .single()

          if (runningError && runningError.code !== 'PGRST116') throw runningError
          sessionWithLogs.runningLog = runningLog || null
        } else if (dayType === 'aerobico') {
          const { data: aerobicLog, error: aerobicError } = await supabase
            .from('aerobic_logs')
            .select('*')
            .eq('session_id', sessionData.id)
            .single()

          if (aerobicError && aerobicError.code !== 'PGRST116') throw aerobicError
          sessionWithLogs.aerobicLog = aerobicLog || null
        }

        setSession(sessionWithLogs)
      } else {
        setSession(null)
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar la sesión')
      console.error('Error loading session:', err)
    } finally {
      setLoading(false)
    }
  }

  const saveStrengthSession = async (blocks: BlockData[], completed: boolean) => {
    try {
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuario no autenticado')

      let sessionId = session?.id

      // Crear o actualizar sesión
      if (sessionId) {
        const { error: updateError } = await supabase
          .from('workout_sessions')
          .update({ completed, type: dayType })
          .eq('id', sessionId)

        if (updateError) throw updateError
      } else {
        const { data: newSession, error: createError } = await supabase
          .from('workout_sessions')
          .insert({
            user_id: user.id,
            date: dateString,
            type: dayType,
            completed,
          })
          .select()
          .single()

        if (createError) throw createError
        sessionId = newSession.id
      }

      // Eliminar logs antiguos
      if (session?.strengthLogs) {
        for (const log of session.strengthLogs) {
          await supabase.from('strength_logs').delete().eq('id', log.id)
        }
      }

      // Crear nuevos logs
      for (const block of blocks) {
        for (const exercise of block.exercises) {
          for (let i = 0; i < exercise.sets.length; i++) {
            const set = exercise.sets[i]
            const timeSeconds = (set as any).timeSeconds || 0
            if (set.weight > 0 || set.reps > 0 || timeSeconds > 0) {
              const { error: logError } = await supabase.from('strength_logs').insert({
                session_id: sessionId,
                block_id: block.blockId,
                exercise_name: exercise.exerciseName,
                set_number: i + 1,
                weight: set.weight,
                reps: set.reps,
                time_seconds: timeSeconds > 0 ? timeSeconds : null,
              })

              if (logError) throw logError
            }
          }
        }
      }

      await loadSession()
    } catch (err: any) {
      setError(err.message || 'Error al guardar la sesión')
      throw err
    }
  }

  const saveRunningSession = async (
    km: number,
    timeMinutes: number,
    calories: number | null,
    heartRateMin: number | null,
    heartRateMax: number | null,
    completed: boolean
  ) => {
    try {
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuario no autenticado')

      let sessionId = session?.id

      // Crear o actualizar sesión
      if (sessionId) {
        const { error: updateError } = await supabase
          .from('workout_sessions')
          .update({ completed, type: dayType })
          .eq('id', sessionId)

        if (updateError) throw updateError
      } else {
        const { data: newSession, error: createError } = await supabase
          .from('workout_sessions')
          .insert({
            user_id: user.id,
            date: dateString,
            type: dayType,
            completed,
          })
          .select()
          .single()

        if (createError) throw createError
        sessionId = newSession.id
      }

      // Guardar o actualizar log de running
      if (session?.runningLog) {
        const { error: updateError } = await supabase
          .from('running_logs')
          .update({
            km,
            time_minutes: timeMinutes,
            calories,
            heart_rate_min: heartRateMin,
            heart_rate_max: heartRateMax,
          })
          .eq('id', session.runningLog.id)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase.from('running_logs').insert({
          session_id: sessionId,
          km,
          time_minutes: timeMinutes,
          calories,
          heart_rate_min: heartRateMin,
          heart_rate_max: heartRateMax,
        })

        if (insertError) throw insertError
      }

      await loadSession()
    } catch (err: any) {
      setError(err.message || 'Error al guardar la sesión')
      throw err
    }
  }

  const saveAerobicSession = async (exercise: string, timeMinutes: number, calories: number | null, completed: boolean) => {
    try {
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuario no autenticado')

      let sessionId = session?.id

      // Crear o actualizar sesión
      if (sessionId) {
        const { error: updateError } = await supabase
          .from('workout_sessions')
          .update({ completed, type: dayType })
          .eq('id', sessionId)

        if (updateError) throw updateError
      } else {
        const { data: newSession, error: createError } = await supabase
          .from('workout_sessions')
          .insert({
            user_id: user.id,
            date: dateString,
            type: dayType,
            completed,
          })
          .select()
          .single()

        if (createError) throw createError
        sessionId = newSession.id
      }

      // Guardar o actualizar log aeróbico
      if (session?.aerobicLog) {
        const { error: updateError } = await supabase
          .from('aerobic_logs')
          .update({ exercise, time_minutes: timeMinutes, calories })
          .eq('id', session.aerobicLog.id)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase.from('aerobic_logs').insert({
          session_id: sessionId,
          exercise,
          time_minutes: timeMinutes,
          calories,
        })

        if (insertError) throw insertError
      }

      await loadSession()
    } catch (err: any) {
      setError(err.message || 'Error al guardar la sesión')
      throw err
    }
  }

  return {
    session,
    loading,
    error,
    saveStrengthSession,
    saveRunningSession,
    saveAerobicSession,
    reload: loadSession,
  }
}
