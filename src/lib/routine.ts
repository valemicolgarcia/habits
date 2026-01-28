/**
 * Lógica para determinar qué entrenamiento corresponde según el día de la semana
 */

export type RoutineDay = 
  | 'tren-inferior-a'
  | 'tren-superior-a'
  | 'descanso'
  | 'tren-inferior-b'
  | 'tren-superior-b'

export interface RoutineInfo {
  day: RoutineDay
  name: string
  exercises: Exercise[]
}

export interface Exercise {
  name: string
  targetSets: number
  targetReps: string // Ej: "8-12"
}

/**
 * Define los ejercicios para cada día de rutina
 */
const ROUTINE_EXERCISES: Record<RoutineDay, Exercise[]> = {
  'tren-inferior-a': [
    { name: 'Sentadillas', targetSets: 4, targetReps: '8-12' },
    { name: 'Prensa de piernas', targetSets: 3, targetReps: '10-15' },
    { name: 'Extensiones de cuádriceps', targetSets: 3, targetReps: '12-15' },
    { name: 'Curl de piernas', targetSets: 3, targetReps: '12-15' },
    { name: 'Gemelos de pie', targetSets: 4, targetReps: '12-20' },
  ],
  'tren-superior-a': [
    { name: 'Press banca', targetSets: 4, targetReps: '6-10' },
    { name: 'Remo con barra', targetSets: 4, targetReps: '8-12' },
    { name: 'Press militar', targetSets: 3, targetReps: '8-12' },
    { name: 'Jalones al pecho', targetSets: 3, targetReps: '10-12' },
    { name: 'Tríceps en polea', targetSets: 3, targetReps: '10-15' },
    { name: 'Bíceps con barra', targetSets: 3, targetReps: '10-12' },
  ],
  'tren-inferior-b': [
    { name: 'Peso muerto', targetSets: 4, targetReps: '6-10' },
    { name: 'Zancadas', targetSets: 3, targetReps: '10-12 c/pierna' },
    { name: 'Prensa inclinada', targetSets: 3, targetReps: '12-15' },
    { name: 'Curl nórdico', targetSets: 3, targetReps: '8-12' },
    { name: 'Elevación de talones sentado', targetSets: 4, targetReps: '15-20' },
  ],
  'tren-superior-b': [
    { name: 'Press inclinado con mancuernas', targetSets: 4, targetReps: '8-12' },
    { name: 'Dominadas o jalones', targetSets: 4, targetReps: '8-12' },
    { name: 'Remo con mancuerna', targetSets: 3, targetReps: '10-12 c/brazo' },
    { name: 'Elevaciones laterales', targetSets: 3, targetReps: '12-15' },
    { name: 'Press francés', targetSets: 3, targetReps: '10-12' },
    { name: 'Martillo', targetSets: 3, targetReps: '10-12' },
  ],
  'descanso': [],
}

/**
 * Obtiene el día de rutina correspondiente según la fecha
 */
export function getRoutineDay(date: Date = new Date()): RoutineDay {
  const dayOfWeek = date.getDay() // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado

  switch (dayOfWeek) {
    case 1: // Lunes
      return 'tren-inferior-a'
    case 2: // Martes
      return 'tren-superior-a'
    case 3: // Miércoles
      return 'descanso'
    case 4: // Jueves
      return 'tren-inferior-b'
    case 5: // Viernes
      return 'tren-superior-b'
    case 0: // Domingo
    case 6: // Sábado
    default:
      return 'descanso'
  }
}

/**
 * Obtiene el nombre legible del día de rutina
 */
export function getRoutineDayName(day: RoutineDay): string {
  const names: Record<RoutineDay, string> = {
    'tren-inferior-a': 'Tren Inferior A',
    'tren-superior-a': 'Tren Superior A',
    'tren-inferior-b': 'Tren Inferior B',
    'tren-superior-b': 'Tren Superior B',
    'descanso': 'Día de Descanso',
  }
  return names[day]
}

/**
 * Obtiene la información completa de la rutina para un día
 */
export function getRoutineInfo(date: Date = new Date()): RoutineInfo {
  const day = getRoutineDay(date)
  return {
    day,
    name: getRoutineDayName(day),
    exercises: ROUTINE_EXERCISES[day],
  }
}

/**
 * Formatea una fecha a string YYYY-MM-DD (formato ISO para Supabase)
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
