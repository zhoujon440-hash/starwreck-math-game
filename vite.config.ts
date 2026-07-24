import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['assets/**/*'],
      manifest: {
        name: '星骸拾荒者：十二星门',
        short_name: '星骸拾荒者',
        description: '面向青少年的互动式图像解谜与冒险游戏。',
        theme_color: '#070b13',
        background_color: '#070b13',
        display: 'fullscreen',
        orientation: 'landscape',
        lang: 'zh-CN',
        start_url: '/',
        scope: '/',
        categories: ['games', 'education', 'entertainment'],
        icons: [
          {
            src: '/assets/app-icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/assets/app-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/assets/app-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,webp,woff2}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/api\//]
      },
      devOptions: {
        enabled: true
      }
    })
  ]
})
