import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './i18n/config'
import App from './App.tsx'
import './leaflet-marker-config.ts'

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
