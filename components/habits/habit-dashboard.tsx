"use client"

import React from "react"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Check, Dumbbell, Apple, BookOpen, GraduationCap, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

interface Habit {
  id: string
  name: string
  icon: React.ElementType
  color: string
  completedDays: number[]
}

const initialHabits: Habit[] = [
  {
    id: "movimiento",
    name: "Movimiento",
    icon: Dumbbell,
    color: "bg-emerald-500",
    completedDays: [1, 3, 5, 7, 8, 10, 12, 14, 15, 17, 19, 21, 22, 24, 26, 27],
  },
  {
    id: "nutricion",
    name: "Nutrición",
    icon: Apple,
    color: "bg-orange-500",
    completedDays: [1, 2, 4, 5, 6, 8, 9, 11, 13, 15, 16, 18, 20, 22, 23, 25, 27],
  },
  {
    id: "estudio",
    name: "Estudio",
    icon: GraduationCap,
    color: "bg-blue-500",
    completedDays: [2, 4, 6, 9, 11, 13, 16, 18, 20, 23, 25],
  },
  {
    id: "lectura",
    name: "Lectura",
    icon: BookOpen,
    color: "bg-violet-500",
    completedDays: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27],
  },
]

export function HabitDashboard() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 0, 28))
  const [habits, setHabits] = useState(initialHabits)
  const [todayCompleted, setTodayCompleted] = useState<string[]>([])

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      day: "numeric",
      month: "long",
    }
    return date.toLocaleDateString("es-ES", options)
  }

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const goToPreviousDay = () => {
    setCurrentDate(new Date(currentDate.getTime() - 86400000))
  }

  const goToNextDay = () => {
    setCurrentDate(new Date(currentDate.getTime() + 86400000))
  }

  const toggleHabit = (habitId: string) => {
    setTodayCompleted((prev) =>
      prev.includes(habitId) ? prev.filter((id) => id !== habitId) : [...prev, habitId]
    )
  }

  const totalCompleted = todayCompleted.length
  const totalHabits = habits.length
  const completionPercentage = Math.round((totalCompleted / totalHabits) * 100)

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <header className="mb-10">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-foreground">
            Hola, Valeria
          </h1>
          <div className="hidden md:flex items-center gap-2 text-muted-foreground">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Racha: 12 días</span>
          </div>
        </div>
        <p className="text-muted-foreground">
          Continúa construyendo tus hábitos
        </p>
      </header>

      {/* Date Navigation */}
      <div className="flex items-center justify-between mb-8 p-4 bg-card rounded-2xl border border-border">
        <button
          onClick={goToPreviousDay}
          className="p-2 rounded-xl hover:bg-secondary transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <span className="font-semibold text-foreground capitalize">
          {formatDate(currentDate)}
        </span>
        <button
          onClick={goToNextDay}
          className="p-2 rounded-xl hover:bg-secondary transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Progress Summary */}
      <div className="mb-8 p-6 bg-card rounded-2xl border border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Progreso de hoy
          </h3>
          <span className="text-2xl font-bold text-foreground">{completionPercentage}%</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          {totalCompleted} de {totalHabits} hábitos completados
        </p>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
          Marcar hoy
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {habits.map((habit) => {
            const Icon = habit.icon
            const isCompleted = todayCompleted.includes(habit.id)
            return (
              <button
                key={habit.id}
                onClick={() => toggleHabit(habit.id)}
                className={cn(
                  "relative p-4 rounded-2xl border transition-all duration-300",
                  isCompleted
                    ? "bg-primary border-primary"
                    : "bg-card border-border hover:border-primary/50"
                )}
              >
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                      isCompleted ? "bg-primary-foreground/20" : "bg-secondary"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="w-6 h-6 text-primary-foreground" />
                    ) : (
                      <Icon className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-sm font-medium transition-colors",
                      isCompleted ? "text-primary-foreground" : "text-foreground"
                    )}
                  >
                    {habit.name}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Habit Cards with Calendar */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          Calendario mensual
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {habits.map((habit) => {
            const Icon = habit.icon
            const daysInMonth = getDaysInMonth(currentDate)
            const completedCount = habit.completedDays.filter(d => d <= daysInMonth).length
            const percentage = Math.round((completedCount / daysInMonth) * 100)

            return (
              <div
                key={habit.id}
                className="p-5 bg-card rounded-2xl border border-border hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", habit.color)}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">{habit.name}</h4>
                      <p className="text-xs text-muted-foreground">{percentage}% este mes</p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">
                    {completedCount}/{daysInMonth}
                  </span>
                </div>

                {/* Mini Calendar */}
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                    const isCompleted = habit.completedDays.includes(day)
                    const isToday = day === currentDate.getDate()
                    return (
                      <div
                        key={day}
                        className={cn(
                          "aspect-square rounded-md flex items-center justify-center text-xs transition-colors",
                          isCompleted
                            ? habit.color + " text-white"
                            : "bg-secondary text-muted-foreground",
                          isToday && "ring-2 ring-primary ring-offset-1 ring-offset-card"
                        )}
                      >
                        {day}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
