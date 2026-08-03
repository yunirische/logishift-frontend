import type { GenerateSWOptions } from 'workbox-build';

export const workboxConfig: Partial<GenerateSWOptions> = {
  cleanupOutdatedCaches: true,
  skipWaiting: true,
  clientsClaim: true,
  importScripts: ['/pwa-cache-cleanup.js'],
  navigateFallbackDenylist: [/^\/uploads/],
  runtimeCaching: [
    {
      // Private API responses must never be persisted by the service worker.
      urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
      handler: 'NetworkOnly',
    },
    {
      // Uploaded files are private and must always come from the server.
      urlPattern: ({ url }) => url.pathname.startsWith('/uploads/'),
      handler: 'NetworkOnly',
    },
  ],
};
