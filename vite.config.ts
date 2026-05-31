import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      workbox: {
        // ДОБАВЬ ЭТИ СТРОКИ - форсируй обновление и очистку
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        
        // ДОБАВЬ - исключи /uploads/ из навигации
        navigateFallbackDenylist: [/^\/uploads/],
        
        runtimeCaching: [
          {
            // Match API requests regardless of domain (supports local dev and production)
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 0
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Match uploads regardless of domain (supports local dev and production)
            urlPattern: ({ url }) => url.pathname.startsWith('/uploads/'),
            handler: 'NetworkOnly', // Always fetch from server
          }
        ]
      },
      manifest: {
        name: 'LogiShift Driver',
        short_name: 'LogiShift',
        description: 'Приложение для водителей LogiShift',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  server: {
    host: true,
    port: 5173
  }
});
