import { useState, useEffect } from 'react'
import { useWeeklyRoutine } from '../hooks/useWeeklyRoutine'
import { useHabits } from '../contexts/HabitsContext'
import { useWorkoutSessionV2 } from '../hooks/useWorkoutSessionV2'
import { formatDate, getDayOfWeek, getDayName } from '../lib/utils'
import WorkoutDayV2 from './WorkoutDayV2'
import Profile from './Profile'

export default function MovementSection({ onBack }: { onBack: () => void }) {
  const { routines, loading: routinesLoading, isComplete } = useWeeklyRoutine()
  const { updateMovimiento } = useHabits()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showProfile, setShowProfile] = useState(false)
  const today = formatDate(new Date())
  const selectedDateStr = formatDate(selectedDate)
  const dayOfWeek = getDayOfWeek(selectedDate)
  const routineForDay = routines.find((r) => r.day_of_week === dayOfWeek)

  // Solo cargar sesión si hay rutina configurada (optimización)
  const { session } = useWorkoutSessionV2(
    selectedDate, 
    routineForDay?.type || 'musculacion'
  )
  const { getDayHabits } = useHabits()
  
  // Sincronizar hábito con sesión cuando se carga
  useEffect(() => {
    if (!routineForDay) return
    
    const dayHabits = getDayHabits(selectedDateStr)
    
    if (session?.completed) {
      // Si la sesión está completada, asegurar que el hábito refleje esto
      if (!dayHabits.movimientoRutinaCompletada) {
        updateMovimiento(selectedDateStr, true, true)
      }
    } else {
      // Si la sesión NO está completada pero el hábito dice que sí, corregir
      if (dayHabits.movimientoRutinaCompletada) {
        // Eliminar marcado de rutina completada, pero mantener movimiento si existe (podría ser manual)
        updateMovimiento(selectedDateStr, dayHabits.movimiento, false)
      }
    }
  }, [session?.completed, selectedDateStr, routineForDay, updateMovimiento, getDayHabits])

  const handleDateChange = (days: number) => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + days)
    setSelectedDate(newDate)
  }

  const goToToday = () => {
    setSelectedDate(new Date())
  }

  const isToday = formatDate(selectedDate) === formatDate(new Date())

  // Mostrar perfil si el usuario lo solicita explícitamente
  if (showProfile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex justify-between items-center">
              <button
                onClick={() => setShowProfile(false)}
                className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Mi Rutina</h1>
              <div className="w-6" />
            </div>
          </div>
        </header>
        <Profile onSave={() => setShowProfile(false)} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header con navegación */}
      <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={onBack}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Volver"
            >
              <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Gym Tracker</h1>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowProfile(true)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium px-3 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/30"
              >
                Mi Rutina
              </button>
            </div>
          </div>

          {/* Selector de fecha */}
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={() => handleDateChange(-1)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Día anterior"
            >
              <svg
                className="w-6 h-6 text-gray-600 dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>

            <div className="flex-1 text-center">
              <button
                onClick={goToToday}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  isToday
                    ? 'bg-blue-600 dark:bg-blue-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {selectedDate.toLocaleDateString('es-ES', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
                {!isToday && (
                  <span className="block text-xs mt-1 opacity-75">Haz clic para hoy</span>
                )}
              </button>
            </div>

            <button
              onClick={() => handleDateChange(1)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Día siguiente"
            >
              <svg
                className="w-6 h-6 text-gray-600 dark:text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Advertencia si la rutina no está completa */}
      {!routinesLoading && !isComplete() && (
        <div className="max-w-2xl mx-auto px-4 pt-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 dark:border-yellow-500 p-4 rounded-lg shadow-sm">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-yellow-400 dark:text-yellow-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  <span className="font-medium">Rutina incompleta:</span> Tienes días sin
                  configurar. Haz clic en{' '}
                  <button
                    onClick={() => setShowProfile(true)}
                    className="font-semibold underline hover:text-yellow-800 dark:hover:text-yellow-200"
                  >
                    "Mi Rutina"
                  </button>{' '}
                  para completarla o editarla.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contenido principal */}
      <main>
        {routinesLoading ? (
          <div className="flex justify-center items-center min-h-screen">
            <div className="text-gray-600 dark:text-gray-400">Cargando...</div>
          </div>
        ) : routineForDay ? (
          <WorkoutDayV2
            date={selectedDate}
            dayOfWeek={dayOfWeek}
            dayType={routineForDay.type}
            routineDayId={routineForDay.id}
          />
        ) : (
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center max-w-md">
              <div className="text-6xl mb-4">⚠️</div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                Rutina no configurada
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                No hay rutina configurada para {getDayName(dayOfWeek)}. Haz clic en "Mi Rutina"
                para configurarla o editarla.
              </p>
              <button
                onClick={() => setShowProfile(true)}
                className="bg-blue-600 dark:bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 dark:hover:bg-blue-600"
              >
                Configurar Rutina
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
