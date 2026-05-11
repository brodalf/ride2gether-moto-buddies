import { createRoot } from 'react-dom/client'
import './index.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root-Element #root nicht gefunden.')
}

const root = createRoot(rootElement)

const getBootErrorCopy = (error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unbekannter Fehler beim Starten der App.'

  if (message.includes('Fehlende Supabase-Umgebungsvariablen')) {
    return {
      title: 'Preview-Konfiguration fehlt',
      description:
        'Diese Lovable-Preview hat aktuell keine VITE_SUPABASE_URL- und VITE_SUPABASE_ANON_KEY-Variablen. Die App ist daher hier nicht startbar, läuft aber in korrekt konfigurierten Umgebungen wie Vercel.',
      details: message,
    }
  }

  return {
    title: 'App konnte nicht geladen werden',
    description: 'Beim Starten ist ein Fehler aufgetreten. Die Details stehen unten.',
    details: message,
  }
}

const renderBootFallback = (error: unknown) => {
  const copy = getBootErrorCopy(error)

  root.render(
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-sm">
        <p className="text-sm font-medium text-orange-400">ride2gether</p>
        <h1 className="mt-2 text-2xl font-semibold">{copy.title}</h1>
        <p className="mt-3 text-sm leading-6 text-white/80">{copy.description}</p>
        <pre className="mt-5 overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-4 text-xs leading-5 text-white/70 whitespace-pre-wrap">
          {copy.details}
        </pre>
      </div>
    </div>,
  )
}

import('./App.tsx')
  .then(({ default: App }) => {
    root.render(<App />)
  })
  .catch((error) => {
    console.error('Bootstrap-Fehler:', error)
    renderBootFallback(error)
  })
