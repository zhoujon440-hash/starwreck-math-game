import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { expect, type Locator, type Page, test, type TestInfo } from '@playwright/test'

const scene00CabinetItems = [
  ['ITM-G01-002', 'HOS-G01-001-01'],
  ['ITM-G01-003', 'HOS-G01-001-02'],
  ['ITM-G01-004', 'HOS-G01-001-03'],
  ['ITM-G01-005', 'HOS-G01-001-04'],
] as const

const scene01CoreItems = [
  ['ITM-G01-101', 'HOS-G01-101-01'],
  ['ITM-G01-102', 'HOS-G01-101-02'],
  ['ITM-G01-103', 'HOS-G01-101-03'],
  ['ITM-G01-104', 'HOS-G01-101-04'],
] as const

const forbiddenProductionCopy =
  /(?:\bS[0-6]\b|schema(?:\s+v?\d+)?|项目负责人|验收|交付边界|稳定\s*ID|开发阶段|测试文字|\bPR\b)/i

const collectBrowserErrors = (page: Page): string[] => {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', (error) => errors.push(error.message))
  return errors
}

const expectProductionUi = async (page: Page): Promise<void> => {
  await expect(page.locator('.game-shell')).toHaveAttribute('data-debug-ui', 'false')
  const playerCopy = await page.locator('body').innerText()
  expect(playerCopy).not.toMatch(forbiddenProductionCopy)
  expect(playerCopy).not.toContain(['小', '砾'].join(''))
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

const captureAcceptance = async (
  page: Page,
  testInfo: TestInfo,
  fileName: string,
): Promise<void> => {
  const screenshotPath = join(
    process.cwd(),
    'test-results',
    'character-story-acceptance',
    testInfo.project.name,
    fileName,
  )
  await mkdir(dirname(screenshotPath), { recursive: true })
  await page.screenshot({ path: screenshotPath, fullPage: true })
}

const resetGame = async (page: Page): Promise<void> => {
  await page.goto('/')
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
  await expect(page.getByRole('heading', { name: '拾光号熄灯' })).toBeVisible()
  await expectProductionUi(page)
}

const clickHotspotCenter = async (page: Page, hotspotId: string): Promise<void> => {
  const hotspot = page.locator(`[data-hotspot-id="${hotspotId}"]`)
  await expect(hotspot).toBeVisible()
  const box = await hotspot.boundingBox()
  expect(box).not.toBeNull()
  if (!box) return
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
}

const finishStoryBeat = async (page: Page): Promise<void> => {
  for (let guard = 0; guard < 120; guard += 1) {
    const introduction = page.locator('.character-introduction')
    if (await introduction.isVisible().catch(() => false)) {
      await introduction.getByRole('button', { name: '记录角色档案' }).click()
      continue
    }
    const dialogue = page.locator('.dialogue-stage')
    if (await dialogue.isVisible().catch(() => false)) {
      await dialogue.locator('.dialogue-copy').click()
      continue
    }
    return
  }
  throw new Error('Story beat did not finish within the safety limit.')
}

const expectInsideViewport = async (locator: Locator, page: Page): Promise<void> => {
  const box = await locator.boundingBox()
  expect(box).not.toBeNull()
  if (!box) return
  const viewport = page.viewportSize()
  expect(viewport).not.toBeNull()
  if (!viewport) return
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.y).toBeGreaterThanOrEqual(0)
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1)
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1)
}

const expectCollectibleAligned = async (
  page: Page,
  itemId: string,
  hotspotId: string,
): Promise<void> => {
  const collectible = page.locator(`[data-collectible-item="${itemId}"]`)
  const hotspot = page.locator(`[data-hotspot-id="${hotspotId}"]`)
  await expect(collectible).toBeVisible()
  await expect(hotspot).toBeVisible()
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

const captureHotspotCalibration = async (
  page: Page,
  testInfo: TestInfo,
): Promise<void> => {
  await page.evaluate(() => {
    document.querySelectorAll<HTMLElement>('[data-hotspot-id]').forEach((hotspot) => {
      const label = document.createElement('span')
      label.className = 'acceptance-hotspot-label'
      label.textContent = hotspot.dataset.hotspotId ?? ''
      hotspot.classList.add('acceptance-hotspot')
      hotspot.append(label)
    })
    const style = document.createElement('style')
    style.dataset.acceptanceDebugStyle = 'true'
    style.textContent = `
      .acceptance-hotspot {
        border: 2px solid #60f6ff !important;
        background: rgb(46 222 236 / 12%) !important;
        box-shadow: inset 0 0 0 1px #031015, 0 0 12px rgb(96 246 255 / 65%) !important;
      }
      .acceptance-hotspot-label {
        position: absolute;
        bottom: 100%;
        left: 0;
        padding: 3px 5px;
        color: #eaffff;
        font: 9px/1.2 sans-serif;
        white-space: nowrap;
        background: rgb(2 10 14 / 92%);
      }
    `
    document.head.append(style)
  })
  await captureAcceptance(page, testInfo, 'debug/hotspot-calibration.png')
  await page.evaluate(() => {
    document.querySelectorAll('.acceptance-hotspot-label').forEach((element) => element.remove())
    document.querySelectorAll('.acceptance-hotspot').forEach((element) =>
      element.classList.remove('acceptance-hotspot'),
    )
    document.querySelector('[data-acceptance-debug-style]')?.remove()
  })
}

const startAndCompleteScene00 = async (
  page: Page,
  testInfo?: TestInfo,
): Promise<void> => {
  await page.getByRole('button', { name: '接入应急终端' }).click()
  await expect(page.locator('[data-character-portrait="xingyu"]')).toBeVisible()
  await expect(page.locator('[data-character-portrait="xingyu"]')).toHaveAttribute(
    'data-portrait-state',
    'alert',
  )
  if (testInfo) {
    await expect(page.locator('[data-dialogue-text]')).toContainText('七码？回答。')
    await captureAcceptance(page, testInfo, '00-xingyu-opening-dialogue.png')
  }

  await page.locator('.dialogue-copy').click()
  await page.locator('.dialogue-copy').click()
  await expect(page.locator('.character-introduction')).toBeVisible()
  if (testInfo) await captureAcceptance(page, testInfo, '01-xingyu-introduction.png')
  await page.getByRole('button', { name: '记录角色档案' }).click()
  await finishStoryBeat(page)

  await expect(page.locator('.game-shell')).toHaveAttribute('data-current-scene', 'SCN-G01-00')
  await expect(page.locator('[data-collectible-item="ITM-G01-001"]')).toBeVisible()
  if (testInfo) await captureAcceptance(page, testInfo, '02-scene00-search.png')
  await clickHotspotCenter(page, 'HS-G01-0001')
  await expect(page.locator('[data-collectible-item="ITM-G01-001"]')).toHaveCount(0)
  await finishStoryBeat(page)

  await page.locator('[data-inventory-item="ITM-G01-001"]').click()
  await clickHotspotCenter(page, 'HS-G01-0002')
  await finishStoryBeat(page)
  await clickHotspotCenter(page, 'HS-G01-0003')
  await expect(page.getByRole('dialog', { name: '维修柜找物' })).toBeVisible()
  for (const [itemId, hotspotId] of scene00CabinetItems) {
    await expectCollectibleAligned(page, itemId, hotspotId)
    await clickHotspotCenter(page, hotspotId)
    await expect(page.locator(`[data-collectible-item="${itemId}"]`)).toHaveCount(0)
  }
  await finishStoryBeat(page)
  const closeCabinet = page.getByRole('button', { name: '关闭维修柜特写' })
  if (await closeCabinet.isVisible().catch(() => false)) await closeCabinet.click()

  const fuse = page.locator('[data-inventory-item="ITM-G01-002"]')
  await expect(fuse).toBeVisible()
  await fuse.dragTo(page.locator('[data-drop-target="HS-G01-0004"]'))
  await finishStoryBeat(page)
  await clickHotspotCenter(page, 'HS-G01-0005')
  await finishStoryBeat(page)
  if (testInfo) await captureAcceptance(page, testInfo, '03-scene00-lighting-restored.png')
  await clickHotspotCenter(page, 'HS-G01-0006')
  await expect(page.getByRole('heading', { name: '前往导航核心舱' })).toBeVisible()
  await expectWorldStarCoreCountZero(page)
}

test('character story acceptance completes both playable scenes and survives reload', async ({
  page,
}, testInfo) => {
  const browserErrors = collectBrowserErrors(page)
  await resetGame(page)
  await startAndCompleteScene00(page, testInfo)
  await expectProductionUi(page)

  await page.getByRole('button', { name: '追踪七码的信号' }).click()
  await expect(page.locator('.game-shell')).toHaveAttribute('data-current-scene', 'SCN-G01-01')
  await expect(page.locator('.game-shell')).toHaveAttribute('data-qima-state', 'offline')
  await expect(page.locator('.qima-scene-sprite')).toHaveClass(/qima-offline/)
  await finishStoryBeat(page)
  await captureAcceptance(page, testInfo, '04-scene01-qima-offline.png')

  await clickHotspotCenter(page, 'HS-G01-0101')
  await finishStoryBeat(page)
  await expect(page.locator('.game-shell')).toHaveAttribute('data-qima-state', 'damaged')
  await clickHotspotCenter(page, 'HS-G01-0102')
  await expect(page.getByRole('dialog', { name: '七码核心检修' })).toBeVisible()
  for (const [itemId, hotspotId] of scene01CoreItems) {
    await expectCollectibleAligned(page, itemId, hotspotId)
  }
  await captureAcceptance(page, testInfo, '05-qima-core-hidden-objects.png')

  for (const [itemId, hotspotId] of scene01CoreItems) {
    await clickHotspotCenter(page, hotspotId)
    await expect(page.locator(`[data-collectible-item="${itemId}"]`)).toHaveCount(0)
  }
  await expect(page.locator('.dialogue-stage')).toBeVisible()
  await page.reload()
  await expect(page.locator('.dialogue-stage')).toBeVisible()
  await expect(page.locator('.game-shell')).toHaveAttribute('data-qima-state', 'damaged')
  for (const [itemId] of scene01CoreItems) {
    await expect(page.locator(`[data-collectible-item="${itemId}"]`)).toHaveCount(0)
  }
  await finishStoryBeat(page)
  await clickHotspotCenter(page, 'HS-G01-0102')

  const wrongChip = page.locator('.core-modal [data-inventory-item="ITM-G01-101"]')
  await wrongChip.dragTo(page.locator('[data-drop-target="HS-G01-0103"]'))
  await expect(wrongChip).toBeVisible()
  await expect(page.locator('.toast')).not.toHaveClass(/is-visible/, { timeout: 5_000 })

  const repairSteps = [
    ['ITM-G01-104', 'HS-G01-0103'],
    ['ITM-G01-101', 'HS-G01-0104'],
    ['ITM-G01-102', 'HS-G01-0105'],
    ['ITM-G01-103', 'HS-G01-0106'],
  ] as const
  for (const [itemId, targetId] of repairSteps) {
    const item = page.locator(`.core-modal [data-inventory-item="${itemId}"]`)
    await item.dragTo(page.locator(`[data-drop-target="${targetId}"]`))
    await finishStoryBeat(page)
  }

  await expect(page.locator('.game-shell')).toHaveAttribute('data-qima-state', 'booting')
  await expect(page.getByRole('dialog', { name: '线路校准' })).toBeVisible()
  await captureAcceptance(page, testInfo, '06-qima-booting-circuit.png')
  await captureHotspotCalibration(page, testInfo)

  for (const node of ['冷白', '琥珀', '青蓝', '红色']) {
    await page.getByRole('button', { name: `接通${node}线路` }).click()
  }
  await expect(page.locator('[data-dialogue-text]')).toContainText('EDU-0077恢复运行')
  await page.locator('.dialogue-copy').click()
  await expect(page.locator('.character-introduction')).toBeVisible()
  await expect(page.locator('.character-introduction')).toContainText('EDU-0077')
  await expect(page.locator('.game-shell')).toHaveAttribute('data-qima-state', 'normal')
  await captureAcceptance(page, testInfo, '07-qima-introduction.png')

  await page.getByRole('button', { name: '记录角色档案' }).click()
  await expect(page.locator('[data-dialogue-text]')).toContainText('你没有拆船吧')
  await expect(page.locator('[data-character-portrait="xingyu"]')).toBeVisible()
  await expect(page.locator('[data-character-portrait="qima"]')).toBeVisible()
  await expectInsideViewport(page.locator('.dialogue-console'), page)
  await captureAcceptance(page, testInfo, '08-xingyu-qima-first-conversation.png')
  await finishStoryBeat(page)

  await page.getByRole('button', { name: '查看搭档档案' }).click()
  await expect(page.locator('[data-profile-character="xingyu"]')).toBeVisible()
  await expect(page.locator('[data-profile-character="qima"]')).toContainText('EDU-0077')
  await expectInsideViewport(page.locator('.profiles-modal'), page)
  await captureAcceptance(page, testInfo, '09-character-profiles.png')
  await page.getByRole('button', { name: '关闭角色档案' }).click()

  await page.reload()
  await expect(page.locator('.game-shell')).toHaveAttribute('data-current-scene', 'SCN-G01-01')
  await expect(page.locator('.game-shell')).toHaveAttribute('data-qima-state', 'normal')
  await expect(page.locator('.qima-scene-sprite')).toHaveClass(/qima-normal/)
  await expect(page.locator('.character-introduction')).toHaveCount(0)
  await expect(page.locator('.dialogue-stage')).toHaveCount(0)
  await page.getByRole('button', { name: '对话历史' }).click()
  await expect(page.getByRole('dialog', { name: '对话历史' })).toContainText(
    '那是船的一部分',
  )
  await page.getByRole('button', { name: '关闭对话历史' }).click()
  await expectProductionUi(page)
  await expectWorldStarCoreCountZero(page)
  await captureAcceptance(page, testInfo, '10-scene01-complete-after-reload.png')
  expect(browserErrors).toEqual([])
})

test('production character assets and first-scene drag remain calibrated', async ({
  page,
}) => {
  const browserErrors = collectBrowserErrors(page)
  await resetGame(page)
  await page.getByRole('button', { name: '接入应急终端' }).click()
  await expect(page.locator('[data-character-portrait="xingyu"]')).toBeVisible()
  await expect
    .poll(() =>
      page.locator('[data-character-portrait="xingyu"]').evaluate(
        (element) =>
          element instanceof HTMLImageElement &&
          element.complete &&
          element.naturalWidth >= 400 &&
          getComputedStyle(element).backgroundImage === 'none',
      ),
    )
    .toBe(true)
  await finishStoryBeat(page)
  await expectCollectibleAligned(page, 'ITM-G01-001', 'HS-G01-0001')
  await expectProductionUi(page)
  expect(browserErrors).toEqual([])
})
