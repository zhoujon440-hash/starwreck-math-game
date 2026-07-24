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
        start_url: '/',
        scope: '/',
        categories: ['games', 'education', 'entertainment']
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,webp,woff2}'],
        navigateFallbackDenylist: [/^\/api\//]
      },
      devOptions: {
        enabled: true
      }
    })
  ]
})

