import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useHabits } from '../contexts/HabitsContext'
import { useUserProfile } from '../contexts/UserProfileContext'
import { useTheme } from '../hooks/useTheme'
import { formatDate } from '../lib/utils'
import { chatRAG, type ChatMessage } from '../lib/ragApi'
import { Home, Dumbbell, Apple, BookOpen, GraduationCap, User, LogOut, Menu, X, ChevronLeft, ChevronRight, Plus, Moon, Sun, Send, Loader2 } from 'lucide-react'
import UserProfile from './UserProfile'
import HabitGrid from './HabitGrid'
import MovementSection from './MovementSection'
import NutritionPage from './NutritionPage'
import NutritionHistory from './NutritionHistory'
import StudyPage from './StudyPage'
import ReadingPage from './ReadingPage'

type Section = 'home' | 'movimiento' | 'nutricion' | 'nutricion-historial' | 'estudio' | 'lectura' | 'perfil'

export default function MainDashboard() {
    const { signOut } = useAuth()
    const { getNutritionColor, getDayHabits, updateEstudio, updateLectura, updateMovimiento, customHabitDefinitions, addCustomHabit, updateCustomHabit } = useHabits()
    const { name, profileImage } = useUserProfile()
    const { theme, toggleTheme } = useTheme()
    const [currentSection, setCurrentSection] = useState<Section>('home')
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [selectedDate, setSelectedDate] = useState(new Date())
    const [showAddHabitModal, setShowAddHabitModal] = useState(false)
    const [newHabitName, setNewHabitName] = useState('')
    const [newHabitEmoji, setNewHabitEmoji] = useState('')
    const [nutritionHistoryKey, setNutritionHistoryKey] = useState(0)
    const selectedDateStr = formatDate(selectedDate)
    const dayHabits = getDayHabits(selectedDateStr)
    const [estudioCompleted, setEstudioCompleted] = useState(dayHabits.estudio)
    const [lecturaCompleted, setLecturaCompleted] = useState(dayHabits.lectura)
    const [movimientoManual, setMovimientoManual] = useState(dayHabits.movimiento && !dayHabits.movimientoRutinaCompletada)
    const [ragMessages, setRagMessages] = useState<ChatMessage[]>([])
    const [ragInput, setRagInput] = useState('')
    const [ragLoading, setRagLoading] = useState(false)
    const ragMessagesEndRef = useRef<HTMLDivElement>(null)

    // Sincronizar estado cuando cambien los hábitos o la fecha seleccionada
    useEffect(() => {
        const currentHabits = getDayHabits(selectedDateStr)
        setEstudioCompleted(currentHabits.estudio)
        setLecturaCompleted(currentHabits.lectura)
        setMovimientoManual(currentHabits.movimiento && !currentHabits.movimientoRutinaCompletada)
    }, [selectedDateStr, getDayHabits])

    // Scroll al final del chat cuando hay nuevos mensajes
    useEffect(() => {
        ragMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [ragMessages])

    const handleRAGSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!ragInput.trim() || ragLoading) return

        const userMessage: ChatMessage = { role: 'user', content: ragInput.trim() }
        const newMessages = [...ragMessages, userMessage]
        setRagMessages(newMessages)
        setRagInput('')
        setRagLoading(true)

        try {
            const response = await chatRAG(userMessage.content, ragMessages)
            const assistantMessage: ChatMessage = { role: 'assistant', content: response }
            setRagMessages([...newMessages, assistantMessage])
        } catch (error) {
            const errorMessage: ChatMessage = {
                role: 'assistant',
                content: `Error: ${error instanceof Error ? error.message : 'No se pudo obtener respuesta'}`,
            }
            setRagMessages([...newMessages, errorMessage])
        } finally {
            setRagLoading(false)
        }
    }

    const getNutritionButtonColor = () => {
        const dayHabitsForDate = getDayHabits(selectedDateStr)
        // Si no hay 4 comidas completadas, mostrar gris como los demás botones
        if (dayHabitsForDate.nutricion.length < 4) {
            return 'bg-card border-border hover:border-primary/50'
        }
        // Si hay 4 comidas, mostrar el color según el score
        const color = getNutritionColor(selectedDateStr)
        if (color === 'green') return 'bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-600'
        if (color === 'yellow') return 'bg-yellow-600 dark:bg-yellow-500 hover:bg-yellow-700 dark:hover:bg-yellow-600'
        if (color === 'purple') return 'bg-purple-600 dark:bg-purple-500 hover:bg-purple-700 dark:hover:bg-purple-600'
        return 'bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600'
    }

    const isNutritionCompleted = () => {
        const dayHabitsForDate = getDayHabits(selectedDateStr)
        return dayHabitsForDate.nutricion.length === 4
    }

    // Calcular hábitos completados para la fecha seleccionada
    const todayStr = formatDate(new Date())
    const isToday = selectedDateStr === todayStr
    const isFuture = selectedDateStr > todayStr
    const isPast = selectedDateStr < todayStr
    const canModify = !isFuture // Se puede modificar si no es futuro (hoy o pasado)

    // Calcular progreso para la fecha seleccionada (solo mostrar si es hoy)
    const todayCompleted = []
    if (isToday) {
        // Usar estado local si estamos viendo la fecha de hoy para reflejar cambios inmediatos
        if (movimientoManual || dayHabits.movimiento) todayCompleted.push('movimiento')
        if (estudioCompleted) todayCompleted.push('estudio')
        if (lecturaCompleted) todayCompleted.push('lectura')
        // Nutrición solo cuenta si hay 4 comidas completadas
        if (dayHabits.nutricion.length === 4) todayCompleted.push('nutricion')
    }

    const handleDateChange = (days: number) => {
        const newDate = new Date(selectedDate)
        newDate.setDate(newDate.getDate() + days)
        setSelectedDate(newDate)
    }

    const goToToday = () => {
        setSelectedDate(new Date())
    }

    const handleEstudioToggle = () => {
        const newValue = !estudioCompleted
        setEstudioCompleted(newValue)
        updateEstudio(selectedDateStr, newValue)
    }

    const handleLecturaToggle = () => {
        const newValue = !lecturaCompleted
        setLecturaCompleted(newValue)
        updateLectura(selectedDateStr, newValue)
    }

  const handleMovimientoToggle = () => {
    const newValue = !movimientoManual
    setMovimientoManual(newValue)
    // Si marca manualmente, no es rutina completada
    updateMovimiento(selectedDateStr, newValue, false)
  }

  const handleCustomHabitToggle = (habitId: string) => {
    const currentHabits = getDayHabits(selectedDateStr)
    const currentCompleted = currentHabits.customHabits?.[habitId] || false
    updateCustomHabit(selectedDateStr, habitId, !currentCompleted)
  }

    if (currentSection === 'perfil') {
        return <UserProfile onBack={() => setCurrentSection('home')} />
    }

    if (currentSection === 'movimiento') {
        return <MovementSection onBack={() => setCurrentSection('home')} />
    }

    if (currentSection === 'nutricion-historial') {
        return (
            <NutritionHistory
                onBack={() => setCurrentSection('nutricion')}
                refreshKey={nutritionHistoryKey}
            />
        )
    }

    if (currentSection === 'nutricion') {
        return (
            <NutritionPage
                onBack={() => setCurrentSection('home')}
                date={selectedDateStr}
                onOpenHistory={() => {
                    setNutritionHistoryKey((k) => k + 1)
                    setCurrentSection('nutricion-historial')
                }}
            />
        )
    }

    if (currentSection === 'estudio') {
        return <StudyPage onBack={() => setCurrentSection('home')} />
    }

    if (currentSection === 'lectura') {
        return <ReadingPage onBack={() => setCurrentSection('home')} />
    }

    const navItems = [
        { id: 'home', label: 'Inicio', icon: Home },
        { id: 'movimiento', label: 'Movimiento', icon: Dumbbell },
        { id: 'nutricion', label: 'Nutrición', icon: Apple },
        { id: 'estudio', label: 'Profesional', icon: GraduationCap },
        { id: 'lectura', label: 'Lectura', icon: BookOpen },
    ]

    return (
        <div className="flex min-h-screen bg-background">
            {/* Mobile menu button */}
            <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="fixed top-2 left-2 md:top-4 md:left-4 z-50 p-1.5 md:p-2 rounded-lg md:rounded-xl bg-card border border-border md:hidden shadow-sm"
            >
                {sidebarOpen ? <X className="w-4 h-4 md:w-5 md:h-5" /> : <Menu className="w-4 h-4 md:w-5 md:h-5" />}
            </button>

            {/* Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-30 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    } md:translate-x-0 fixed md:sticky top-0 left-0 z-40 h-screen w-52 md:w-48 bg-card border-r border-border p-2 md:p-3 flex flex-col transition-transform duration-300 ease-out`}
            >
                {/* User info */}
                <div className="flex items-center gap-2 mb-4 md:mb-5 mt-6 md:mt-0">
                    {profileImage ? (
                        <img
                            src={profileImage}
                            alt="Perfil"
                            className="w-8 h-8 md:w-9 md:h-9 rounded-lg object-cover cursor-pointer"
                            onClick={() => {
                                setCurrentSection('perfil')
                                setSidebarOpen(false)
                            }}
                        />
                    ) : (
                        <div
                            className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-primary/10 flex items-center justify-center cursor-pointer"
                            onClick={() => {
                                setCurrentSection('perfil')
                                setSidebarOpen(false)
                            }}
                        >
                            <span className="text-sm md:text-base font-semibold text-primary">{name.charAt(0).toUpperCase()}</span>
                        </div>
                    )}
                    <div className="min-w-0 flex-1">
                        <h2 className="font-semibold text-xs md:text-sm text-foreground truncate">{name}</h2>
                        <p className="text-[10px] md:text-xs text-muted-foreground">Premium</p>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 space-y-0.5 md:space-y-1">
                    {navItems.map((item) => {
                        const Icon = item.icon
                        const isActive = currentSection === item.id
                        return (
                            <button
                                key={item.id}
                                onClick={() => {
                                    setCurrentSection(item.id as Section)
                                    setSidebarOpen(false)
                                }}
                                className={`w-full flex items-center gap-2 px-2 md:px-3 py-1.5 md:py-2 rounded-lg text-left transition-all duration-200 text-xs md:text-sm ${isActive
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                                    }`}
                            >
                                <Icon className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" />
                                <span className="font-medium truncate">{item.label}</span>
                            </button>
                        )
                    })}
                </nav>

                {/* Bottom section */}
                <div className="space-y-0.5 md:space-y-1 pt-3 md:pt-4 border-t border-border">
                    <button
                        onClick={toggleTheme}
                        className="w-full flex items-center gap-2 px-2 md:px-3 py-1.5 md:py-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-200 text-xs md:text-sm"
                        aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                    >
                        {theme === 'dark' ? (
                            <Sun className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" />
                        ) : (
                            <Moon className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" />
                        )}
                        <span className="font-medium">{theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}</span>
                    </button>
                    <button
                        onClick={() => {
                            setCurrentSection('perfil')
                            setSidebarOpen(false)
                        }}
                        className="w-full flex items-center gap-2 px-2 md:px-3 py-1.5 md:py-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-200 text-xs md:text-sm"
                    >
                        <User className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" />
                        <span className="font-medium">Perfil</span>
                    </button>
                    <button
                        onClick={async () => {
                            await signOut()
                        }}
                        className="w-full flex items-center gap-2 px-2 md:px-3 py-1.5 md:py-2 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200 text-xs md:text-sm"
                    >
                        <LogOut className="w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0" />
                        <span className="font-medium">Salir</span>
                    </button>
                </div>
            </aside>

            {/* Contenido principal */}
            <main className="flex-1 p-2 md:p-3 lg:p-4 overflow-y-auto">

                {currentSection === 'home' && (
                    <div className="max-w-6xl mx-auto">
                        {/* Header */}
                        <header className="mb-2 md:mb-3 flex items-start justify-between gap-2">
                            <div className="flex-1">
                                <h1 className="text-lg md:text-xl lg:text-2xl font-bold text-foreground mb-0.5 md:mb-1">
                                    Hola, {name}
                                </h1>
                                <p className="text-[10px] md:text-xs text-muted-foreground">
                                    Continúa construyendo tus hábitos
                                </p>
                            </div>
                            {/* Botón de modo oscuro/claro */}
                            <button
                                onClick={toggleTheme}
                                className="p-2 rounded-lg bg-card border border-border hover:bg-secondary transition-all duration-200 flex-shrink-0"
                                aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                                title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
                            >
                                {theme === 'dark' ? (
                                    <Sun className="w-4 h-4 md:w-5 md:h-5 text-foreground" />
                                ) : (
                                    <Moon className="w-4 h-4 md:w-5 md:h-5 text-foreground" />
                                )}
                            </button>
                        </header>

                        {/* Date Navigation */}
                        <div className="flex items-center justify-between mb-2 md:mb-3 p-1.5 md:p-2 bg-card rounded-lg md:rounded-xl border border-border">
                            <button
                                onClick={() => handleDateChange(-1)}
                                className="p-1 md:p-1.5 rounded-md hover:bg-secondary transition-colors"
                                aria-label="Día anterior"
                            >
                                <ChevronLeft className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground" />
                            </button>
                            <button
                                onClick={goToToday}
                                className={`font-semibold text-[10px] md:text-xs lg:text-sm text-foreground capitalize transition-colors px-1 ${!isToday ? 'hover:text-primary' : ''
                                    }`}
                            >
                                {selectedDate.toLocaleDateString('es-ES', {
                                    weekday: 'short',
                                    day: 'numeric',
                                    month: 'short',
                                })}
                            </button>
                            <button
                                onClick={() => handleDateChange(1)}
                                className="p-1 md:p-1.5 rounded-md hover:bg-secondary transition-colors"
                                aria-label="Día siguiente"
                            >
                                <ChevronRight className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground" />
                            </button>
                        </div>

                        {/* RAG Chat - Barra de preguntas sobre nutrición y entrenamiento */}
                        <div className="mb-2 md:mb-3 bg-card rounded-lg md:rounded-xl border border-border overflow-hidden">
                            <div className="p-2 md:p-3">
                                <h3 className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 md:mb-2">
                                    Pregunta sobre nutrición y entrenamiento
                                </h3>
                                {/* Mensajes del chat */}
                                {ragMessages.length > 0 && (
                                    <div className="max-h-48 md:max-h-64 overflow-y-auto mb-2 md:mb-3 space-y-2 pr-1">
                                        {ragMessages.map((msg, idx) => (
                                            <div
                                                key={idx}
                                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                            >
                                                <div
                                                    className={`max-w-[85%] md:max-w-[75%] rounded-lg px-2 md:px-3 py-1.5 md:py-2 text-[10px] md:text-xs ${
                                                        msg.role === 'user'
                                                            ? 'bg-primary text-primary-foreground'
                                                            : 'bg-secondary text-foreground'
                                                    }`}
                                                >
                                                    {msg.content}
                                                </div>
                                            </div>
                                        ))}
                                        {ragLoading && (
                                            <div className="flex justify-start">
                                                <div className="bg-secondary text-foreground rounded-lg px-2 md:px-3 py-1.5 md:py-2 flex items-center gap-2">
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                    <span className="text-[10px] md:text-xs">Pensando...</span>
                                                </div>
                                            </div>
                                        )}
                                        <div ref={ragMessagesEndRef} />
                                    </div>
                                )}
                                {/* Input y botón de envío */}
                                <form onSubmit={handleRAGSubmit} className="flex gap-1.5 md:gap-2">
                                    <input
                                        type="text"
                                        value={ragInput}
                                        onChange={(e) => setRagInput(e.target.value)}
                                        placeholder="Ej: ¿Cuántas proteínas necesito al día?"
                                        disabled={ragLoading}
                                        className="flex-1 px-2 md:px-3 py-1.5 md:py-2 text-[10px] md:text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!ragInput.trim() || ragLoading}
                                        className="px-2 md:px-3 py-1.5 md:py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                    >
                                        {ragLoading ? (
                                            <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" />
                                        ) : (
                                            <Send className="w-3 h-3 md:w-4 md:h-4" />
                                        )}
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* Progress Summary - Solo mostrar si estamos viendo la fecha de hoy */}
                        {isToday && (
                            <div className="mb-2 md:mb-3 p-2 md:p-3 bg-card rounded-lg md:rounded-xl border border-border">
                                <div className="flex items-center justify-between mb-1.5 md:mb-2">
                                    <h3 className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                        Progreso de hoy
                                    </h3>
                                    <span className="text-base md:text-lg lg:text-xl font-bold text-foreground">
                                        {Math.round((todayCompleted.length / 4) * 100)}%
                                    </span>
                                </div>
                                <div className="h-1 md:h-1.5 bg-secondary rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                                        style={{ width: `${Math.round((todayCompleted.length / 4) * 100)}%` }}
                                    />
                                </div>
                                <p className="mt-1.5 md:mt-2 text-[10px] md:text-xs text-muted-foreground">
                                    {todayCompleted.length} de 4 hábitos completados
                                </p>
                            </div>
                        )}

                        {/* Quick Actions */}
                        <div className="mb-2 md:mb-3">
                            <h3 className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5 md:mb-2">
                                {isToday ? 'Marcar hoy' : isPast ? 'Marcar día seleccionado' : 'No se puede modificar días futuros'}
                            </h3>
                            {isFuture && (
                                <p className="text-[10px] md:text-xs text-muted-foreground mb-2">
                                    Solo puedes modificar días pasados o el día actual
                                </p>
                            )}
                            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-1.5 md:gap-2">
                                <button
                                    onClick={canModify ? handleMovimientoToggle : undefined}
                                    disabled={!canModify}
                                    className={`relative min-w-0 w-full p-1.5 md:p-2 lg:p-2.5 rounded-lg md:rounded-xl border-2 transition-all duration-300 ${movimientoManual
                                            ? 'bg-primary border-primary'
                                            : 'bg-card border-border hover:border-primary/50'
                                        } ${!canModify ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <div className="flex flex-col items-center gap-0.5 md:gap-1">
                                        <div
                                            className={`w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-9 lg:h-9 rounded-md md:rounded-lg flex items-center justify-center transition-colors ${movimientoManual ? 'bg-primary-foreground/20' : 'bg-secondary'
                                                }`}
                                        >
                                            {movimientoManual ? (
                                                <Dumbbell className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5 text-primary-foreground" />
                                            ) : (
                                                <Dumbbell className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5 text-muted-foreground" />
                                            )}
                                        </div>
                                        <span
                                            className={`text-[9px] sm:text-[10px] md:text-xs font-medium transition-colors ${movimientoManual ? 'text-primary-foreground' : 'text-foreground'
                                                }`}
                                        >
                                            Movimiento
                                        </span>
                                    </div>
                                </button>

                                <button
                                    onClick={canModify ? handleEstudioToggle : undefined}
                                    disabled={!canModify}
                                    className={`relative min-w-0 w-full p-1.5 md:p-2 lg:p-2.5 rounded-lg md:rounded-xl border-2 transition-all duration-300 ${estudioCompleted
                                            ? 'bg-primary border-primary'
                                            : 'bg-card border-border hover:border-primary/50'
                                        } ${!canModify ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <div className="flex flex-col items-center gap-0.5 md:gap-1">
                                        <div
                                            className={`w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-9 lg:h-9 rounded-md md:rounded-lg flex items-center justify-center transition-colors ${estudioCompleted ? 'bg-primary-foreground/20' : 'bg-secondary'
                                                }`}
                                        >
                                            {estudioCompleted ? (
                                                <GraduationCap className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5 text-primary-foreground" />
                                            ) : (
                                                <GraduationCap className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5 text-muted-foreground" />
                                            )}
                                        </div>
                                        <span
                                            className={`text-[9px] sm:text-[10px] md:text-xs font-medium transition-colors ${estudioCompleted ? 'text-primary-foreground' : 'text-foreground'
                                                }`}
                                        >
                                            Profesional
                                        </span>
                                    </div>
                                </button>

                                <button
                                    onClick={canModify ? () => setCurrentSection('nutricion') : undefined}
                                    disabled={!canModify}
                                    className={`relative min-w-0 w-full p-1.5 md:p-2 lg:p-2.5 rounded-lg md:rounded-xl border-2 transition-all duration-300 ${getNutritionButtonColor()} ${!canModify ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <div className="flex flex-col items-center gap-0.5 md:gap-1">
                                        <div
                                            className={`w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-9 lg:h-9 rounded-md md:rounded-lg flex items-center justify-center transition-colors ${isNutritionCompleted() ? 'bg-white/20' : 'bg-secondary'
                                                }`}
                                        >
                                            <Apple
                                                className={`w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5 ${isNutritionCompleted() ? 'text-white' : 'text-muted-foreground'
                                                    }`}
                                            />
                                        </div>
                                        <span
                                            className={`text-[9px] sm:text-[10px] md:text-xs font-medium transition-colors ${isNutritionCompleted() ? 'text-white' : 'text-foreground'
                                                }`}
                                        >
                                            Nutrición
                                        </span>
                                    </div>
                                </button>

                                <button
                                    onClick={canModify ? handleLecturaToggle : undefined}
                                    disabled={!canModify}
                                    className={`relative min-w-0 w-full p-1.5 md:p-2 lg:p-2.5 rounded-lg md:rounded-xl border-2 transition-all duration-300 ${lecturaCompleted
                                            ? 'bg-primary border-primary'
                                            : 'bg-card border-border hover:border-primary/50'
                                        } ${!canModify ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <div className="flex flex-col items-center gap-0.5 md:gap-1">
                                        <div
                                            className={`w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-9 lg:h-9 rounded-md md:rounded-lg flex items-center justify-center transition-colors ${lecturaCompleted ? 'bg-primary-foreground/20' : 'bg-secondary'
                                                }`}
                                        >
                                            {lecturaCompleted ? (
                                                <BookOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5 text-primary-foreground" />
                                            ) : (
                                                <BookOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 lg:w-5 lg:h-5 text-muted-foreground" />
                                            )}
                                        </div>
                                        <span
                                            className={`text-[9px] sm:text-[10px] md:text-xs font-medium transition-colors ${lecturaCompleted ? 'text-primary-foreground' : 'text-foreground'
                                                }`}
                                        >
                                            Lectura
                                        </span>
                                    </div>
                                </button>
                            </div>
                            
                            {/* Segunda fila: Botones de hábitos personalizados */}
                            {customHabitDefinitions.length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-1.5 md:gap-2 mt-1.5 md:mt-2">
                                    {customHabitDefinitions.map((customHabit) => {
                                        const currentHabits = getDayHabits(selectedDateStr)
                                        const isCompleted = currentHabits.customHabits?.[customHabit.id] || false
                                        return (
                                            <button
                                                key={customHabit.id}
                                                onClick={canModify ? () => handleCustomHabitToggle(customHabit.id) : undefined}
                                                disabled={!canModify}
                                                className={`relative min-w-0 w-full p-1.5 md:p-2 lg:p-2.5 rounded-lg md:rounded-xl border-2 transition-all duration-300 ${
                                                    isCompleted
                                                        ? 'bg-primary border-primary'
                                                        : 'bg-card border-border hover:border-primary/50'
                                                } ${!canModify ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                <div className="flex flex-col items-center gap-0.5 md:gap-1">
                                                    <div
                                                        className={`w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-9 lg:h-9 rounded-md md:rounded-lg flex items-center justify-center transition-colors ${
                                                            isCompleted ? 'bg-primary-foreground/20' : 'bg-secondary'
                                                        }`}
                                                    >
                                                        {customHabit.emoji ? (
                                                            <span className="text-base sm:text-lg md:text-xl">{customHabit.emoji}</span>
                                                        ) : (
                                                            <span className="text-xs sm:text-sm md:text-base">✓</span>
                                                        )}
                                                    </div>
                                                    <span
                                                        className={`text-[9px] sm:text-[10px] md:text-xs font-medium transition-colors text-center break-words ${
                                                            isCompleted ? 'text-primary-foreground' : 'text-foreground'
                                                        }`}
                                                    >
                                                        {customHabit.name}
                                                    </span>
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Grillas de Hábitos */}
                        <div className="space-y-1.5 md:space-y-2">
                            <h3 className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                Calendario mensual
                            </h3>
                            {/* Primera fila: Hábitos principales */}
                            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-1.5 md:gap-2">
                                <HabitGrid habit="movimiento" />
                                <HabitGrid habit="estudio" />
                                <HabitGrid habit="nutricion" />
                                <HabitGrid habit="lectura" />
                            </div>
                            {/* Segunda fila: Hábitos personalizados */}
                            {customHabitDefinitions.length > 0 && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-1.5 md:gap-2">
                                    {customHabitDefinitions.map((customHabit) => (
                                        <HabitGrid key={customHabit.id} habit={customHabit.id as any} customHabit={customHabit} />
                                    ))}
                                </div>
                            )}
                            {/* Botón para agregar hábito */}
                            <button
                                onClick={() => setShowAddHabitModal(true)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] md:text-xs text-muted-foreground hover:text-foreground border border-dashed border-border rounded-lg hover:border-primary/50 transition-colors w-fit"
                            >
                                <Plus className="w-3 h-3 md:w-4 md:h-4" />
                                <span>Agregar hábito</span>
                            </button>
                        </div>
                    </div>
                )}
            </main>

            {/* Modal para agregar hábito */}
            {showAddHabitModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-card border border-border rounded-xl p-4 md:p-6 max-w-md w-full shadow-lg">
                        <h3 className="text-lg font-bold text-foreground mb-4">Agregar nuevo hábito</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1.5">
                                    Nombre del hábito
                                </label>
                                <input
                                    type="text"
                                    value={newHabitName}
                                    onChange={(e) => setNewHabitName(e.target.value)}
                                    placeholder="Ej: Meditación"
                                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-1.5">
                                    Emoji (opcional)
                                </label>
                                <input
                                    type="text"
                                    value={newHabitEmoji}
                                    onChange={(e) => setNewHabitEmoji(e.target.value)}
                                    placeholder="Ej: 🧘"
                                    maxLength={2}
                                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            <div className="flex gap-2 justify-end">
                                <button
                                    onClick={() => {
                                        setShowAddHabitModal(false)
                                        setNewHabitName('')
                                        setNewHabitEmoji('')
                                    }}
                                    className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => {
                                        if (newHabitName.trim()) {
                                            addCustomHabit(newHabitName.trim(), newHabitEmoji.trim() || undefined)
                                            setShowAddHabitModal(false)
                                            setNewHabitName('')
                                            setNewHabitEmoji('')
                                        }
                                    }}
                                    disabled={!newHabitName.trim()}
                                    className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Agregar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
