import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import wasm from 'vite-plugin-wasm'

export default defineConfig({
  server: {
    port: 5174
  },
  plugins: [
    wasm(),
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon-v2.svg', 'favicon.ico', 'og-image.png', 'robots.txt'],
      manifest: {
        name: 'Shifteo',
        short_name: 'Shifteo',
        description: 'Convert and transform images locally in your browser.',
        theme_color: '#101216',
        background_color: '#101216',
        display: 'standalone',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB (for large WASM files)
        runtimeCaching: [
          {
            urlPattern: /\.wasm$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'wasm-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': Bun.fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    target: 'es2022'
  },
  worker: {
    format: 'es',
    plugins: () => [wasm()]
  },
  optimizeDeps: {
    exclude: ['@jsquash/png', '@jsquash/jpeg', '@jsquash/webp', '@jsquash/avif', '@jsquash/jxl', '@jsquash/oxipng', '@jsquash/resize', '@silvia-odwyer/photon']
  }
})
