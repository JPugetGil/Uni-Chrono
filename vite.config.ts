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
      // Icônes générées depuis public/favicon.svg (npm run icons, voir pwa-assets.config.ts)
      includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: false,
      workbox: {
        // Police : seuls les sous-ensembles latin et latin-ext sont précachés
        globPatterns: ['**/*.{js,css,html,svg,png,ico,json,txt}', '**/inter-latin-*.woff2'],
        // Données (plusieurs Mo) : mises en cache à l'usage, pas à l'installation
        globIgnores: ['**/data/**'],
        navigateFallback: 'index.html',
        runtimeCaching: [
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
            // Zones à pied et en voiture (IGN) : le réseau change peu, une zone sert un mois
            urlPattern: /^https:\/\/data\.geopf\.fr\/navigation\/isochrone.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ign-isochrones',
              expiration: {
                maxEntries: 300,
                maxAgeSeconds: 60 * 60 * 24 * 30
              },
              cacheableResponse: {
                statuses: [200]
              }
            }
          },
          {
            // Zones à vélo et en transports (Geoapify, quota partagé) : la demande d'un
            // point est servie du cache une semaine. Les réponses 202 (calcul en cours)
            // et les interrogations par identifiant ne sont pas gardées.
            urlPattern: ({ url }) =>
              url.hostname === 'api.geoapify.com' && url.pathname === '/v1/isoline' && url.searchParams.has('lat'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'geoapify-isolines',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 7
              },
              cacheableResponse: {
                statuses: [200]
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
            // Fond de carte Plan IGN (Géoplateforme)
            urlPattern: /^https:\/\/data\.geopf\.fr\/wmts.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'ign-tiles',
              expiration: {
                maxEntries: 300,
                maxAgeSeconds: 60 * 60 * 24 * 7
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/(?:[abc]\.)?tile\.openstreetmap\.org\/.*/i,
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
