import { defineConfig } from 'vitest/config'

// Tests unitaires : fonctions pures, fetchers (fetch simulé) et préparation des données, sans navigateur.
// Les parcours dans le navigateur sont couverts par Playwright (dossier e2e/).
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    environment: 'node',
    restoreMocks: true,
    unstubGlobals: true,
  },
})
