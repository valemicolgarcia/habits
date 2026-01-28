"use client"

import { cn } from "@/lib/utils"
import { Home, Dumbbell, Apple, BookOpen, GraduationCap, User, LogOut, Menu, X } from "lucide-react"
import { useState } from "react"

interface SidebarProps {
  activeSection: string
  onSectionChange: (section: string) => void
}

const navItems = [
  { id: "inicio", label: "Inicio", icon: Home },
  { id: "movimiento", label: "Movimiento", icon: Dumbbell },
  { id: "nutricion", label: "Nutrición", icon: Apple },
  { id: "estudio", label: "Estudio", icon: GraduationCap },
  { id: "lectura", label: "Lectura", icon: BookOpen },
]

export function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 p-2 rounded-xl bg-card border border-border md:hidden"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed md:sticky top-0 left-0 z-40 h-screen w-72 bg-card border-r border-border p-6 flex flex-col transition-transform duration-300 ease-out",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* User info */}
        <div className="flex items-center gap-4 mb-10 mt-10 md:mt-0">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <span className="text-lg font-semibold text-primary">V</span>
          </div>
          <div>
            <h2 className="font-semibold text-foreground">Valeria</h2>
            <p className="text-sm text-muted-foreground">Premium</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeSection === item.id
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSectionChange(item.id)
                  setIsOpen(false)
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            )
          })}
        </nav>

        {/* Bottom section */}
        <div className="space-y-2 pt-6 border-t border-border">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-200">
            <User className="w-5 h-5" />
            <span className="font-medium">Perfil</span>
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200">
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Salir</span>
          </button>
        </div>
      </aside>
    </>
  )
}
