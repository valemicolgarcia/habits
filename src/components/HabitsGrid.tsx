import { useHabits } from '../contexts/HabitsContext'
import { formatDate } from '../lib/utils'

export default function HabitsGrid() {
  const { getDayHabits } = useHabits()
  const today = formatDate(new Date())

  // Obtener los últimos 365 días (año completo)
  const getLastYearDates = () => {
    const dates: string[] = []
    const todayDate = new Date()
    for (let i = 364; i >= 0; i--) {
      const date = new Date(todayDate)
      date.setDate(date.getDate() - i)
      dates.push(formatDate(date))
    }
    return dates
  }

  const dates = getLastYearDates()
  const dayHabits = getDayHabits(today)

  const getCellColor = (date: string) => {
    const habits = getDayHabits(date)
    const isToday = date === today

    if (habits.movimiento || habits.estudio || habits.lectura || habits.nutricion.length > 0) {
      if (isToday) {
        return 'bg-green-500 dark:bg-green-600 border-2 border-green-700 dark:border-green-500'
      }
      return 'bg-green-500 dark:bg-green-600'
    }

    if (isToday) {
      return 'bg-gray-200 dark:bg-gray-700 border-2 border-gray-400 dark:border-gray-500'
    }
    return 'bg-gray-200 dark:bg-gray-700'
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 sm:p-6">
      <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">
        Tu progreso anual
      </h2>
      <div className="flex flex-wrap gap-1">
        {dates.map((date) => (
          <div
            key={date}
            className={`w-3 h-3 rounded-sm ${getCellColor(date)}`}
            title={date}
          />
        ))}
      </div>
      <div className="mt-4 flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-green-500 dark:bg-green-600" />
          <span>Completado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-gray-200 dark:bg-gray-700" />
          <span>Sin actividad</span>
        </div>
      </div>
    </div>
  )
}
