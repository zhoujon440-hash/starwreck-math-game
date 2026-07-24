import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'

test('SCN-G01-00 can be completed without consuming a wrongly used fuse', async ({
  page,
}, testInfo) => {
  const browserErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text())
  })
  page.on('pageerror', (error) => browserErrors.push(error.message))

  await page.goto('/')
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()

  await page.getByRole('button', { name: '开始搜寻' }).click()
  await page.locator('[data-hotspot-id="HS-G01-0001"]').click()
  await expect(page.locator('.game-shell')).toHaveClass(/state-S1/)

  await page.locator('[data-inventory-item="ITM-G01-001"]').click()
  await page.locator('[data-hotspot-id="HS-G01-0002"]').click()
  await expect(page.locator('.game-shell')).toHaveClass(/state-S2/)

  await page.locator('[data-hotspot-id="HS-G01-0003"]').click()
  await expect(page.getByRole('dialog', { name: '维修柜找物' })).toBeVisible()
  for (const hotspotId of [
    'HOS-G01-001-01',
    'HOS-G01-001-02',
    'HOS-G01-001-03',
    'HOS-G01-001-04',
  ]) {
    await page.locator(`[data-hotspot-id="${hotspotId}"]`).click()
  }
  await expect(page.locator('.game-shell')).toHaveClass(/state-S3/)

  await page.locator('[data-inventory-item="ITM-G01-001"]').click()
  await page.locator('[data-hotspot-id="HS-G01-0004"]').click()
  await expect(page.locator('.game-shell')).toHaveClass(/state-S3/)
  await expect(page.locator('[data-inventory-item="ITM-G01-002"]')).toBeVisible()

  await page.locator('[data-inventory-item="ITM-G01-002"]').click()
  await page.locator('[data-hotspot-id="HS-G01-0004"]').click()
  await expect(page.locator('.game-shell')).toHaveClass(/state-S4/)
  await page.locator('[data-hotspot-id="HS-G01-0005"]').click()
  await expect(page.locator('.game-shell')).toHaveClass(/state-S5/)
  await expect(page.getByRole('heading', { name: '应急照明恢复' })).toBeVisible()

  await page.waitForTimeout(500)
  const screenshotDirectory = join(process.cwd(), 'docs', 'screenshots')
  await mkdir(screenshotDirectory, { recursive: true })
  await page.screenshot({
    path: join(screenshotDirectory, `SCN-G01-00-${testInfo.project.name}.png`),
    fullPage: true,
  })

  await page.getByRole('button', { name: '进入下一场景入口' }).click()
  await expect(page.locator('.game-shell')).toHaveClass(/state-S6/)
  expect(browserErrors).toEqual([])
})

