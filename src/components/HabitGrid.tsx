import { useHabits, type CustomHabitDefinition } from '../contexts/HabitsContext'
import { formatDate } from '../lib/utils'
import { X } from 'lucide-react'

interface HabitGridProps {
  habit: 'movimiento' | 'nutricion' | 'estudio' | 'lectura' | string
  customHabit?: CustomHabitDefinition
}

export default function HabitGrid({ habit, customHabit }: HabitGridProps) {
  const { getDayHabits, getNutritionColor, updateCustomHabit, removeCustomHabit } = useHabits()
  const isCustomHabit = customHabit !== undefined
  const today = formatDate(new Date())
  const currentDate = new Date()
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Obtener todos los días del mes actual
  const getDaysInMonth = () => {
    const lastDay = new Date(year, month + 1, 0)
    const days: string[] = []

    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day)
      days.push(formatDate(date))
    }

    return days
  }

  const days = getDaysInMonth()

  const getHabitName = () => {
    if (isCustomHabit && customHabit) {
      return customHabit.name
    }
    const names = {
      movimiento: 'Movimiento',
      nutricion: 'Nutrición',
      estudio: 'Profesional',
      lectura: 'Lectura',
    }
    return names[habit as keyof typeof names] || 'Hábito'
  }

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  let completedCount = 0
  let percentage = 0

  if (habit === 'nutricion') {
    // Para nutrición, contar solo días con verde o amarillo
    const goodDays = days.filter(date => {
      const habits = getDayHabits(date)
      if (habits.nutricion.length !== 4) return false
      const color = getNutritionColor(date)
      return color === 'green' || color === 'yellow'
    }).length
    completedCount = goodDays
    percentage = Math.round((goodDays / daysInMonth) * 100)
  } else {
    completedCount = days.filter(date => {
      const habits = getDayHabits(date)
      if (isCustomHabit && customHabit) {
        return habits.customHabits?.[customHabit.id] || false
      }
      if (habit === 'movimiento') return habits.movimiento
      if (habit === 'lectura') return habits.lectura
      if (habit === 'estudio') return habits.estudio
      return false
    }).length
    percentage = Math.round((completedCount / daysInMonth) * 100)
  }

  const getHabitIcon = () => {
    if (isCustomHabit && customHabit?.emoji) {
      return customHabit.emoji
    }
    switch (habit) {
      case 'movimiento':
        return '💪'
      case 'nutricion':
        return '🥗'
      case 'estudio':
        return '📚'
      case 'lectura':
        return '📖'
      default:
        return '✓'
    }
  }

  const getHabitColor = () => {
    if (isCustomHabit && customHabit?.color) {
      // Mapeo de colores para hábitos personalizados
      const colorMap: Record<string, string> = {
        'pink-300': 'bg-pink-300',
        'rose-400': 'bg-rose-400',
        'fuchsia-400': 'bg-fuchsia-400',
        'purple-400': 'bg-purple-400',
        'indigo-400': 'bg-indigo-400',
        'sky-400': 'bg-sky-400',
        'cyan-400': 'bg-cyan-400',
        'teal-400': 'bg-teal-400',
        'emerald-400': 'bg-emerald-400',
        'lime-400': 'bg-lime-400',
        'amber-400': 'bg-amber-400',
        'orange-300': 'bg-orange-300',
        'red-400': 'bg-red-400',
        'slate-400': 'bg-slate-400',
        'zinc-400': 'bg-zinc-400',
        'stone-400': 'bg-stone-400',
      }
      return colorMap[customHabit.color] || 'bg-gray-500'
    }
    switch (habit) {
      case 'movimiento':
        return 'bg-emerald-500'
      case 'nutricion':
        return 'bg-orange-500'
      case 'estudio':
        return 'bg-blue-500'
      case 'lectura':
        return 'bg-violet-500'
      default:
        return 'bg-gray-500'
    }
  }

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isCustomHabit && customHabit && window.confirm(`¿Estás seguro de que quieres eliminar el hábito "${customHabit.name}"?`)) {
      removeCustomHabit(customHabit.id)
    }
  }

  return (
    <div className="w-full p-1.5 md:p-2 bg-card rounded-lg border border-border hover:border-primary/30 transition-colors relative">
      {isCustomHabit && customHabit && (
        <button
          onClick={handleDelete}
          className="absolute bottom-1 right-1 p-0.5 md:p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors z-10"
          title={`Eliminar ${customHabit.name}`}
        >
          <X className="w-3 h-3 md:w-4 md:h-4" />
        </button>
      )}
      <div className="flex items-center justify-between mb-1 md:mb-1.5">
        <div className="flex items-center gap-1 md:gap-1.5">
          <div className={`w-5 h-5 md:w-6 md:h-6 rounded-md flex items-center justify-center ${getHabitColor()}`}>
            <span className="text-[10px] md:text-xs">{getHabitIcon()}</span>
          </div>
          <div>
            <h4 className="font-semibold text-[10px] md:text-xs text-foreground">{getHabitName()}</h4>
            <p className="text-[9px] md:text-[10px] text-muted-foreground">{percentage}% este mes</p>
          </div>
        </div>
        <span className="text-[9px] md:text-[10px] font-medium text-muted-foreground">
          {completedCount}/{daysInMonth}
        </span>
      </div>

      {/* Mini Calendar */}
      <div className="grid grid-cols-7 gap-[2px]">
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const date = new Date(year, month, day)
          const dateStr = formatDate(date)
          const habits = getDayHabits(dateStr)
          const isToday = dateStr === today
          const isFuture = dateStr > today

          // Determinar el color de la celda según el hábito
          let cellColorClass = 'bg-secondary text-muted-foreground'
          let hasPermitido = false

          if (!isFuture) {
            if (isCustomHabit && customHabit) {
              if (habits.customHabits?.[customHabit.id]) {
                // Mapeo de colores para celdas del calendario
                const cellColorMap: Record<string, string> = {
                  'pink-300': 'bg-pink-300 text-white',
                  'rose-400': 'bg-rose-400 text-white',
                  'fuchsia-400': 'bg-fuchsia-400 text-white',
                  'purple-400': 'bg-purple-400 text-white',
                  'indigo-400': 'bg-indigo-400 text-white',
                  'sky-400': 'bg-sky-400 text-white',
                  'cyan-400': 'bg-cyan-400 text-white',
                  'teal-400': 'bg-teal-400 text-white',
                  'emerald-400': 'bg-emerald-400 text-white',
                  'lime-400': 'bg-lime-400 text-white',
                  'amber-400': 'bg-amber-400 text-white',
                  'orange-300': 'bg-orange-300 text-white',
                  'red-400': 'bg-red-400 text-white',
                  'slate-400': 'bg-slate-400 text-white',
                  'zinc-400': 'bg-zinc-400 text-white',
                  'stone-400': 'bg-stone-400 text-white',
                }
                cellColorClass = cellColorMap[customHabit.color || 'emerald-500'] || 'bg-emerald-500 text-white'
              }
            } else if (habit === 'nutricion') {
              const color = getNutritionColor(dateStr)
              const mealsCount = habits.nutricion?.length || 0

              // Debug: solo loggear si es el día de hoy o si hay comidas pero no se muestra color
              if (dateStr === today || (mealsCount > 0 && mealsCount !== 4)) {
                console.log(`[HabitGrid] ${dateStr}: meals=${mealsCount}, color=${color}`, habits.nutricion)
              }

              if (mealsCount === 4) {
                if (color === 'green') cellColorClass = 'bg-green-500 text-white'
                else if (color === 'yellow') cellColorClass = 'bg-yellow-500 text-white'
                else if (color === 'orange') cellColorClass = 'bg-orange-500 text-white'
                else if (color === 'purple') cellColorClass = 'bg-purple-500 text-white'
                else if (color === 'red') cellColorClass = 'bg-red-500 text-white'
                // Si color es 'gray', no se aplica ningún color (queda con el color por defecto)
              }
              hasPermitido = habits.nutricionPermitido || false
            } else if (habit === 'movimiento') {
              if (habits.movimiento) {
                // Siempre mostrar verde cuando está marcado, sin importar si es manual o rutina completada
                cellColorClass = 'bg-emerald-500 text-white'
              }
            } else if (habit === 'lectura') {
              if (habits.lectura) {
                cellColorClass = 'bg-violet-500 text-white'
              }
            } else if (habit === 'estudio') {
              if (habits.estudio) {
                cellColorClass = 'bg-blue-500 text-white'
              }
            }
          }

          const handleCellClick = () => {
            if (!isFuture && isCustomHabit && customHabit) {
              const currentCompleted = habits.customHabits?.[customHabit.id] || false
              updateCustomHabit(dateStr, customHabit.id, !currentCompleted)
            }
          }

          return (
            <div
              key={day}
              onClick={isCustomHabit ? handleCellClick : undefined}
              className={`aspect-square rounded-[2px] md:rounded-sm flex items-center justify-center text-[8px] md:text-[9px] transition-colors ${cellColorClass} ${isToday ? 'ring-[1.5px] ring-primary ring-offset-0' : ''
                } ${hasPermitido ? 'border-2 border-black dark:border-white' : ''
                } ${isCustomHabit && !isFuture ? 'cursor-pointer hover:opacity-80' : ''}`}
              title={`${dateStr} - ${getHabitName()}${hasPermitido ? ' (Permitido)' : ''}`}
            >
              {day}
            </div>
          )
        })}
      </div>
    </div>
  )
}
