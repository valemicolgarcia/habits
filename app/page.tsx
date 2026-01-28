"use client"

import { useState } from "react"
import { Sidebar } from "@/components/habits/sidebar"
import { HabitDashboard } from "@/components/habits/habit-dashboard"

export default function HabitsPage() {
  const [activeSection, setActiveSection] = useState("inicio")

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />
      <main className="flex-1 p-6 md:p-10">
        <HabitDashboard />
      </main>
    </div>
  )
}
