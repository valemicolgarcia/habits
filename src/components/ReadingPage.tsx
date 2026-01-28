interface ReadingPageProps {
  onBack: () => void
}

export default function ReadingPage({ onBack }: ReadingPageProps) {
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
            <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">📖 Lectura</h1>
            <div className="w-10" />
          </div>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 text-center">
          <div className="text-6xl mb-6">📖</div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">
            Sección de Lectura
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Esta sección estará disponible próximamente.
          </p>
        </div>
      </main>
    </div>
  )
}
