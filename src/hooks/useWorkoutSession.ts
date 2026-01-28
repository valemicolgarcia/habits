import { useState, useEffect } from 'react'
import { supabase, WorkoutSession, ExerciseLog, SetLog } from '../lib/supabase'
import { formatDate, RoutineDay } from '../lib/routine'

interface ExerciseData {
  exercise: ExerciseLog
  sets: SetLog[]
}

interface WorkoutSessionData extends WorkoutSession {
  exercises: ExerciseData[]
}

export function useWorkoutSession(date: Date, routineDay: RoutineDay) {
  const [session, setSession] = useState<WorkoutSessionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const dateString = formatDate(date)

  useEffect(() => {
    loadSession()
  }, [dateString])

  const loadSession = async () => {
    try {
      setLoading(true)
      setError(null)

      // Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // Buscar sesión existente para esta fecha
      const { data: sessionData, error: sessionError } = await supabase
        .from('workout_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', dateString)
        .single()

      if (sessionError && sessionError.code !== 'PGRST116') {
        // PGRST116 = no rows returned, es normal si no hay sesión
        throw sessionError
      }

      if (sessionData) {
        // Cargar ejercicios y series
        const { data: exercisesData, error: exercisesError } = await supabase
          .from('exercise_logs')
          .select('*')
          .eq('session_id', sessionData.id)
          .order('created_at')

        if (exercisesError) throw exercisesError

        const exercisesWithSets = await Promise.all(
          (exercisesData || []).map(async (exercise) => {
            const { data: setsData, error: setsError } = await supabase
              .from('set_logs')
              .select('*')
              .eq('exercise_log_id', exercise.id)
              .order('set_number')

            if (setsError) throw setsError

            return {
              exercise,
              sets: setsData || [],
            }
          })
        )

        setSession({
          ...sessionData,
          exercises: exercisesWithSets,
        })
      } else {
        // No hay sesión, crear estructura vacía
        setSession(null)
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar la sesión')
      console.error('Error loading session:', err)
    } finally {
      setLoading(false)
    }
  }

  const saveSession = async (
    exercises: Array<{ name: string; sets: Array<{ weight: number; reps: number }> }>,
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
          .update({ completed, routine_day: routineDay })
          .eq('id', sessionId)

        if (updateError) throw updateError
      } else {
        const { data: newSession, error: createError } = await supabase
          .from('workout_sessions')
          .insert({
            user_id: user.id,
            date: dateString,
            routine_day: routineDay,
            completed,
          })
          .select()
          .single()

        if (createError) throw createError
        sessionId = newSession.id
      }

      // Eliminar ejercicios y series existentes para esta sesión
      if (session?.exercises) {
        for (const { exercise, sets } of session.exercises) {
          for (const set of sets) {
            await supabase.from('set_logs').delete().eq('id', set.id)
          }
          await supabase.from('exercise_logs').delete().eq('id', exercise.id)
        }
      }

      // Crear nuevos ejercicios y series
      for (let i = 0; i < exercises.length; i++) {
        const exercise = exercises[i]

        const { data: exerciseLog, error: exerciseError } = await supabase
          .from('exercise_logs')
          .insert({
            session_id: sessionId,
            exercise_name: exercise.name,
          })
          .select()
          .single()

        if (exerciseError) throw exerciseError

        for (let j = 0; j < exercise.sets.length; j++) {
          const set = exercise.sets[j]
          const { error: setError } = await supabase.from('set_logs').insert({
            exercise_log_id: exerciseLog.id,
            set_number: j + 1,
            weight: set.weight,
            reps: set.reps,
          })

          if (setError) throw setError
        }
      }

      // Recargar sesión
      await loadSession()
    } catch (err: any) {
      setError(err.message || 'Error al guardar la sesión')
      console.error('Error saving session:', err)
      throw err
    }
  }

  return {
    session,
    loading,
    error,
    saveSession,
    reload: loadSession,
  }
}
