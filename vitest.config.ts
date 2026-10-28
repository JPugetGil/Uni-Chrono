import { defineConfig } from 'vitest/config'

// Tests unitaires : fonctions pures et fetchers (fetch simulé), sans navigateur.
// Les parcours dans le navigateur sont couverts par Playwright (dossier e2e/).
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    restoreMocks: true,
    unstubGlobals: true,
  },
})
