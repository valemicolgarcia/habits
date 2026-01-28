/**
 * Tipos TypeScript para la aplicación Gym Tracker V2
 */

export type DayType = 'musculacion' | 'running' | 'aerobico' | 'descanso'

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6 // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado

export interface UserProfile {
  id: string
  user_id: string
  name: string | null
  created_at?: string
  updated_at?: string
}

export interface WeeklyRoutine {
  id: string
  user_id: string
  day_of_week: DayOfWeek
  type: DayType
  created_at?: string
  updated_at?: string
}

export interface RoutineBlock {
  id: string
  routine_day_id: string
  name: string
  rest_seconds: number
  order_index: number
  notes?: string | null
  created_at?: string
}

export interface RoutineExercise {
  id: string
  block_id: string
  name: string
  target_sets: number
  target_reps: string
  measurement_type?: 'reps' | 'time' // 'reps' o 'time'
  target_time_seconds?: number // Solo si measurement_type es 'time'
  order_index: number
  created_at?: string
}

export interface WorkoutSession {
  id: string
  user_id: string
  date: string
  type: DayType
  completed: boolean
  created_at?: string
  updated_at?: string
}

export interface StrengthLog {
  id: string
  session_id: string
  block_id: string
  exercise_name: string
  set_number: number
  weight: number
  reps: number
  time_seconds?: number // Solo si el ejercicio usa tiempo
  created_at?: string
}

export interface RunningLog {
  id: string
  session_id: string
  km: number
  time_minutes: number
  calories: number | null
  heart_rate_min: number | null
  heart_rate_max: number | null
  created_at?: string
}

export interface AerobicLog {
  id: string
  session_id: string
  exercise: string
  time_minutes: number
  calories: number | null
  created_at?: string
}

// Tipos para la UI
export interface DayConfig {
  dayOfWeek: DayOfWeek
  dayName: string
  type: DayType | null
  blocks?: BlockWithExercises[]
}

export interface BlockWithExercises extends RoutineBlock {
  exercises: RoutineExercise[]
}

export interface WeeklyRoutineConfig {
  [key: number]: DayConfig // dayOfWeek -> DayConfig
}

export interface ExerciseSetData {
  weight: number
  reps: number
  timeSeconds?: number
}

export interface ExerciseData {
  exerciseName: string
  sets: ExerciseSetData[]
}

export interface BlockData {
  blockId: string
  exercises: ExerciseData[]
}
