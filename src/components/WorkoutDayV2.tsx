import { useRoutineBlocks } from '../hooks/useRoutineBlocks'
import { useWorkoutSessionV2 } from '../hooks/useWorkoutSessionV2'
import { getDayName, getDayTypeName } from '../lib/utils'
import type { DayOfWeek, DayType } from '../lib/types'
import StrengthWorkout from './StrengthWorkout'
import RunningWorkout from './RunningWorkout'
import AerobicWorkout from './AerobicWorkout'

interface WorkoutDayV2Props {
  date: Date
  dayOfWeek: DayOfWeek
  dayType: DayType
  routineDayId: string
}

export default function WorkoutDayV2({
  date,
  dayOfWeek,
  dayType,
  routineDayId,
}: WorkoutDayV2Props) {
  const { blocks, loading: blocksLoading } = useRoutineBlocks(
    dayType === 'musculacion' ? routineDayId : null
  )
  const { session, loading: sessionLoading, error } = useWorkoutSessionV2(date, dayType)

  if (dayType === 'descanso') {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">😴</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Día de Descanso</h2>
            <p className="text-gray-600">
              Hoy ({getDayName(dayOfWeek)}) es tu día de descanso. ¡Disfruta y recupérate!
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (blocksLoading || sessionLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-600">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 pb-20">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            {getDayName(dayOfWeek)} - {getDayTypeName(dayType)}
          </h1>
          <p className="text-gray-600 text-sm">
            {date.toLocaleDateString('es-ES', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Contenido según el tipo */}
        {dayType === 'musculacion' && (
          <StrengthWorkout
            blocks={blocks}
            session={session}
            date={date}
            dayType={dayType}
          />
        )}

        {dayType === 'running' && (
          <RunningWorkout session={session} date={date} dayType={dayType} />
        )}

        {dayType === 'aerobico' && (
          <AerobicWorkout session={session} date={date} dayType={dayType} />
        )}
      </div>
    </div>
  )
}
