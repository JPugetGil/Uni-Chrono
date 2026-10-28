import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Icônes de l'application (npm run icons) générées depuis public/favicon.svg :
// favicon.ico, icônes PWA, icône « maskable » Android et icône iOS. Ces deux
// dernières sont découpées par le système : fond bleu de la marque pleine page.
const BRAND_BLUE = '#1d4ed8'

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: BRAND_BLUE } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: BRAND_BLUE } },
  },
  images: ['public/favicon.svg'],
})
