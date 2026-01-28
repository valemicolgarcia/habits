import { useExerciseHistory, ExerciseHistoryEntry } from '../hooks/useExerciseHistory'

interface ExerciseHistoryProps {
  exerciseName: string
  onClose: () => void
}

export default function ExerciseHistory({ exerciseName, onClose }: ExerciseHistoryProps) {
  const { history, loading, error } = useExerciseHistory(exerciseName)

  const getProgressIndicator = (current: ExerciseHistoryEntry, previous?: ExerciseHistoryEntry) => {
    if (!previous) return null

    const currentMax = current.maxWeight
    const previousMax = previous.maxWeight
    const currentVolume = current.totalVolume
    const previousVolume = previous.totalVolume

    if (currentMax > previousMax || currentVolume > previousVolume) {
      return <span className="text-green-600 font-semibold">↑ Progreso</span>
    } else if (currentMax < previousMax || currentVolume < previousVolume) {
      return <span className="text-orange-600 font-semibold">↓ Menor</span>
    }
    return <span className="text-gray-600 font-semibold">= Similar</span>
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Historial: {exerciseName}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="text-center text-gray-600 py-8">Cargando historial...</div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {!loading && !error && history.length === 0 && (
            <div className="text-center text-gray-600 py-8">
              No hay historial para este ejercicio aún.
            </div>
          )}

          {!loading && !error && history.length > 0 && (
            <div className="space-y-4">
              {history.map((entry, index) => {
                const previous = history[index + 1]
                const progress = getProgressIndicator(entry, previous)

                return (
                  <div
                    key={entry.date}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-800">
                          {new Date(entry.date).toLocaleDateString('es-ES', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </h3>
                        {progress && <div className="mt-1">{progress}</div>}
                      </div>
                      <div className="text-right text-sm text-gray-600">
                        <div>Volumen: {entry.totalVolume.toFixed(1)} kg</div>
                        <div>Peso máx: {entry.maxWeight} kg</div>
                        <div>Reps totales: {entry.totalReps}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="font-medium text-gray-700">Serie</div>
                      <div className="font-medium text-gray-700">Peso (kg)</div>
                      <div className="font-medium text-gray-700">Reps</div>

                      {entry.sets.map((set, i) => (
                        <>
                          <div className="text-gray-600">{i + 1}</div>
                          <div className="text-gray-800">{set.weight}</div>
                          <div className="text-gray-800">{set.reps}</div>
                        </>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
