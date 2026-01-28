import { useAuth } from './hooks/useAuth'
import { useTheme } from './hooks/useTheme'
import Auth from './components/Auth'
import Dashboard from './components/Dashboard'

function App() {
  // Inicializar tema para aplicar clases desde el inicio
  useTheme()
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-600 dark:text-gray-400">Cargando...</div>
      </div>
    )
  }

  return user ? <Dashboard /> : <Auth />
}

export default App
