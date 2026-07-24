import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, type Page, test, type TestInfo } from '@playwright/test'

const cabinetItemHotspots = [
  ['ITM-G01-002', 'HOS-G01-001-01'],
  ['ITM-G01-003', 'HOS-G01-001-02'],
  ['ITM-G01-004', 'HOS-G01-001-03'],
  ['ITM-G01-005', 'HOS-G01-001-04'],
] as const

const collectBrowserErrors = (page: Page): string[] => {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', (error) => errors.push(error.message))
  return errors
}

const resetAndStart = async (page: Page): Promise<void> => {
  await page.goto('/')
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
  await page.getByRole('button', { name: '开始搜寻' }).click()
}

const clickHotspotCenter = async (page: Page, hotspotId: string): Promise<void> => {
  const hotspot = page.locator(`[data-hotspot-id="${hotspotId}"]`)
  await expect(hotspot).toBeVisible()
  const box = await hotspot.boundingBox()
  expect(box).not.toBeNull()
  if (!box) return
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
}

const expectCollectibleAligned = async (
  page: Page,
  itemId: string,
  hotspotId: string,
): Promise<void> => {
  const collectible = page.locator(`[data-collectible-item="${itemId}"]`)
  const hotspot = page.locator(`[data-hotspot-id="${hotspotId}"]`)
  await expect(collectible).toBeVisible()
  await expect
    .poll(() =>
      collectible.evaluate(
        (element) =>
          element instanceof HTMLImageElement && element.complete && element.naturalWidth > 0,
      ),
    )
    .toBe(true)

  const [collectibleBox, hotspotBox] = await Promise.all([
    collectible.boundingBox(),
    hotspot.boundingBox(),
  ])
  expect(collectibleBox).not.toBeNull()
  expect(hotspotBox).not.toBeNull()
  if (!collectibleBox || !hotspotBox) return

  const centerX = collectibleBox.x + collectibleBox.width / 2
  const centerY = collectibleBox.y + collectibleBox.height / 2
  expect(centerX).toBeGreaterThanOrEqual(hotspotBox.x)
  expect(centerX).toBeLessThanOrEqual(hotspotBox.x + hotspotBox.width)
  expect(centerY).toBeGreaterThanOrEqual(hotspotBox.y)
  expect(centerY).toBeLessThanOrEqual(hotspotBox.y + hotspotBox.height)
}

const expectSceneCanvasCalibrated = async (page: Page): Promise<void> => {
  const canvas = page.locator('[data-scene-canvas]')
  const frame = page.locator('.scene-frame')
  const [canvasBox, frameBox] = await Promise.all([canvas.boundingBox(), frame.boundingBox()])
  expect(canvasBox).not.toBeNull()
  expect(frameBox).not.toBeNull()
  if (!canvasBox || !frameBox) return

  expect(Math.abs(canvasBox.width / canvasBox.height - 1672 / 941)).toBeLessThan(0.01)
  expect(canvasBox.x).toBeGreaterThanOrEqual(frameBox.x - 1)
  expect(canvasBox.y).toBeGreaterThanOrEqual(frameBox.y - 1)
  expect(canvasBox.x + canvasBox.width).toBeLessThanOrEqual(frameBox.x + frameBox.width + 1)
  expect(canvasBox.y + canvasBox.height).toBeLessThanOrEqual(frameBox.y + frameBox.height + 1)
}

const captureAcceptance = async (
  page: Page,
  testInfo: TestInfo,
  fileName: string,
): Promise<void> => {
  const directory = join(
    process.cwd(),
    'test-results',
    'visual-acceptance',
    testInfo.project.name,
  )
  await mkdir(directory, { recursive: true })
  await page.screenshot({ path: join(directory, fileName), fullPage: true })
}

const reachS3 = async (page: Page): Promise<void> => {
  await clickHotspotCenter(page, 'HS-G01-0001')
  await page.locator('[data-inventory-item="ITM-G01-001"]').click()
  await clickHotspotCenter(page, 'HS-G01-0002')
  await clickHotspotCenter(page, 'HS-G01-0003')
  for (const [, hotspotId] of cabinetItemHotspots) {
    await clickHotspotCenter(page, hotspotId)
  }
  await expect(page.locator('.game-shell')).toHaveClass(/state-S3/)
}

test('visual acceptance covers calibrated layers, disappearance and browser reloads', async ({
  page,
}, testInfo) => {
  const browserErrors = collectBrowserErrors(page)
  await resetAndStart(page)
  await expectSceneCanvasCalibrated(page)

  await expectCollectibleAligned(page, 'ITM-G01-001', 'HS-G01-0001')
  await captureAcceptance(page, testInfo, '00-S0-main-search.png')
  await clickHotspotCenter(page, 'HS-G01-0001')
  await expect(page.locator('.game-shell')).toHaveClass(/state-S1/)
  await expect(page.locator('[data-collectible-item="ITM-G01-001"]')).toHaveCount(0)
  await captureAcceptance(page, testInfo, '01-S1-distribution-box.png')

  await page.locator('[data-inventory-item="ITM-G01-001"]').click()
  await clickHotspotCenter(page, 'HS-G01-0002')
  await expect(page.locator('.game-shell')).toHaveClass(/state-S2/)

  await clickHotspotCenter(page, 'HS-G01-0003')
  await expect(page.getByRole('dialog', { name: '维修柜找物' })).toBeVisible()
  for (const [itemId, hotspotId] of cabinetItemHotspots) {
    await expectCollectibleAligned(page, itemId, hotspotId)
  }
  await captureAcceptance(page, testInfo, '02-S2-cabinet-before.png')

  await clickHotspotCenter(page, 'HOS-G01-001-01')
  await expect(page.locator('[data-collectible-item="ITM-G01-002"]')).toHaveCount(0)
  await captureAcceptance(page, testInfo, '03-S2-fuse-after.png')

  for (const [itemId, hotspotId] of cabinetItemHotspots.slice(1)) {
    await clickHotspotCenter(page, hotspotId)
    await expect(page.locator(`[data-collectible-item="${itemId}"]`)).toHaveCount(0)
  }
  await expect(page.locator('.game-shell')).toHaveClass(/state-S3/)
  await expect(page.locator('[data-inventory-item="ITM-G01-002"]')).toBeVisible()
  await captureAcceptance(page, testInfo, '04-S3-fuse-inventory.png')

  await page.reload()
  await expect(page.locator('.game-shell')).toHaveClass(/state-S3/)
  await expect(page.locator('[data-inventory-item="ITM-G01-002"]')).toBeVisible()
  await expect(page.locator('[data-collectible-item="ITM-G01-001"]')).toHaveCount(0)
  await clickHotspotCenter(page, 'HS-G01-0003')
  await expect(page.getByRole('dialog', { name: '维修柜找物' })).toBeVisible()
  for (const [itemId] of cabinetItemHotspots) {
    await expect(page.locator(`[data-collectible-item="${itemId}"]`)).toHaveCount(0)
  }
  await captureAcceptance(page, testInfo, '04b-S3-reload-cabinet-empty.png')
  await page.getByRole('button', { name: '关闭维修柜特写' }).click()

  await page.locator('[data-inventory-item="ITM-G01-002"]').click()
  await clickHotspotCenter(page, 'HS-G01-0004')
  await expect(page.locator('.game-shell')).toHaveClass(/state-S4/)
  await clickHotspotCenter(page, 'HS-G01-0005')
  await expect(page.locator('.game-shell')).toHaveClass(/state-S5/)

  await page.reload()
  await expect(page.locator('.game-shell')).toHaveClass(/state-S5/)
  await expect(page.getByRole('heading', { name: '应急照明恢复' })).toBeVisible()
  await expect(page.locator('.lighting-layer')).toHaveCSS('opacity', '1')
  await page.getByRole('button', { name: '收起面板查看完整场景' }).click()
  await expect(page.getByRole('heading', { name: '应急照明恢复' })).toHaveCount(0)
  await captureAcceptance(page, testInfo, '05-S5-lighting-restored.png')

  await clickHotspotCenter(page, 'HS-G01-0006')
  await expect(page.locator('.game-shell')).toHaveClass(/state-S6/)
  expect(browserErrors).toEqual([])
})

test('desktop drag keeps a wrongly dropped fuse and advances on the correct target', async ({
  page,
}) => {
  const browserErrors = collectBrowserErrors(page)
  await resetAndStart(page)
  await reachS3(page)

  const fuse = page.locator('[data-inventory-item="ITM-G01-002"]')
  await fuse.dragTo(page.locator('[data-drop-target="HS-G01-0002"]'))
  await expect(page.locator('.game-shell')).toHaveClass(/state-S3/)
  await expect(fuse).toBeVisible()

  await fuse.dragTo(page.locator('[data-drop-target="HS-G01-0004"]'))
  await expect(page.locator('.game-shell')).toHaveClass(/state-S4/)
  await expect(page.locator('[data-inventory-item="ITM-G01-002"]')).toHaveCount(0)
  expect(browserErrors).toEqual([])
})
