import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface NutritionMeal {
  meal: 'desayuno' | 'almuerzo' | 'merienda' | 'cena'
  score: 0 | 1 | 2 // 0=Mal, 1=Regular, 2=Sano
}

export interface CustomHabitDefinition {
  id: string
  name: string
  emoji?: string
  color?: string // Color asignado automáticamente (ej: 'pink-300', 'rose-400', etc.)
}

export interface DayHabits {
  date: string
  movimiento: boolean
  movimientoRutinaCompletada?: boolean // true si completó la rutina del día, false si solo marcó manualmente
  estudio: boolean
  lectura: boolean
  nutricion: NutritionMeal[]
  nutricionPermitido?: boolean // true si hubo un permitido ese día
  customHabits?: Record<string, boolean> // id del hábito -> completado
}

interface HabitsContextType {
  habits: Record<string, DayHabits>
  customHabitDefinitions: CustomHabitDefinition[]
  updateMovimiento: (date: string, completed: boolean, rutinaCompletada?: boolean) => void
  updateEstudio: (date: string, completed: boolean) => void
  updateLectura: (date: string, completed: boolean) => void
  updateNutricion: (date: string, meals: NutritionMeal[]) => void
  updateNutricionPermitido: (date: string, permitido: boolean) => void
  addCustomHabit: (name: string, emoji?: string) => string
  removeCustomHabit: (id: string) => void
  updateCustomHabit: (date: string, habitId: string, completed: boolean) => void
  getDayHabits: (date: string) => DayHabits
  getNutritionScore: (date: string) => number
  getNutritionColor: (date: string) => string
}

const HabitsContext = createContext<HabitsContextType | undefined>(undefined)

export function HabitsProvider({ children }: { children: ReactNode }) {
  const [habits, setHabits] = useState<Record<string, DayHabits>>(() => {
    const saved = localStorage.getItem('habits')
    return saved ? JSON.parse(saved) : {}
  })

  const [customHabitDefinitions, setCustomHabitDefinitions] = useState<CustomHabitDefinition[]>(() => {
    const saved = localStorage.getItem('customHabitDefinitions')
    return saved ? JSON.parse(saved) : []
  })

  // Guardar en localStorage cuando cambie
  useEffect(() => {
    localStorage.setItem('habits', JSON.stringify(habits))
  }, [habits])

  useEffect(() => {
    localStorage.setItem('customHabitDefinitions', JSON.stringify(customHabitDefinitions))
  }, [customHabitDefinitions])

  const getDayHabits = (date: string): DayHabits => {
    if (!habits[date]) {
      return {
        date,
        movimiento: false,
        movimientoRutinaCompletada: false,
        estudio: false,
        lectura: false,
        nutricion: [],
        nutricionPermitido: false,
        customHabits: {},
      }
    }
    return {
      ...habits[date],
      nutricionPermitido: habits[date].nutricionPermitido || false,
      customHabits: habits[date].customHabits || {},
    }
  }

  const updateMovimiento = (date: string, completed: boolean, rutinaCompletada: boolean = false) => {
    setHabits((prev) => ({
      ...prev,
      [date]: {
        ...getDayHabits(date),
        movimiento: completed,
        movimientoRutinaCompletada: rutinaCompletada,
      },
    }))
  }

  const updateEstudio = (date: string, completed: boolean) => {
    setHabits((prev) => ({
      ...prev,
      [date]: {
        ...getDayHabits(date),
        estudio: completed,
      },
    }))
  }

  const updateLectura = (date: string, completed: boolean) => {
    setHabits((prev) => ({
      ...prev,
      [date]: {
        ...getDayHabits(date),
        lectura: completed,
      },
    }))
  }

  const updateNutricion = (date: string, meals: NutritionMeal[]) => {
    setHabits((prev) => ({
      ...prev,
      [date]: {
        ...getDayHabits(date),
        nutricion: meals,
      },
    }))
  }

  const updateNutricionPermitido = (date: string, permitido: boolean) => {
    setHabits((prev) => ({
      ...prev,
      [date]: {
        ...getDayHabits(date),
        nutricionPermitido: permitido,
      },
    }))
  }

  const getNutritionScore = (date: string): number => {
    const dayHabits = getDayHabits(date)
    return dayHabits.nutricion.reduce((sum, meal) => sum + meal.score, 0)
  }

  const getNutritionColor = (date: string): string => {
    const dayHabits = getDayHabits(date)
    const meals = dayHabits.nutricion
    
    if (meals.length !== 4) return 'gray'
    
    // Contar comidas por tipo
    const sanas = meals.filter(m => m.score === 2).length
    const regulares = meals.filter(m => m.score === 1).length
    const malas = meals.filter(m => m.score === 0).length
    
    // 4 comidas sano: verde
    if (sanas === 4) return 'green'
    
    // 3 comidas sano y 1 regular: amarillo
    if (sanas === 3 && regulares === 1) return 'yellow'
    
    // 2 comidas sanas y 2 regular: naranja
    if (sanas === 2 && regulares === 2) return 'orange'
    
    // 3 comidas sanas y 1 mala: violeta
    if (sanas === 3 && malas === 1) return 'purple'
    
    // 2 comidas sanas y 2 malas: rojo
    if (sanas === 2 && malas === 2) return 'red'
    
    // 1 comida sana y 3 malas: rojo
    if (sanas === 1 && malas === 3) return 'red'
    
    // 4 comidas malas: rojo
    if (malas === 4) return 'red'
    
    // Por defecto rojo
    return 'red'
  }

  const addCustomHabit = (name: string, emoji?: string): string => {
    const id = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    // Colores disponibles (excluyendo los usados por hábitos principales)
    // Hábitos principales usan: emerald-500 (movimiento), orange-500 (nutrición), blue-500 (estudio), violet-500 (lectura)
    const availableColors = [
      'pink-300', 'rose-400', 'fuchsia-400', 'purple-400',
      'indigo-400', 'sky-400', 'cyan-400', 'teal-400',
      'emerald-400', 'lime-400', 'amber-400', 'orange-300',
      'red-400', 'slate-400', 'zinc-400', 'stone-400'
    ]
    
    // Obtener colores ya asignados
    const usedColors = customHabitDefinitions.map(h => h.color).filter(Boolean) as string[]
    
    // Encontrar el primer color disponible
    const assignedColor = availableColors.find(color => !usedColors.includes(color)) || availableColors[0]
    
    const newHabit: CustomHabitDefinition = { id, name, emoji, color: assignedColor }
    setCustomHabitDefinitions((prev) => [...prev, newHabit])
    return id
  }

  const removeCustomHabit = (id: string) => {
    setCustomHabitDefinitions((prev) => prev.filter((h) => h.id !== id))
    // Limpiar el hábito de todos los días
    setHabits((prev) => {
      const updated = { ...prev }
      Object.keys(updated).forEach((date) => {
        if (updated[date].customHabits?.[id] !== undefined) {
          const { [id]: removed, ...rest } = updated[date].customHabits || {}
          updated[date] = {
            ...updated[date],
            customHabits: rest,
          }
        }
      })
      return updated
    })
  }

  const updateCustomHabit = (date: string, habitId: string, completed: boolean) => {
    setHabits((prev) => ({
      ...prev,
      [date]: {
        ...getDayHabits(date),
        customHabits: {
          ...getDayHabits(date).customHabits,
          [habitId]: completed,
        },
      },
    }))
  }

  return (
    <HabitsContext.Provider
      value={{
        habits,
        customHabitDefinitions,
        updateMovimiento,
        updateEstudio,
        updateLectura,
        updateNutricion,
        updateNutricionPermitido,
        addCustomHabit,
        removeCustomHabit,
        updateCustomHabit,
        getDayHabits,
        getNutritionScore,
        getNutritionColor,
      }}
    >
      {children}
    </HabitsContext.Provider>
  )
}

export function useHabits() {
  const context = useContext(HabitsContext)
  if (context === undefined) {
    throw new Error('useHabits must be used within a HabitsProvider')
  }
  return context
}
