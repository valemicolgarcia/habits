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
    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-2 sm:p-3 border-2 border-orange-200 dark:border-orange-800">
      <div className="flex items-center justify-between mb-2 sm:mb-2">
        <div>
          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-0.5 sm:mb-1">Descanso: {formatTime(restSeconds)}</div>
          <div className={`text-lg sm:text-xl font-bold ${seconds === 0 ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
            {formatTime(seconds)}
          </div>
        </div>
        <div className="flex gap-1 sm:gap-2 flex-wrap">
          {!isRunning && seconds === restSeconds && (
            <button
              onClick={handleStart}
              className="px-2 sm:px-3 py-1 sm:py-1.5 bg-orange-600 dark:bg-orange-500 text-white rounded text-xs sm:text-sm hover:bg-orange-700 dark:hover:bg-orange-600 font-medium"
            >
              Iniciar
            </button>
          )}
          {isRunning && !isPaused && (
            <button
              onClick={handlePause}
              className="px-2 sm:px-3 py-1 sm:py-1.5 bg-yellow-600 dark:bg-yellow-500 text-white rounded text-xs sm:text-sm hover:bg-yellow-700 dark:hover:bg-yellow-600 font-medium"
            >
              Pausar
            </button>
          )}
          {isPaused && (
            <button
              onClick={handleResume}
              className="px-2 sm:px-3 py-1 sm:py-1.5 bg-green-600 dark:bg-green-500 text-white rounded text-xs sm:text-sm hover:bg-green-700 dark:hover:bg-green-600 font-medium"
            >
              Continuar
            </button>
          )}
          {seconds < restSeconds && (
            <button
              onClick={handleReset}
              className="px-2 sm:px-3 py-1 sm:py-1.5 bg-gray-600 dark:bg-gray-500 text-white rounded text-xs sm:text-sm hover:bg-gray-700 dark:hover:bg-gray-600 font-medium"
            >
              Reiniciar
            </button>
          )}
        </div>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 sm:h-2">
        <div
          className="bg-orange-600 dark:bg-orange-500 h-1.5 sm:h-2 rounded-full transition-all duration-300"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      {seconds === 0 && (
        <div className="mt-1.5 sm:mt-2 text-center text-green-600 dark:text-green-400 font-semibold text-xs sm:text-sm">
          ¡Descanso completado!
        </div>
      )}
    </div>
  )
}
