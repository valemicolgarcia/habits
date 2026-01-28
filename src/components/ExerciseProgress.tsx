import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/utils'

interface ExerciseProgressProps {
  exerciseName: string
  blockId: string
  onClose: () => void
}

interface ProgressDataPoint {
  date: string
  weight: number
}

export default function ExerciseProgress({
  exerciseName,
  blockId,
  onClose,
}: ExerciseProgressProps) {
  const [progressData, setProgressData] = useState<ProgressDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadProgressData()
  }, [exerciseName, blockId])

  const loadProgressData = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // Obtener todas las sesiones de musculación del usuario
      const { data: sessions, error: sessionsError } = await supabase
        .from('workout_sessions')
        .select('id, date')
        .eq('user_id', user.id)
        .eq('type', 'musculacion')
        .order('date', { ascending: true })

      if (sessionsError) throw sessionsError

      if (!sessions || sessions.length === 0) {
        setProgressData([])
        setLoading(false)
        return
      }

      // Para cada sesión, obtener los logs de este ejercicio
      const progressPoints: ProgressDataPoint[] = []

      for (const session of sessions) {
        const { data: logs, error: logsError } = await supabase
          .from('strength_logs')
          .select('weight')
          .eq('session_id', session.id)
          .eq('block_id', blockId)
          .eq('exercise_name', exerciseName)

        if (logsError) throw logsError

        if (logs && logs.length > 0) {
          // Obtener el peso máximo de esa sesión
          const maxWeight = Math.max(...logs.map((log) => log.weight))
          progressPoints.push({
            date: session.date,
            weight: maxWeight,
          })
        }
      }

      setProgressData(progressPoints)
    } catch (err: any) {
      setError(err.message || 'Error al cargar el progreso')
      console.error('Error loading progress:', err)
    } finally {
      setLoading(false)
    }
  }

  // Calcular estadísticas
  const stats = progressData.length > 0
    ? {
        firstWeight: progressData[0].weight,
        lastWeight: progressData[progressData.length - 1].weight,
        maxWeight: Math.max(...progressData.map((p) => p.weight)),
        improvement: progressData[progressData.length - 1].weight - progressData[0].weight,
      }
    : null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Progreso: {exerciseName}</h2>
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
            <div className="text-center text-gray-600 py-8">Cargando progreso...</div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {!loading && !error && progressData.length === 0 && (
            <div className="text-center text-gray-600 py-8">
              No hay datos de progreso para este ejercicio aún.
            </div>
          )}

          {!loading && !error && progressData.length > 0 && (
            <div className="space-y-6">
              {/* Estadísticas */}
              {stats && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">Peso inicial</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {stats.firstWeight} kg
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">Peso actual</div>
                    <div className="text-2xl font-bold text-green-600">
                      {stats.lastWeight} kg
                    </div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">Peso máximo</div>
                    <div className="text-2xl font-bold text-purple-600">
                      {stats.maxWeight} kg
                    </div>
                  </div>
                  <div
                    className={`rounded-lg p-4 ${
                      stats.improvement >= 0 ? 'bg-green-50' : 'bg-red-50'
                    }`}
                  >
                    <div className="text-sm text-gray-600 mb-1">Mejora</div>
                    <div
                      className={`text-2xl font-bold ${
                        stats.improvement >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {stats.improvement >= 0 ? '+' : ''}
                      {stats.improvement.toFixed(1)} kg
                    </div>
                  </div>
                </div>
              )}

              {/* Gráfico simple (línea) */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Evolución del Peso
                </h3>
                <div className="relative h-64">
                  {progressData.length > 0 && (
                    <SimpleLineChart data={progressData} />
                  )}
                </div>
              </div>

              {/* Tabla de datos */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Historial</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 text-gray-600">Fecha</th>
                        <th className="text-right py-2 px-3 text-gray-600">Peso (kg)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {progressData
                        .slice()
                        .reverse()
                        .map((point, index) => (
                          <tr
                            key={index}
                            className="border-b border-gray-100 hover:bg-gray-50"
                          >
                            <td className="py-2 px-3 text-gray-700">
                              {new Date(point.date).toLocaleDateString('es-ES', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </td>
                            <td className="py-2 px-3 text-right font-semibold text-gray-800">
                              {point.weight} kg
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Componente de gráfico de línea simple
function SimpleLineChart({ data }: { data: ProgressDataPoint[] }) {
  if (data.length === 0) return null

  const maxWeight = Math.max(...data.map((d) => d.weight))
  const minWeight = Math.min(...data.map((d) => d.weight))
  const range = maxWeight - minWeight || 1
  const padding = 20
  const width = 600
  const height = 200

  const points = data.map((point, index) => {
    const x = padding + (index / (data.length - 1 || 1)) * (width - 2 * padding)
    const y =
      padding +
      height -
      padding * 2 -
      ((point.weight - minWeight) / range) * (height - 2 * padding)
    return { x, y, weight: point.weight }
  })

  const pathData = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ')

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height + padding * 2}`}>
      {/* Eje Y */}
      <line
        x1={padding}
        y1={padding}
        x2={padding}
        y2={height + padding}
        stroke="#e5e7eb"
        strokeWidth="2"
      />
      {/* Eje X */}
      <line
        x1={padding}
        y1={height + padding}
        x2={width - padding}
        y2={height + padding}
        stroke="#e5e7eb"
        strokeWidth="2"
      />
      {/* Línea del gráfico */}
      <path
        d={pathData}
        fill="none"
        stroke="#3b82f6"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Puntos */}
      {points.map((point, index) => (
        <circle
          key={index}
          cx={point.x}
          cy={point.y}
          r="4"
          fill="#3b82f6"
          className="hover:r-6 transition-all"
        />
      ))}
      {/* Etiquetas de peso */}
      {points.map((point, index) => (
        <text
          key={index}
          x={point.x}
          y={point.y - 10}
          textAnchor="middle"
          className="text-xs fill-gray-600"
        >
          {point.weight}
        </text>
      ))}
      {/* Etiquetas de ejes */}
      <text
        x={width / 2}
        y={height + padding + 30}
        textAnchor="middle"
        className="text-xs fill-gray-600"
      >
        Semanas
      </text>
      <text
        x={15}
        y={height / 2 + padding}
        textAnchor="middle"
        className="text-xs fill-gray-600"
        transform={`rotate(-90, 15, ${height / 2 + padding})`}
      >
        Peso (kg)
      </text>
    </svg>
  )
}
