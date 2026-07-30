import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

declare const process: { env: Record<string, string | undefined> }

const base = process.env.GITHUB_PAGES === 'true' ? '/starwreck-math-game/' : '/'

export default defineConfig({
  base,
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '星骸拾荒者：十二星门',
        short_name: '星骸拾荒者',
        description: '面向青少年的互动式图像解谜与冒险游戏。',
        theme_color: '#070b13',
        background_color: '#070b13',
        display: 'fullscreen',
        orientation: 'landscape',
        lang: 'zh-CN',
        start_url: base,
        scope: base,
        categories: ['games', 'education', 'entertainment'],
        icons: [
          {
            src: `${base}assets/app-icon-192.png`,
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: `${base}assets/app-icon-512.png`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: `${base}assets/app-icon-512.png`,
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
        enabled: false
      }
    })
  ]
})
