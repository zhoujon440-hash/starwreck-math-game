import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests-pwa',
  outputDir: 'test-results/pwa-production',
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-pwa-report' }]],
  use: {
    baseURL: 'http://127.0.0.1:4174/starwreck-math-game/',
    browserName: 'chromium',
    channel: process.env.CI ? undefined : 'chrome',
    headless: true,
    serviceWorkers: 'allow',
    trace: 'on',
  },
  webServer: {
    command: 'node scripts/serve-g01-demo-preview.mjs',
    url: 'http://127.0.0.1:4174/starwreck-math-game/',
    reuseExistingServer: false,
    timeout: 180_000,
  },
})
