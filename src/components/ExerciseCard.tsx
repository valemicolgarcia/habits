import { Exercise } from '../lib/routine'

interface ExerciseCardProps {
  exercise: Exercise
  sets: Array<{ weight: number; reps: number }>
  onSetChange: (setIndex: number, field: 'weight' | 'reps', value: number) => void
  onViewHistory: () => void
}

export default function ExerciseCard({
  exercise,
  sets,
  onSetChange,
  onViewHistory,
}: ExerciseCardProps) {
  // Asegurar que tenemos el número correcto de series
  const displaySets = Array(exercise.targetSets)
    .fill(null)
    .map((_, i) => sets[i] || { weight: 0, reps: 0 })

  return (
    <div className="bg-white rounded-xl shadow-lg p-5">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-800">{exercise.name}</h3>
          <p className="text-sm text-gray-600">
            {exercise.targetSets} series × {exercise.targetReps} reps
          </p>
        </div>
        <button
          onClick={onViewHistory}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium px-3 py-1 rounded-lg hover:bg-blue-50"
        >
          Ver historial
        </button>
      </div>

      <div className="space-y-3">
        {displaySets.map((set, index) => (
          <div key={index} className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-600 w-12">
              Serie {index + 1}:
            </span>
            <div className="flex-1 flex gap-2">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Peso (kg)</label>
                <input
                  type="number"
                  value={set.weight || ''}
                  onChange={(e) =>
                    onSetChange(index, 'weight', parseFloat(e.target.value) || 0)
                  }
                  min="0"
                  step="0.5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="0"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Reps</label>
                <input
                  type="number"
                  value={set.reps || ''}
                  onChange={(e) =>
                    onSetChange(index, 'reps', parseInt(e.target.value) || 0)
                  }
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
