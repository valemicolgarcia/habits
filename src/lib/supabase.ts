import { createClient } from '@supabase/supabase-js'

// IMPORTANTE: Reemplaza estas variables con tus credenciales de Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Variables de entorno de Supabase no configuradas. Crea un archivo .env con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Re-exportar tipos desde types.ts
export type {
  DayType,
  DayOfWeek,
  UserProfile,
  WeeklyRoutine,
  RoutineBlock,
  RoutineExercise,
  WorkoutSession,
  StrengthLog,
  RunningLog,
  AerobicLog,
  DayConfig,
  BlockWithExercises,
  WeeklyRoutineConfig,
  ExerciseSetData,
  ExerciseData,
  BlockData,
  MealType,
  Meal,
  MealIngredient,
  MealWithIngredients,
} from './types'

// Tipos legacy para compatibilidad con hooks antiguos
export interface SetLog {
  id: string
  exercise_log_id: string
  set_number: number
  weight: number
  reps: number
  created_at?: string
}

export interface ExerciseLog {
  id: string
  session_id: string
  exercise_name: string
  created_at?: string
}
