import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './i18n/config'
import App from './App.tsx'
import './leaflet-marker-config.ts'

// Purge des données mises en cache par les anciennes versions (le cache
// localStorage des établissements/isochrones a été supprimé de l'app)
try {
  const staleKeys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && (key === 'etablissementsGeoJSON' || key === 'isochrones' || key.startsWith('isochrones:'))) {
      staleKeys.push(key)
    }
  }
  staleKeys.forEach((key) => localStorage.removeItem(key))
} catch {
  // ignore
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateSW(true).catch((error) => {
        console.error('Failed to refresh service worker', error)
      })
    },
    onOfflineReady() {
      console.info('Uni-Chrono est prêt à fonctionner hors connexion.')
    }
  })
}
