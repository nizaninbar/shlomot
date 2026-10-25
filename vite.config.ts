import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/shlomot/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/favicon-48.png', 'icons/apple-touch-icon.png', 'icons/logo-200.png'],
      manifest: {
        name: 'שלומות',
        short_name: 'שלומות',
        description: 'שלומות – תכנון שיעורי פילאטיס',
        lang: 'he',
        dir: 'rtl',
        display: 'standalone',
        scope: '/shlomot/',
        start_url: '/shlomot/',
        background_color: '#fbf6ee',
        theme_color: '#3e8c89',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'google-fonts' },
          },
        ],
      },
    }),
  ],
})
