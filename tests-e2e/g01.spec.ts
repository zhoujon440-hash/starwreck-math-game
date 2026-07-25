import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
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

const forbiddenProductionCopy =
  /(?:\bS[0-6]\b|schema(?:\s+v?\d+)?|项目负责人|验收|交付边界|稳定\s*ID|开发阶段|测试文字)/i

const expectProductionUi = async (page: Page): Promise<void> => {
  await expect(page.locator('.game-shell')).toHaveAttribute('data-debug-ui', 'false')
  const playerCopy = await page.locator('body').innerText()
  expect(playerCopy).not.toMatch(forbiddenProductionCopy)
}

const expectCabinetVisualState = async (
  page: Page,
  expected: 'closed' | 'open',
): Promise<void> => {
  await expect(page.locator('.game-shell')).toHaveAttribute(
    'data-cabinet-visual-state',
    expected,
  )
  await expect(page.locator('.cabinet-layer')).toHaveCount(0)
  const image = await page
    .locator('.scene-art')
    .evaluate((element) => getComputedStyle(element).backgroundImage)
  if (expected === 'closed') {
    expect(image).toContain('g01-cockpit-cabinet-closed-v2.png')
  } else {
    expect(image).toContain('g01-cockpit.png')
    expect(image).not.toContain('g01-cockpit-cabinet-closed-v2.png')
  }
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

const expectHudDoesNotCover = async (page: Page, hotspotId: string): Promise<void> => {
  const targetBox = await page.locator(`[data-hotspot-id="${hotspotId}"]`).boundingBox()
  expect(targetBox).not.toBeNull()
  if (!targetBox) return

  const hudElements = page.locator('.inventory-hud, .objective-card, .scene-counter')
  for (let index = 0; index < (await hudElements.count()); index += 1) {
    const hudBox = await hudElements.nth(index).boundingBox()
    if (!hudBox) continue
    const overlapWidth = Math.max(
      0,
      Math.min(targetBox.x + targetBox.width, hudBox.x + hudBox.width) -
        Math.max(targetBox.x, hudBox.x),
    )
    const overlapHeight = Math.max(
      0,
      Math.min(targetBox.y + targetBox.height, hudBox.y + hudBox.height) -
        Math.max(targetBox.y, hudBox.y),
    )
    expect(overlapWidth * overlapHeight).toBe(0)
  }
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
  const screenshotPath = join(directory, fileName)
  await mkdir(dirname(screenshotPath), { recursive: true })
  await page.screenshot({ path: screenshotPath, fullPage: true })
}

const captureHotspotCalibration = async (
  page: Page,
  testInfo: TestInfo,
): Promise<void> => {
  await page.evaluate(() => {
    const canvas = document.querySelector<HTMLElement>('[data-scene-canvas]')
    if (!canvas) throw new Error('Scene canvas missing for hotspot calibration')

    const calibrationHotspots = [
      { id: 'HS-G01-0002', label: '配电盒', x: 30, y: 37, width: 10, height: 18 },
      { id: 'HS-G01-0004', label: '照明槽', x: 51, y: 36, width: 7, height: 17 },
      { id: 'HS-G01-0005', label: '保护开关', x: 58, y: 36, width: 6, height: 17 },
    ]
    calibrationHotspots.forEach((hotspot) => {
      const marker = document.createElement('div')
      marker.className = 'acceptance-debug-hotspot'
      marker.dataset.calibrationHotspot = hotspot.id
      marker.style.cssText = [
        `left:${hotspot.x}%`,
        `top:${hotspot.y}%`,
        `width:${hotspot.width}%`,
        `height:${hotspot.height}%`,
      ].join(';')
      marker.innerHTML = `<span>${hotspot.label}<small>${hotspot.id}</small></span>`
      canvas.append(marker)
    })

    const style = document.createElement('style')
    style.dataset.acceptanceDebugStyle = 'true'
    style.textContent = `
      .acceptance-debug-hotspot {
        position: absolute;
        z-index: 99;
        border: 2px solid #60f6ff;
        background: rgb(46 222 236 / 10%);
        box-shadow: inset 0 0 0 1px rgb(2 10 14 / 88%), 0 0 12px rgb(96 246 255 / 65%);
        pointer-events: none;
      }
      .acceptance-debug-hotspot::after {
        position: absolute;
        top: 50%;
        left: 50%;
        width: 8px;
        height: 8px;
        border: 1px solid #ffd07a;
        content: "";
        transform: translate(-50%, -50%) rotate(45deg);
      }
      .acceptance-debug-hotspot span {
        position: absolute;
        bottom: 100%;
        left: 0;
        padding: 3px 5px;
        color: #eaffff;
        font: 10px/1.25 sans-serif;
        white-space: nowrap;
        background: rgb(2 10 14 / 92%);
      }
      .acceptance-debug-hotspot small {
        display: block;
        color: #60f6ff;
        font-size: 8px;
      }
    `
    document.head.append(style)
  })
  await captureAcceptance(page, testInfo, 'debug/08-hotspot-calibration.png')
  await page.evaluate(() => {
    document.querySelectorAll('.acceptance-debug-hotspot').forEach((element) => element.remove())
    document.querySelector('[data-acceptance-debug-style]')?.remove()
  })
}

const expectWorldStarCoreCountZero = async (page: Page): Promise<void> => {
  const counts = await page.evaluate(() =>
    Object.values(window.localStorage)
      .map((value) => {
        try {
          return JSON.parse(value) as { flags?: { world_star_core_count?: unknown } }
        } catch {
          return null
        }
      })
      .filter((value): value is { flags?: { world_star_core_count?: unknown } } => Boolean(value))
      .map((value) => value.flags?.world_star_core_count)
      .filter((value): value is number => typeof value === 'number'),
  )
  expect(counts.length).toBeGreaterThan(0)
  expect(counts.every((count) => count === 0)).toBe(true)
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
  await expectProductionUi(page)
  await expectCabinetVisualState(page, 'closed')

  await expectCollectibleAligned(page, 'ITM-G01-001', 'HS-G01-0001')
  await expectHudDoesNotCover(page, 'HS-G01-0001')
  await captureAcceptance(page, testInfo, '00-S0-main-search.png')
  await clickHotspotCenter(page, 'HS-G01-0001')
  await expect(page.locator('.game-shell')).toHaveClass(/state-S1/)
  await expect(page.locator('[data-collectible-item="ITM-G01-001"]')).toHaveCount(0)
  await expectCabinetVisualState(page, 'closed')
  await expectProductionUi(page)
  await expectHudDoesNotCover(page, 'HS-G01-0002')
  await captureAcceptance(page, testInfo, '01-S1-distribution-box.png')

  await page.reload()
  await expect(page.locator('.game-shell')).toHaveClass(/state-S1/)
  await expect(page.locator('[data-collectible-item="ITM-G01-001"]')).toHaveCount(0)
  await expectCabinetVisualState(page, 'closed')

  await page.locator('[data-inventory-item="ITM-G01-001"]').click()
  await clickHotspotCenter(page, 'HS-G01-0002')
  await expect(page.locator('.game-shell')).toHaveClass(/state-S2/)
  await expectCabinetVisualState(page, 'open')
  await expectProductionUi(page)
  await expectHudDoesNotCover(page, 'HS-G01-0003')
  await captureAcceptance(page, testInfo, '02-S2-cabinet-open-main.png')

  await clickHotspotCenter(page, 'HS-G01-0003')
  await expect(page.getByRole('dialog', { name: '维修柜找物' })).toBeVisible()
  for (const [itemId, hotspotId] of cabinetItemHotspots) {
    await expectCollectibleAligned(page, itemId, hotspotId)
  }
  await captureAcceptance(page, testInfo, '03-S2-cabinet-before.png')

  await clickHotspotCenter(page, 'HOS-G01-001-01')
  await expect(page.locator('[data-collectible-item="ITM-G01-002"]')).toHaveCount(0)
  await captureAcceptance(page, testInfo, '04-S2-fuse-after.png')

  for (const [itemId, hotspotId] of cabinetItemHotspots.slice(1)) {
    await clickHotspotCenter(page, hotspotId)
    await expect(page.locator(`[data-collectible-item="${itemId}"]`)).toHaveCount(0)
  }
  await expect(page.locator('.game-shell')).toHaveClass(/state-S3/)
  await expect(page.locator('[data-inventory-item="ITM-G01-002"]')).toBeVisible()
  await expectHudDoesNotCover(page, 'HS-G01-0004')
  await captureAcceptance(page, testInfo, '05-S3-fuse-inventory.png')

  await page.reload()
  await expect(page.locator('.game-shell')).toHaveClass(/state-S3/)
  await expect(page.locator('[data-inventory-item="ITM-G01-002"]')).toBeVisible()
  await expect(page.locator('[data-collectible-item="ITM-G01-001"]')).toHaveCount(0)
  await clickHotspotCenter(page, 'HS-G01-0003')
  await expect(page.getByRole('dialog', { name: '维修柜找物' })).toBeVisible()
  for (const [itemId] of cabinetItemHotspots) {
    await expect(page.locator(`[data-collectible-item="${itemId}"]`)).toHaveCount(0)
  }
  await captureAcceptance(page, testInfo, '05b-S3-reload-cabinet-empty.png')
  await page.getByRole('button', { name: '关闭维修柜特写' }).click()

  await page.locator('[data-inventory-item="ITM-G01-002"]').click()
  await clickHotspotCenter(page, 'HS-G01-0004')
  await expect(page.locator('.game-shell')).toHaveClass(/state-S4/)
  await expectHudDoesNotCover(page, 'HS-G01-0005')
  await clickHotspotCenter(page, 'HS-G01-0005')
  await expect(page.locator('.game-shell')).toHaveClass(/state-S5/)

  await page.reload()
  await expect(page.locator('.game-shell')).toHaveClass(/state-S5/)
  await expect(page.getByRole('heading', { name: '应急照明恢复' })).toBeVisible()
  await expect(page.locator('.lighting-layer')).toHaveCSS('opacity', '1')
  await page.getByRole('button', { name: '收起面板查看完整场景' }).click()
  await expect(page.getByRole('heading', { name: '应急照明恢复' })).toHaveCount(0)
  await expectProductionUi(page)
  await captureAcceptance(page, testInfo, '06-S5-lighting-restored.png')
  await captureHotspotCalibration(page, testInfo)

  await clickHotspotCenter(page, 'HS-G01-0006')
  await expect(page.locator('.game-shell')).toHaveClass(/state-S6/)
  await expect(page.getByRole('heading', { name: '继续寻找七码' })).toBeVisible()
  await expectProductionUi(page)
  await expectWorldStarCoreCountZero(page)
  await captureAcceptance(page, testInfo, '07-production-ui-no-dev-copy.png')
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
