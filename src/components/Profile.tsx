import { useState } from 'react'
import { useWeeklyRoutine } from '../hooks/useWeeklyRoutine'
import { getDayName } from '../lib/utils'
import type { DayOfWeek, DayType } from '../lib/types'
import MuscleDayConfig from './MuscleDayConfig'

const DAYS_OF_WEEK: DayOfWeek[] = [1, 2, 3, 4, 5, 6, 0] // Lunes a Domingo

interface ProfileProps {
  onSave?: () => void
}

export default function Profile({ onSave }: ProfileProps = {}) {
  const { routines, loading, error, getRoutineForDay, saveRoutine, isComplete, reload } = useWeeklyRoutine()
  const [selectedDay, setSelectedDay] = useState<DayOfWeek | null>(null)
  const [selectedDayType, setSelectedDayType] = useState<DayType | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const handleDayTypeChange = async (dayOfWeek: DayOfWeek, type: DayType) => {
    try {
      await saveRoutine(dayOfWeek, type)
      setSelectedDayType(type)
    } catch (err: any) {
      alert('Error al guardar: ' + err.message)
    }
  }

  const handleDayClick = (dayOfWeek: DayOfWeek) => {
    // Si el día ya está seleccionado, no hacer nada para evitar cerrar la vista
    if (selectedDay === dayOfWeek) {
      return
    }
    const routine = getRoutineForDay(dayOfWeek)
    setSelectedDay(dayOfWeek)
    setSelectedDayType(routine?.type || null)
  }

  const handleSaveRoutine = async () => {
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    try {
      console.log('Guardando rutina completa...')

      // Primero, guardar todos los cambios pendientes de bloques/ejercicios
      // Esto se hace automáticamente cuando el usuario hace clic en "Guardar Todo" en MuscleDayConfig
      // Pero también recargamos para asegurar que todo esté sincronizado

      // Recargar datos para asegurar que todo está sincronizado
      await reload()

      // Esperar un momento para que se actualice el estado después de recargar
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Validar que los 7 días estén configurados
      if (!isComplete()) {
        const missingDays = DAYS_OF_WEEK.filter(
          (day) => !routines.find((r) => r.day_of_week === day)
        )
        const missingDayNames = missingDays.map((day) => getDayName(day)).join(', ')
        throw new Error(
          `Debes configurar todos los días de la semana. Faltan: ${missingDayNames}`
        )
      }

      // Verificar que realmente tenemos 7 días configurados
      if (!isComplete()) {
        throw new Error('Error al validar la rutina. Por favor, intenta nuevamente.')
      }

      console.log('Rutina guardada exitosamente')

      // Mostrar feedback de éxito
      setSaveSuccess(true)

      // NO cerrar automáticamente - el usuario puede cerrar manualmente si quiere
      // El botón "Guardar Cambios" solo valida y guarda, no cierra la vista
    } catch (err: any) {
      console.error('Error al guardar rutina:', err)
      setSaveError(err.message || 'Error al guardar la rutina')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 pb-20">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Mi Rutina Semanal</h1>
            <p className="text-gray-600">
              Configura o edita cada día de la semana. La rutina se repetirá automáticamente.
            </p>
          </div>
          {isComplete() && (
            <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              <svg
                className="w-4 h-4 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Rutina completa
            </span>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {!isComplete() && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg mb-6">
            ⚠️ Debes configurar los 7 días de la semana para completar tu rutina.
          </div>
        )}

        {/* Mensaje de éxito */}
        {saveSuccess && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
            <svg
              className="w-5 h-5 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span className="font-medium">¡Rutina guardada exitosamente!</span>
          </div>
        )}

        {/* Mensaje de error al guardar */}
        {saveError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {saveError}
          </div>
        )}

        {/* Lista de días */}
        <div className="space-y-3 mb-8">
          {DAYS_OF_WEEK.map((dayOfWeek) => {
            const routine = getRoutineForDay(dayOfWeek)
            const dayName = getDayName(dayOfWeek)
            const isSelected = selectedDay === dayOfWeek

            return (
              <div
                key={dayOfWeek}
                className={`bg-white rounded-xl shadow-lg p-5 cursor-pointer transition-all ${isSelected ? 'ring-2 ring-blue-500' : 'hover:shadow-xl'
                  }`}
                onClick={() => handleDayClick(dayOfWeek)}
              >
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-800">{dayName}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {routine
                        ? `Tipo: ${getDayTypeName(routine.type)}`
                        : 'No configurado'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {routine && (
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${routine.type === 'musculacion'
                          ? 'bg-purple-100 text-purple-700'
                          : routine.type === 'running'
                            ? 'bg-green-100 text-green-700'
                            : routine.type === 'aerobico'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                      >
                        {getDayTypeName(routine.type)}
                      </span>
                    )}
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${isSelected ? 'rotate-90' : ''
                        }`}
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
                  </div>
                </div>

                {/* Selector de tipo cuando está seleccionado */}
                {isSelected && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de día:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(['musculacion', 'running', 'aerobico', 'descanso'] as DayType[]).map(
                        (type) => (
                          <button
                            key={type}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDayTypeChange(dayOfWeek, type)
                            }}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedDayType === type
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                          >
                            {getDayTypeName(type)}
                          </button>
                        )
                      )}
                    </div>

                    {/* Configuración específica según el tipo */}
                    {selectedDayType === 'musculacion' && routine && (
                      <div className="mt-4" onClick={(e) => e.stopPropagation()}>
                        <MuscleDayConfig
                          routineDayId={routine.id}
                          onSaveComplete={async () => {
                            // Recargar rutinas después de guardar cambios en bloques
                            // pero sin cerrar la vista
                            await reload()
                            // No hacer nada más, mantener la vista abierta
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Botón Guardar Rutina */}
        <div className="sticky bottom-4 bg-white rounded-xl shadow-2xl p-4 border-2 border-blue-500">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveRoutine}
              disabled={saving || !isComplete()}
              className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all ${saving
                ? 'bg-gray-400 cursor-not-allowed'
                : isComplete()
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02]'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Guardando...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  {isComplete() ? 'Guardar Cambios' : 'Guardar Rutina'}
                </span>
              )}
            </button>
            {onSave && (
              <button
                onClick={onSave}
                className="px-4 py-4 rounded-xl font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                title="Volver sin guardar (los cambios ya guardados se mantienen)"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>
          {!isComplete() && (
            <p className="text-xs text-gray-500 text-center mt-2">
              Completa los 7 días de la semana para guardar. Los cambios individuales se guardan automáticamente.
            </p>
          )}
          {isComplete() && (
            <p className="text-xs text-gray-500 text-center mt-2">
              💡 Los cambios se guardan automáticamente al seleccionar el tipo de día. Este botón valida y confirma la rutina completa.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function getDayTypeName(type: DayType): string {
  const names: Record<DayType, string> = {
    musculacion: 'Musculación',
    running: 'Running',
    aerobico: 'Aeróbico',
    descanso: 'Descanso',
  }
  return names[type]
}
