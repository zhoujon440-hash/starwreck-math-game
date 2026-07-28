import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'

test('character acceptance page renders both frozen identities without browser errors', async ({
  page,
}, testInfo) => {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', (error) => errors.push(error.message))

  await page.goto('/character-asset-acceptance.html?capture=preview')
  await expect(page.locator('.preview-only .tag')).toHaveText('非最终剧情UI')
  await expect(page.locator('.preview-only .tag')).toBeVisible()
  await expect(page.locator('[data-character-preview]')).toBeVisible()
  await expect(page.locator('[data-character-preview] img')).toHaveCount(2)
  for (const image of await page.locator('[data-character-preview] img').all()) {
    await expect.poll(() => image.evaluate((element) =>
      element instanceof HTMLImageElement ? [element.complete, element.naturalWidth, element.naturalHeight] : [false, 0, 0],
    )).toEqual([true, 2048, 2048])
  }

  const output = join(process.cwd(), 'test-results', 'character-assets')
  await mkdir(output, { recursive: true })
  const fileName = testInfo.project.name === '1366x768'
    ? 'character_preview_1366x768.png'
    : 'character_preview_1920x1080.png'
  await page.screenshot({ path: join(output, fileName) })
  expect(errors).toEqual([])
})

test('full acceptance page exposes all 14 states, master comparisons and edge checks', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/character-asset-acceptance.html')
  await expect(page.locator('header .tag')).toHaveText('非最终剧情UI')
  await expect(page.locator('header .tag')).toBeVisible()
  await expect(page.locator('#xingyu figure')).toHaveCount(5)
  await expect(page.locator('#qima figure')).toHaveCount(9)
  await expect(page.locator('.master img')).toHaveCount(4)
  await expect(page.locator('.edge-card')).toHaveCount(2)
  await expect(page.locator('.scale-row img')).toHaveCount(4)
  expect(errors).toEqual([])
})
