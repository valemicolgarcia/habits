import { useState, useEffect, useRef } from 'react'

interface RestTimerProps {
  restSeconds: number
  onComplete?: () => void
}

export default function RestTimer({ restSeconds, onComplete }: RestTimerProps) {
  const [seconds, setSeconds] = useState(restSeconds)
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Resetear cuando cambia restSeconds
    setSeconds(restSeconds)
    setIsRunning(false)
    setIsPaused(false)
  }, [restSeconds])

  useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => {
          if (prev <= 1) {
            setIsRunning(false)
            if (onComplete) {
              onComplete()
            }
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, isPaused, onComplete])

  const handleStart = () => {
    setIsRunning(true)
    setIsPaused(false)
  }

  const handlePause = () => {
    setIsPaused(true)
  }

  const handleResume = () => {
    setIsPaused(false)
  }

  const handleReset = () => {
    setIsRunning(false)
    setIsPaused(false)
    setSeconds(restSeconds)
  }

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const progress = restSeconds > 0 ? ((restSeconds - seconds) / restSeconds) * 100 : 0

  return (
    <div className="bg-orange-50 rounded-lg p-4 border-2 border-orange-200">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm text-gray-600 mb-1">Descanso: {formatTime(restSeconds)}</div>
          <div className={`text-2xl font-bold ${seconds === 0 ? 'text-green-600' : 'text-orange-600'}`}>
            {formatTime(seconds)}
          </div>
        </div>
        <div className="flex gap-2">
          {!isRunning && seconds === restSeconds && (
            <button
              onClick={handleStart}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
            >
              Iniciar
            </button>
          )}
          {isRunning && !isPaused && (
            <button
              onClick={handlePause}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium"
            >
              Pausar
            </button>
          )}
          {isPaused && (
            <button
              onClick={handleResume}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              Continuar
            </button>
          )}
          {seconds < restSeconds && (
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
            >
              Reiniciar
            </button>
          )}
        </div>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-orange-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      {seconds === 0 && (
        <div className="mt-2 text-center text-green-600 font-semibold">
          ¡Descanso completado!
        </div>
      )}
    </div>
  )
}
