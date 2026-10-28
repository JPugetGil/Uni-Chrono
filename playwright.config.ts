import { defineConfig, devices } from '@playwright/test'

const PORT = 4173

// Parcours dans le navigateur, sur le build de production servi par `vite preview`.
// Les services externes sont simulés (e2e/mocks.ts).
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}/Uni-Chrono/`,
    // Une requête servie par le service worker échapperait aux simulations
    serviceWorkers: 'block',
    locale: 'fr-FR',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
  webServer: {
    command: `npm run build && npx vite preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/Uni-Chrono/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Clé factice (services simulés) : active le vélo et les transports en commun
    env: { VITE_GEOAPIFY_API_KEY: 'e2e-geoapify' },
  },
})
