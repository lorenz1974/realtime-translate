import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves from /<repo>/; for local dev keep '/'.
const GHPAGES_BASE = '/realtime-translate/'

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? GHPAGES_BASE : '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: [
        'icon.svg',
        'favicon.svg',
        'favicon.ico',
        'apple-touch-icon-180x180.png',
        'maskable-icon-512x512.png',
        'pwa-64x64.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'og-image.svg',
        'og-image.png'
      ],
      manifest: {
        id: '/?source=pwa',
        name: 'Realtime Translate',
        short_name: 'Translate',
        description: 'Traduzione vocale in tempo reale con OpenAI Realtime API.',
        theme_color: '#6366f1',
        background_color: '#eef2ff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '.',
        start_url: '.',
        lang: 'it',
        dir: 'ltr',
        categories: ['productivity', 'utilities', 'education'],
        icons: [
          { src: 'pwa-64x64.png',  sizes: '64x64',  type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }
        ],
        screenshots: [
          {
            src: 'og-image.png',
            sizes: '1200x630',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Realtime Translate — traduzione vocale in tempo reale'
          }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        navigateFallbackDenylist: [/^\/api/, /^\/v1\/realtime/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.origin === 'https://api.openai.com',
            handler: 'NetworkOnly'
          },
          {
            urlPattern: ({ request }) => request.destination === 'font',
            handler: 'CacheFirst',
            options: {
              cacheName: 'fonts',
              expiration: { maxEntries: 16, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          },
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'images',
              expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 * 30 }
            }
          }
        ]
      },
      devOptions: {
        enabled: false
      }
    })
  ],
  server: {
    host: true,
    port: 5173
  }
}))
