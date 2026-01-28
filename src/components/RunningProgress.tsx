import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

interface RunningProgressProps {
  onClose: () => void
}

interface WeeklyProgressData {
  weekStart: string // Fecha de inicio de semana (lunes)
  weekEnd: string // Fecha de fin de semana (domingo)
  totalKm: number
  averageKm: number
  totalTime: number // minutos totales
  totalSessions: number
}

export default function RunningProgress({ onClose }: RunningProgressProps) {
  const [progressData, setProgressData] = useState<WeeklyProgressData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadProgressData()
  }, [])

  const loadProgressData = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      // Obtener todas las sesiones de running del usuario
      const { data: sessions, error: sessionsError } = await supabase
        .from('workout_sessions')
        .select('id, date')
        .eq('user_id', user.id)
        .eq('type', 'running')
        .order('date', { ascending: true })

      if (sessionsError) throw sessionsError

      if (!sessions || sessions.length === 0) {
        setProgressData([])
        setLoading(false)
        return
      }

      // Obtener todos los logs de running
      const sessionIds = sessions.map((s) => s.id)
      const { data: runningLogs, error: logsError } = await supabase
        .from('running_logs')
        .select('*')
        .in('session_id', sessionIds)

      if (logsError) throw logsError

      // Agrupar por semana (lunes a domingo)
      const weeklyData: Record<string, WeeklyProgressData> = {}

      sessions.forEach((session) => {
        const log = runningLogs?.find((l) => l.session_id === session.id)
        if (!log) return

        const date = new Date(session.date)
        const dayOfWeek = date.getDay() // 0 = domingo, 1 = lunes, etc.
        
        // Calcular el lunes de esa semana
        const monday = new Date(date)
        const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
        monday.setDate(date.getDate() - daysToMonday)
        monday.setHours(0, 0, 0, 0)

        // Calcular el domingo de esa semana
        const sunday = new Date(monday)
        sunday.setDate(monday.getDate() + 6)
        sunday.setHours(23, 59, 59, 999)

        const weekKey = monday.toISOString().split('T')[0]

        if (!weeklyData[weekKey]) {
          weeklyData[weekKey] = {
            weekStart: weekKey,
            weekEnd: sunday.toISOString().split('T')[0],
            totalKm: 0,
            averageKm: 0,
            totalTime: 0,
            totalSessions: 0,
          }
        }

        weeklyData[weekKey].totalKm += log.km
        weeklyData[weekKey].totalTime += log.time_minutes
        weeklyData[weekKey].totalSessions += 1
      })

      // Calcular promedios y convertir a array
      const weeklyArray = Object.values(weeklyData)
        .map((week) => ({
          ...week,
          averageKm: week.totalSessions > 0 ? week.totalKm / week.totalSessions : 0,
        }))
        .sort((a, b) => a.weekStart.localeCompare(b.weekStart))

      setProgressData(weeklyArray)
    } catch (err: any) {
      setError(err.message || 'Error al cargar el progreso')
      console.error('Error loading running progress:', err)
    } finally {
      setLoading(false)
    }
  }

  // Calcular estadísticas
  const stats =
    progressData.length > 0
      ? {
          firstWeekKm: progressData[0].averageKm,
          lastWeekKm: progressData[progressData.length - 1].averageKm,
          maxWeekKm: Math.max(...progressData.map((p) => p.averageKm)),
          improvement: progressData[progressData.length - 1].averageKm - progressData[0].averageKm,
          totalWeeks: progressData.length,
        }
      : null

  const formatWeekRange = (weekStart: string, weekEnd: string) => {
    const start = new Date(weekStart)
    const end = new Date(weekEnd)
    return `${start.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">Progreso de Running</h2>
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
              No hay datos de progreso aún. Comienza a registrar tus sesiones de running.
            </div>
          )}

          {!loading && !error && progressData.length > 0 && (
            <div className="space-y-6">
              {/* Estadísticas */}
              {stats && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">Primera semana (promedio)</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {stats.firstWeekKm.toFixed(2)} km
                    </div>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">Última semana (promedio)</div>
                    <div className="text-2xl font-bold text-green-600">
                      {stats.lastWeekKm.toFixed(2)} km
                    </div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-1">Mejor semana (promedio)</div>
                    <div className="text-2xl font-bold text-purple-600">
                      {stats.maxWeekKm.toFixed(2)} km
                    </div>
                  </div>
                  <div
                    className={`rounded-lg p-4 ${
                      stats.improvement >= 0 ? 'bg-green-50' : 'bg-red-50'
                    }`}
                  >
                    <div className="text-sm text-gray-600 mb-1">Mejora semanal</div>
                    <div
                      className={`text-2xl font-bold ${
                        stats.improvement >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {stats.improvement >= 0 ? '+' : ''}
                      {stats.improvement.toFixed(2)} km
                    </div>
                  </div>
                </div>
              )}

              {/* Gráfico semanal */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Evolución Semanal (Promedio de km por sesión)
                </h3>
                <div className="relative h-64">
                  {progressData.length > 0 && (
                    <WeeklyLineChart data={progressData} />
                  )}
                </div>
              </div>

              {/* Tabla de datos semanales */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Historial Semanal</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 text-gray-600">Semana</th>
                        <th className="text-right py-2 px-3 text-gray-600">Sesiones</th>
                        <th className="text-right py-2 px-3 text-gray-600">Total km</th>
                        <th className="text-right py-2 px-3 text-gray-600">Promedio km</th>
                        <th className="text-right py-2 px-3 text-gray-600">Tiempo total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {progressData
                        .slice()
                        .reverse()
                        .map((week, index) => (
                          <tr
                            key={index}
                            className="border-b border-gray-100 hover:bg-gray-50"
                          >
                            <td className="py-2 px-3 text-gray-700">
                              {formatWeekRange(week.weekStart, week.weekEnd)}
                            </td>
                            <td className="py-2 px-3 text-right text-gray-800">
                              {week.totalSessions}
                            </td>
                            <td className="py-2 px-3 text-right font-semibold text-gray-800">
                              {week.totalKm.toFixed(2)} km
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-blue-600">
                              {week.averageKm.toFixed(2)} km
                            </td>
                            <td className="py-2 px-3 text-right text-gray-800">
                              {Math.floor(week.totalTime / 60)}h {week.totalTime % 60}m
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

// Componente de gráfico de línea semanal
function WeeklyLineChart({ data }: { data: WeeklyProgressData[] }) {
  if (data.length === 0) return null

  const maxKm = Math.max(...data.map((d) => d.averageKm))
  const minKm = Math.min(...data.map((d) => d.averageKm))
  const range = maxKm - minKm || 1
  const padding = 40
  const width = 600
  const height = 200

  const points = data.map((point, index) => {
    const x = padding + (index / (data.length - 1 || 1)) * (width - 2 * padding)
    const y =
      padding +
      height -
      padding * 2 -
      ((point.averageKm - minKm) / range) * (height - 2 * padding)
    return { x, y, km: point.averageKm }
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
        stroke="#10b981"
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
          fill="#10b981"
          className="hover:r-6 transition-all"
        />
      ))}
      {/* Etiquetas de km */}
      {points.map((point, index) => (
        <text
          key={index}
          x={point.x}
          y={point.y - 10}
          textAnchor="middle"
          className="text-xs fill-gray-600"
        >
          {point.km.toFixed(1)}
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
        Promedio km/sesión
      </text>
    </svg>
  )
}
