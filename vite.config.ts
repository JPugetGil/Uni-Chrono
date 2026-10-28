import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'icons/uni-chrono-192.png',
        'icons/uni-chrono-512.png',
        'vite.svg'
      ],
      manifest: false,
      workbox: {
        // Police : seuls les sous-ensembles latin et latin-ext sont précachés
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json,txt}', '**/inter-latin-*.woff2'],
        // Données (plusieurs Mo) : mises en cache à l'usage, pas à l'installation
        globIgnores: ['**/data/**'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.mapbox\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'mapbox-api',
              expiration: {
                maxEntries: 40,
                maxAgeSeconds: 60 * 60
              }
            }
          },
          {
            // Données préparées au build (public/data) : servies du cache, rafraîchies en arrière-plan
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.includes('/data/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'app-data',
              expiration: {
                maxEntries: 150,
                maxAgeSeconds: 60 * 60 * 24 * 30
              }
            }
          },
          {
            // Contour d'une commune (surbrillance au survol de la liste des loyers)
            urlPattern: /^https:\/\/geo\.api\.gouv\.fr\/communes\/\d.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'commune-contours',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/api\.navitia\.io\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'navitia-api',
              expiration: {
                maxEntries: 40,
                maxAgeSeconds: 60 * 60
              }
            }
          },
          {
            // Surcouches par mode de transport (Waymarked Trails, OpenRailwayMap)
            urlPattern: /^https:\/\/(?:tile\.waymarkedtrails\.org|[abc]\.tiles\.openrailwaymap\.org)\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'transport-overlay-tiles',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/(?:[abc]\.tile\.openstreetmap\.org)\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'osm-tiles',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true,
        suppressWarnings: true
      }
    })
  ],
  base: '/Uni-Chrono/'
})
