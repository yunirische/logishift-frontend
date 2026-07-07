import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
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
        name: 'LogiShift',
        short_name: 'LogiShift',
        description: 'LogiShift - контроль смен, техники и объектов',
        theme_color: '#041627',
        background_color: '#f7f9fc',
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
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    clearMocks: true,
    globals: true,
  },
  server: {
    host: true,
    port: 5173
  }
});
