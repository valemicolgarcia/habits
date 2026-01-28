import { useState, useEffect, useRef } from 'react'

interface TimerProps {
  targetSeconds: number
  onComplete: (seconds: number) => void
  initialSeconds?: number
}

export default function Timer({ targetSeconds, onComplete, initialSeconds = 0 }: TimerProps) {
  const [seconds, setSeconds] = useState(initialSeconds)
  const [isRunning, setIsRunning] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isCompleted, setIsCompleted] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Resetear cuando cambia initialSeconds (al cerrar y volver a entrar)
  useEffect(() => {
    setSeconds(initialSeconds)
    setIsRunning(false)
    setIsPaused(false)
    setIsCompleted(false)
  }, [initialSeconds])

  useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => {
          const newSeconds = prev + 1
          if (newSeconds >= targetSeconds) {
            setIsRunning(false)
            setIsCompleted(true)
            onComplete(newSeconds)
            return newSeconds
          }
          return newSeconds
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
  }, [isRunning, isPaused, targetSeconds, onComplete])

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
    setIsCompleted(false)
    setSeconds(0)
    onComplete(0)
    // Si estaba completado, iniciar automáticamente
    if (isCompleted) {
      // Usar setTimeout para asegurar que el estado se actualice primero
      setTimeout(() => {
        setIsRunning(true)
        setIsPaused(false)
      }, 0)
    }
  }

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const progress = targetSeconds > 0 ? (seconds / targetSeconds) * 100 : 0

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 sm:p-4 border-2 border-blue-200 dark:border-blue-800">
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <div>
          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-0.5 sm:mb-1">Tiempo objetivo: {formatTime(targetSeconds)}</div>
          <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">{formatTime(seconds)}</div>
        </div>
        <div className="flex gap-1 sm:gap-2 flex-wrap">
          {!isRunning && seconds === 0 && !isCompleted && (
            <button
              onClick={handleStart}
              className="px-2 sm:px-4 py-1 sm:py-2 bg-blue-600 dark:bg-blue-500 text-white rounded text-xs sm:text-sm hover:bg-blue-700 dark:hover:bg-blue-600 font-medium"
            >
              Iniciar
            </button>
          )}
          {isRunning && !isPaused && (
            <button
              onClick={handlePause}
              className="px-2 sm:px-4 py-1 sm:py-2 bg-yellow-600 dark:bg-yellow-500 text-white rounded text-xs sm:text-sm hover:bg-yellow-700 dark:hover:bg-yellow-600 font-medium"
            >
              Pausar
            </button>
          )}
          {isPaused && (
            <button
              onClick={handleResume}
              className="px-2 sm:px-4 py-1 sm:py-2 bg-green-600 dark:bg-green-500 text-white rounded text-xs sm:text-sm hover:bg-green-700 dark:hover:bg-green-600 font-medium"
            >
              Continuar
            </button>
          )}
          {seconds > 0 && (
            <button
              onClick={handleReset}
              className="px-2 sm:px-4 py-1 sm:py-2 bg-gray-600 dark:bg-gray-500 text-white rounded text-xs sm:text-sm hover:bg-gray-700 dark:hover:bg-gray-600 font-medium"
            >
              Reiniciar
            </button>
          )}
        </div>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 sm:h-2">
        <div
          className="bg-blue-600 dark:bg-blue-500 h-1.5 sm:h-2 rounded-full transition-all duration-300"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      {isCompleted && (
        <div className="mt-2 text-center text-green-600 dark:text-green-400 font-semibold text-xs sm:text-sm">
          ¡Tiempo completado!
        </div>
      )}
    </div>
  )
}
