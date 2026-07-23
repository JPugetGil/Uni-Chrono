import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'icons/uni-chrono-192.png',
        'icons/uni-chrono-512.png',
        'vite.svg'
      ],
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json,txt}'],
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
            urlPattern: /^https:\/\/data\.enseignementsup-recherche\.gouv\.fr\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'data-gouv-api',
              expiration: {
                maxEntries: 40,
                maxAgeSeconds: 60 * 60
              }
            }
          },
          {
            // Communes (geo.api.gouv.fr) et CSV des loyers (static.data.gouv.fr) :
            // volumineux et quasi statiques → CacheFirst longue durée
            urlPattern: /^https:\/\/(?:geo\.api\.gouv\.fr|static\.data\.gouv\.fr)\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'housing-data',
              expiration: {
                maxEntries: 10,
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
