/**
 * Utilidades generales
 */

/**
 * Obtiene el nombre del día de la semana en español
 */
export function getDayName(dayOfWeek: number): string {
  const days = [
    'Domingo',
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    'Sábado',
  ]
  return days[dayOfWeek] || ''
}

/**
 * Obtiene el día de la semana (0-6) de una fecha
 */
export function getDayOfWeek(date: Date): number {
  return date.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6
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

/**
 * Parsea una fecha desde string YYYY-MM-DD
 */
export function parseDate(dateString: string): Date {
  return new Date(dateString + 'T00:00:00')
}

/**
 * Obtiene el tipo de día legible en español
 */
export function getDayTypeName(type: string): string {
  const names: Record<string, string> = {
    musculacion: 'Musculación',
    running: 'Running',
    aerobico: 'Aeróbico',
    descanso: 'Descanso',
  }
  return names[type] || type
}
