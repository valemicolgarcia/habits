import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

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
  updateMovimiento: (date: string, completed: boolean, rutinaCompletada?: boolean) => void | Promise<void>
  updateEstudio: (date: string, completed: boolean) => void | Promise<void>
  updateLectura: (date: string, completed: boolean) => void | Promise<void>
  updateNutricion: (date: string, meals: NutritionMeal[]) => void | Promise<void>
  updateNutricionPermitido: (date: string, permitido: boolean) => void | Promise<void>
  addCustomHabit: (name: string, emoji?: string) => string | Promise<string>
  removeCustomHabit: (id: string) => void | Promise<void>
  updateCustomHabit: (date: string, habitId: string, completed: boolean) => void | Promise<void>
  getDayHabits: (date: string) => DayHabits
  getNutritionScore: (date: string) => number
  getNutritionColor: (date: string) => string
}

const HabitsContext = createContext<HabitsContextType | undefined>(undefined)

export function HabitsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [habits, setHabits] = useState<Record<string, DayHabits>>({})
  const [customHabitDefinitions, setCustomHabitDefinitions] = useState<CustomHabitDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  // Cargar datos desde Supabase cuando el usuario inicie sesión
  useEffect(() => {
    if (user) {
      loadFromSupabase()
    } else {
      // Si no hay usuario, cargar desde localStorage como fallback
      const savedHabits = localStorage.getItem('habits')
      const savedDefinitions = localStorage.getItem('customHabitDefinitions')
      if (savedHabits) {
        setHabits(JSON.parse(savedHabits))
      }
      if (savedDefinitions) {
        setCustomHabitDefinitions(JSON.parse(savedDefinitions))
      }
      setLoading(false)
    }
  }, [user])

  // Guardar en localStorage cuando cambien los hábitos (siempre, como backup)
  useEffect(() => {
    localStorage.setItem('habits', JSON.stringify(habits))
  }, [habits])

  // Guardar definiciones en localStorage cuando cambien (siempre, como backup)
  useEffect(() => {
    localStorage.setItem('customHabitDefinitions', JSON.stringify(customHabitDefinitions))
  }, [customHabitDefinitions])

  // Cargar hábitos desde Supabase
  const loadFromSupabase = async () => {
    if (!user) return

    try {
      setLoading(true)
      
      // Cargar day_habits
      const { data: habitsData, error: habitsError } = await supabase
        .from('day_habits')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })

      if (habitsError) throw habitsError

      // Convertir datos de Supabase al formato local
      const habitsMap: Record<string, DayHabits> = {}
      if (habitsData) {
        habitsData.forEach((row) => {
          habitsMap[row.date] = {
            date: row.date,
            movimiento: row.movimiento || false,
            movimientoRutinaCompletada: row.movimiento_rutina_completada || false,
            estudio: row.estudio || false,
            lectura: row.lectura || false,
            nutricion: (row.nutricion as NutritionMeal[]) || [],
            nutricionPermitido: row.nutricion_permitido || false,
            customHabits: (row.custom_habits as Record<string, boolean>) || {},
          }
        })
      }

      // Cargar custom_habit_definitions
      const { data: definitionsData, error: definitionsError } = await supabase
        .from('custom_habit_definitions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      if (definitionsError) throw definitionsError

      const definitions: CustomHabitDefinition[] = definitionsData?.map((row) => ({
        id: row.habit_id,
        name: row.name,
        emoji: row.emoji || undefined,
        color: row.color || undefined,
      })) || []

      setHabits(habitsMap)
      setCustomHabitDefinitions(definitions)

      // Migrar datos de localStorage a Supabase si existen
      const localHabits = localStorage.getItem('habits')
      const localDefinitions = localStorage.getItem('customHabitDefinitions')
      
      if (localHabits || localDefinitions) {
        await migrateLocalStorageToSupabase(
          localHabits ? JSON.parse(localHabits) : {},
          localDefinitions ? JSON.parse(localDefinitions) : []
        )
      }
    } catch (error) {
      console.error('Error loading habits from Supabase:', error)
      // Fallback a localStorage si hay error
      const savedHabits = localStorage.getItem('habits')
      const savedDefinitions = localStorage.getItem('customHabitDefinitions')
      if (savedHabits) {
        setHabits(JSON.parse(savedHabits))
      }
      if (savedDefinitions) {
        setCustomHabitDefinitions(JSON.parse(savedDefinitions))
      }
    } finally {
      setLoading(false)
    }
  }

  // Guardar hábitos en Supabase
  const saveToSupabase = async () => {
    if (!user || syncing) return

    try {
      setSyncing(true)
      
      // Guardar cada día de hábitos
      for (const [date, dayHabits] of Object.entries(habits)) {
        const { error } = await supabase
          .from('day_habits')
          .upsert({
            user_id: user.id,
            date: date,
            movimiento: dayHabits.movimiento || false,
            movimiento_rutina_completada: dayHabits.movimientoRutinaCompletada || false,
            estudio: dayHabits.estudio || false,
            lectura: dayHabits.lectura || false,
            nutricion: dayHabits.nutricion || [],
            nutricion_permitido: dayHabits.nutricionPermitido || false,
            custom_habits: dayHabits.customHabits || {},
          }, {
            onConflict: 'user_id,date'
          })

        if (error) {
          console.error(`Error saving day_habits for ${date}:`, error)
        }
      }
    } catch (error) {
      console.error('Error saving habits to Supabase:', error)
    } finally {
      setSyncing(false)
    }
  }

  // Guardar definiciones de hábitos personalizados en Supabase
  const saveCustomHabitDefinitionsToSupabase = async () => {
    if (!user || syncing) return

    try {
      setSyncing(true)
      
      // Guardar cada definición
      for (const definition of customHabitDefinitions) {
        const { error } = await supabase
          .from('custom_habit_definitions')
          .upsert({
            user_id: user.id,
            habit_id: definition.id,
            name: definition.name,
            emoji: definition.emoji || null,
            color: definition.color || null,
          }, {
            onConflict: 'user_id,habit_id'
          })

        if (error) {
          console.error(`Error saving custom habit definition ${definition.id}:`, error)
        }
      }
    } catch (error) {
      console.error('Error saving custom habit definitions to Supabase:', error)
    } finally {
      setSyncing(false)
    }
  }

  // Migrar datos de localStorage a Supabase
  const migrateLocalStorageToSupabase = async (
    localHabits: Record<string, DayHabits>,
    localDefinitions: CustomHabitDefinition[]
  ) => {
    if (!user) return

    try {
      // Migrar hábitos
      for (const [date, dayHabits] of Object.entries(localHabits)) {
        const { error } = await supabase
          .from('day_habits')
          .upsert({
            user_id: user.id,
            date: date,
            movimiento: dayHabits.movimiento || false,
            movimiento_rutina_completada: dayHabits.movimientoRutinaCompletada || false,
            estudio: dayHabits.estudio || false,
            lectura: dayHabits.lectura || false,
            nutricion: dayHabits.nutricion || [],
            nutricion_permitido: dayHabits.nutricionPermitido || false,
            custom_habits: dayHabits.customHabits || {},
          }, {
            onConflict: 'user_id,date'
          })

        if (error) {
          console.error(`Error migrating day_habits for ${date}:`, error)
        }
      }

      // Migrar definiciones
      for (const definition of localDefinitions) {
        const { error } = await supabase
          .from('custom_habit_definitions')
          .upsert({
            user_id: user.id,
            habit_id: definition.id,
            name: definition.name,
            emoji: definition.emoji || null,
            color: definition.color || null,
          }, {
            onConflict: 'user_id,habit_id'
          })

        if (error) {
          console.error(`Error migrating custom habit definition ${definition.id}:`, error)
        }
      }

      // Limpiar localStorage después de migrar (opcional)
      // localStorage.removeItem('habits')
      // localStorage.removeItem('customHabitDefinitions')
    } catch (error) {
      console.error('Error migrating localStorage to Supabase:', error)
    }
  }

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

  const updateMovimiento = async (date: string, completed: boolean, rutinaCompletada: boolean = false) => {
    const currentDayHabits = getDayHabits(date)
    const updatedDayHabits = {
      ...currentDayHabits,
      movimiento: completed,
      movimientoRutinaCompletada: rutinaCompletada,
    }
    const updatedHabits = {
      ...habits,
      [date]: updatedDayHabits,
    }
    setHabits(updatedHabits)

    // Guardar inmediatamente en Supabase si hay usuario
    if (user) {
      try {
        await supabase
          .from('day_habits')
          .upsert({
            user_id: user.id,
            date: date,
            movimiento: completed,
            movimiento_rutina_completada: rutinaCompletada,
            estudio: updatedDayHabits.estudio || false,
            lectura: updatedDayHabits.lectura || false,
            nutricion: updatedDayHabits.nutricion || [],
            nutricion_permitido: updatedDayHabits.nutricionPermitido || false,
            custom_habits: updatedDayHabits.customHabits || {},
          }, {
            onConflict: 'user_id,date'
          })
      } catch (error) {
        console.error('Error saving movimiento to Supabase:', error)
      }
    }
  }

  const updateEstudio = async (date: string, completed: boolean) => {
    const currentDayHabits = getDayHabits(date)
    const updatedDayHabits = {
      ...currentDayHabits,
      estudio: completed,
    }
    const updatedHabits = {
      ...habits,
      [date]: updatedDayHabits,
    }
    setHabits(updatedHabits)

    if (user) {
      try {
        await supabase
          .from('day_habits')
          .upsert({
            user_id: user.id,
            date: date,
            movimiento: updatedDayHabits.movimiento || false,
            movimiento_rutina_completada: updatedDayHabits.movimientoRutinaCompletada || false,
            estudio: completed,
            lectura: updatedDayHabits.lectura || false,
            nutricion: updatedDayHabits.nutricion || [],
            nutricion_permitido: updatedDayHabits.nutricionPermitido || false,
            custom_habits: updatedDayHabits.customHabits || {},
          }, {
            onConflict: 'user_id,date'
          })
      } catch (error) {
        console.error('Error saving estudio to Supabase:', error)
      }
    }
  }

  const updateLectura = async (date: string, completed: boolean) => {
    const currentDayHabits = getDayHabits(date)
    const updatedDayHabits = {
      ...currentDayHabits,
      lectura: completed,
    }
    const updatedHabits = {
      ...habits,
      [date]: updatedDayHabits,
    }
    setHabits(updatedHabits)

    if (user) {
      try {
        await supabase
          .from('day_habits')
          .upsert({
            user_id: user.id,
            date: date,
            movimiento: updatedDayHabits.movimiento || false,
            movimiento_rutina_completada: updatedDayHabits.movimientoRutinaCompletada || false,
            estudio: updatedDayHabits.estudio || false,
            lectura: completed,
            nutricion: updatedDayHabits.nutricion || [],
            nutricion_permitido: updatedDayHabits.nutricionPermitido || false,
            custom_habits: updatedDayHabits.customHabits || {},
          }, {
            onConflict: 'user_id,date'
          })
      } catch (error) {
        console.error('Error saving lectura to Supabase:', error)
      }
    }
  }

  const updateNutricion = async (date: string, meals: NutritionMeal[]) => {
    const currentDayHabits = getDayHabits(date)
    const updatedDayHabits = {
      ...currentDayHabits,
      nutricion: meals,
    }
    const updatedHabits = {
      ...habits,
      [date]: updatedDayHabits,
    }
    setHabits(updatedHabits)

    if (user) {
      try {
        await supabase
          .from('day_habits')
          .upsert({
            user_id: user.id,
            date: date,
            movimiento: updatedDayHabits.movimiento || false,
            movimiento_rutina_completada: updatedDayHabits.movimientoRutinaCompletada || false,
            estudio: updatedDayHabits.estudio || false,
            lectura: updatedDayHabits.lectura || false,
            nutricion: meals,
            nutricion_permitido: updatedDayHabits.nutricionPermitido || false,
            custom_habits: updatedDayHabits.customHabits || {},
          }, {
            onConflict: 'user_id,date'
          })
      } catch (error) {
        console.error('Error saving nutricion to Supabase:', error)
      }
    }
  }

  const updateNutricionPermitido = async (date: string, permitido: boolean) => {
    const currentDayHabits = getDayHabits(date)
    const updatedDayHabits = {
      ...currentDayHabits,
      nutricionPermitido: permitido,
    }
    const updatedHabits = {
      ...habits,
      [date]: updatedDayHabits,
    }
    setHabits(updatedHabits)

    if (user) {
      try {
        await supabase
          .from('day_habits')
          .upsert({
            user_id: user.id,
            date: date,
            movimiento: updatedDayHabits.movimiento || false,
            movimiento_rutina_completada: updatedDayHabits.movimientoRutinaCompletada || false,
            estudio: updatedDayHabits.estudio || false,
            lectura: updatedDayHabits.lectura || false,
            nutricion: updatedDayHabits.nutricion || [],
            nutricion_permitido: permitido,
            custom_habits: updatedDayHabits.customHabits || {},
          }, {
            onConflict: 'user_id,date'
          })
      } catch (error) {
        console.error('Error saving nutricion_permitido to Supabase:', error)
      }
    }
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

  const addCustomHabit = async (name: string, emoji?: string): Promise<string> => {
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

    // Guardar en Supabase
    if (user) {
      try {
        await supabase
          .from('custom_habit_definitions')
          .insert({
            user_id: user.id,
            habit_id: id,
            name: name,
            emoji: emoji || null,
            color: assignedColor || null,
          })
      } catch (error) {
        console.error('Error saving custom habit definition to Supabase:', error)
      }
    }

    return id
  }

  const removeCustomHabit = async (id: string) => {
    setCustomHabitDefinitions((prev) => prev.filter((h) => h.id !== id))
    
    // Limpiar el hábito de todos los días
    const updatedHabits = { ...habits }
    Object.keys(updatedHabits).forEach((date) => {
      if (updatedHabits[date].customHabits?.[id] !== undefined) {
        const { [id]: removed, ...rest } = updatedHabits[date].customHabits || {}
        updatedHabits[date] = {
          ...updatedHabits[date],
          customHabits: rest,
        }
      }
    })
    setHabits(updatedHabits)

    // Eliminar de Supabase
    if (user) {
      try {
        // Eliminar definición
        await supabase
          .from('custom_habit_definitions')
          .delete()
          .eq('user_id', user.id)
          .eq('habit_id', id)

        // Actualizar todos los días que tenían este hábito
        for (const [date, dayHabits] of Object.entries(updatedHabits)) {
          if (dayHabits.customHabits && dayHabits.customHabits[id] !== undefined) {
            await supabase
              .from('day_habits')
              .upsert({
                user_id: user.id,
                date: date,
                movimiento: dayHabits.movimiento || false,
                movimiento_rutina_completada: dayHabits.movimientoRutinaCompletada || false,
                estudio: dayHabits.estudio || false,
                lectura: dayHabits.lectura || false,
                nutricion: dayHabits.nutricion || [],
                nutricion_permitido: dayHabits.nutricionPermitido || false,
                custom_habits: dayHabits.customHabits || {},
              }, {
                onConflict: 'user_id,date'
              })
          }
        }
      } catch (error) {
        console.error('Error removing custom habit from Supabase:', error)
      }
    }
  }

  const updateCustomHabit = async (date: string, habitId: string, completed: boolean) => {
    const currentDayHabits = getDayHabits(date)
    const updatedDayHabits = {
      ...currentDayHabits,
      customHabits: {
        ...currentDayHabits.customHabits,
        [habitId]: completed,
      },
    }
    const updatedHabits = {
      ...habits,
      [date]: updatedDayHabits,
    }
    setHabits(updatedHabits)

    if (user) {
      try {
        await supabase
          .from('day_habits')
          .upsert({
            user_id: user.id,
            date: date,
            movimiento: updatedDayHabits.movimiento || false,
            movimiento_rutina_completada: updatedDayHabits.movimientoRutinaCompletada || false,
            estudio: updatedDayHabits.estudio || false,
            lectura: updatedDayHabits.lectura || false,
            nutricion: updatedDayHabits.nutricion || [],
            nutricion_permitido: updatedDayHabits.nutricionPermitido || false,
            custom_habits: updatedDayHabits.customHabits || {},
          }, {
            onConflict: 'user_id,date'
          })
      } catch (error) {
        console.error('Error saving custom habit to Supabase:', error)
      }
    }
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
