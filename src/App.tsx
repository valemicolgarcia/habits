import { useAuth } from './hooks/useAuth'
import Auth from './components/Auth'
import Dashboard from './components/Dashboard'

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Cargando...</div>
      </div>
    )
  }

  return user ? <Dashboard /> : <Auth />
}

export default App
