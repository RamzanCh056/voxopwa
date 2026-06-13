import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/*.png', 'Voxofied Icon.jpg'],
      manifest: {
        name: 'Voxofied AI',
        short_name: 'Voxofied',
        description: 'AI-powered voice recording and analysis app',
        theme_color: '#1E1B4B',
        background_color: '#0F0F1A',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/Voxofied Icon.jpg',
            sizes: '192x192',
            type: 'image/jpeg',
          },
          {
            src: '/Voxofied Icon.jpg',
            sizes: '512x512',
            type: 'image/jpeg',
          },
          {
            src: '/Voxofied Icon.jpg',
            sizes: '512x512',
            type: 'image/jpeg',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,jpg,jpeg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      '/api/openai': {
        target: 'https://api.openai.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/openai/, ''),
      },
    },
  },
})
