import { useState, useRef } from 'react'
import { useUserProfile } from '../contexts/UserProfileContext'

interface UserProfileProps {
  onBack: () => void
}

export default function UserProfile({ onBack }: UserProfileProps) {
  const { name, profileImage, updateName, updateProfileImage } = useUserProfile()
  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState(name)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        updateProfileImage(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSaveName = () => {
    if (newName.trim()) {
      updateName(newName.trim())
    }
    setEditingName(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={onBack}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Volver"
            >
              <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">Mi Perfil</h1>
            <div className="w-10" />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sm:p-8">
          {/* Imagen de Perfil */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Perfil"
                  className="w-32 h-32 rounded-full object-cover border-4 border-gray-200 dark:border-gray-700"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-blue-500 dark:bg-blue-600 flex items-center justify-center text-white text-4xl font-bold border-4 border-gray-200 dark:border-gray-700">
                  {name.charAt(0).toUpperCase()}
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-blue-600 dark:bg-blue-500 text-white rounded-full p-2 hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
            {profileImage && (
              <button
                onClick={() => updateProfileImage(null)}
                className="mt-2 text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
              >
                Eliminar foto
              </button>
            )}
          </div>

          {/* Nombre */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nombre
            </label>
            {editingName ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  autoFocus
                />
                <button
                  onClick={handleSaveName}
                  className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600"
                >
                  Guardar
                </button>
                <button
                  onClick={() => {
                    setNewName(name)
                    setEditingName(false)
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">{name}</p>
                <button
                  onClick={() => setEditingName(true)}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  Editar
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
