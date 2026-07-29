import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { expect, type Page, test, type TestInfo } from '@playwright/test'

const collectBrowserErrors = (page: Page): string[] => {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', (error) => errors.push(error.message))
  return errors
}

const capture = async (
  page: Page,
  testInfo: TestInfo,
  name: string,
): Promise<void> => {
  const path = join(
    process.cwd(),
    'test-results',
    'g01-pr-a-visual',
    testInfo.project.name,
    name,
  )
  await mkdir(dirname(path), { recursive: true })
  await page.screenshot({ path, fullPage: true })
}

const seedScene = async (
  page: Page,
  sceneId: 'SCN-G01-02' | 'SCN-G01-03',
): Promise<void> => {
  await page.goto('/')
  await page.evaluate((targetScene) => {
    window.localStorage.clear()
    const timestamp = new Date().toISOString()
    const session = {
      schemaVersion: 2,
      chapterId: 'G01',
      currentSceneId: targetScene,
      sceneState: 'S0',
      sceneStates: {
        'SCN-G01-00': 'S6',
        'SCN-G01-01': 'S6',
        [targetScene]: 'S0',
      },
      foundItemIds: [],
      inventoryItemIds: [],
      usedItemIds: [],
      completedHotspotIds: [],
      completedPuzzleIds: [],
      hosProgress: {},
      puzzleProgress: {},
      hintCount: 0,
      hintLevels: {},
      flags: {
        g01_chapter_complete: false,
        g01_handoff_to_g02: false,
        g01_qima_online: true,
        g01_scn01_complete: true,
        world_star_core_count: 0,
      },
      dialogue: {
        currentDialogueId: null,
        active: false,
        readDialogueIds: [
          'DLG-G01-0001',
          'DLG-G01-0002',
          'DLG-G01-0003',
          'DLG-G01-0004',
          'DLG-G01-0005',
          'DLG-G01-0006',
        ],
      },
      dialogueHistory: [],
      characterStates: {
        'CHAR-XINGYU': 'normal',
        'CHAR-QIMA': 'normal',
      },
      unlockedCharacterIds: ['CHAR-XINGYU', 'CHAR-QIMA'],
      characterDiscoveries: {},
      transitionLog: [],
      updatedAt: timestamp,
    }
    window.localStorage.setItem('starwreck:save:G01:v1', JSON.stringify(session))
    window.localStorage.setItem(
      'starwreck:checkpoint:G01:v1',
      JSON.stringify(session),
    )
  }, sceneId)
  await page.reload()
  await expect(page.locator('.game-shell')).toHaveAttribute(
    'data-scene-id',
    sceneId,
  )
}

const clickHotspot = async (page: Page, hotspotId: string): Promise<void> => {
  const hotspot = page.locator(`[data-hotspot-id="${hotspotId}"]`)
  await expect(hotspot).toBeVisible()
  await hotspot.click()
}

const expectAligned = async (
  page: Page,
  itemId: string,
  hotspotId: string,
): Promise<void> => {
  const item = page.locator(`[data-collectible-item="${itemId}"]`)
  const hotspot = page.locator(`[data-hotspot-id="${hotspotId}"]`)
  await expect(item).toBeVisible()
  await expect(hotspot).toBeVisible()
  const boxes = await page.evaluate(
    ({ itemSelector, hotspotSelector }) => {
      const itemElement = document.querySelector(itemSelector)
      const hotspotElement = document.querySelector(hotspotSelector)
      if (!itemElement || !hotspotElement) return null
      const itemRect = itemElement.getBoundingClientRect()
      const hotspotRect = hotspotElement.getBoundingClientRect()
      return {
        itemBox: {
          x: itemRect.x,
          y: itemRect.y,
          width: itemRect.width,
          height: itemRect.height,
        },
        hotspotBox: {
          x: hotspotRect.x,
          y: hotspotRect.y,
          width: hotspotRect.width,
          height: hotspotRect.height,
        },
      }
    },
    {
      itemSelector: `[data-collectible-item="${itemId}"]`,
      hotspotSelector: `[data-hotspot-id="${hotspotId}"]`,
    },
  )
  expect(boxes).not.toBeNull()
  if (!boxes) return
  const { itemBox, hotspotBox } = boxes
  const x = itemBox.x + itemBox.width / 2
  const y = itemBox.y + itemBox.height / 2
  expect(x).toBeGreaterThanOrEqual(hotspotBox.x)
  expect(x).toBeLessThanOrEqual(hotspotBox.x + hotspotBox.width)
  expect(y).toBeGreaterThanOrEqual(hotspotBox.y)
  expect(y).toBeLessThanOrEqual(hotspotBox.y + hotspotBox.height)
}

const advanceDialogue = async (page: Page): Promise<void> => {
  const button = page.locator('[data-action="advance-dialogue"]')
  if (await button.isVisible()) await button.click()
}

const saveSnapshot = async (page: Page) =>
  page.evaluate(() =>
    JSON.parse(window.localStorage.getItem('starwreck:save:G01:v1') ?? '{}'),
  )

test('SCN-G01-02 completes a real scene-search, close-up, puzzle and drag flow', async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000)
  const errors = collectBrowserErrors(page)
  await seedScene(page, 'SCN-G01-02')
  await expect(page.locator('.game-shell')).toHaveClass(/state-S0/)
  await capture(page, testInfo, '01-scn02-initial.png')

  await clickHotspot(page, 'HS-G01-0009')
  await expect(page.locator('.game-shell')).toHaveClass(/state-S1/)
  await expect(page.locator('[data-dialogue-id="DLG-G01-0007"]')).toBeVisible()
  await capture(page, testInfo, '02-scn02-task-screen-dialogue.png')
  await advanceDialogue(page)

  const cluePairs = [
    ['RUNTIME-ITM-G01-MAINTENANCE-SHEET', 'RUNTIME-CLUE-G01-02-01'],
    ['RUNTIME-ITM-G01-STAR-MAP-KEY', 'RUNTIME-CLUE-G01-02-02'],
  ] as const
  for (const [itemId, hotspotId] of cluePairs) {
    await expectAligned(page, itemId, hotspotId)
    await clickHotspot(page, hotspotId)
    await expect(page.locator(`[data-collectible-item="${itemId}"]`)).toHaveCount(0)
  }
  await expect(page.locator('.game-shell')).toHaveClass(/state-S2/)
  await capture(page, testInfo, '03-scn02-clues-collected.png')

  await clickHotspot(page, 'HS-G01-0010')
  await expect(page.getByRole('heading', { name: '确认货舱路径' })).toBeVisible()
  await capture(page, testInfo, '04-scn02-map-closeup.png')
  await page.getByRole('button', { name: '记下路径' }).click()

  await clickHotspot(page, 'RUNTIME-HS-G01-02-TASK-PUZZLE')
  await expect(page.getByRole('heading', { name: '排列维修依赖' })).toBeVisible()
  await capture(page, testInfo, '05-scn02-dependency-puzzle.png')
  for (const name of ['测量货舱压力', '封堵外壳裂口', '启动货舱复压']) {
    await page.getByRole('button', { name: new RegExp(name) }).click()
  }
  await expect(page.locator('.game-shell')).toHaveClass(/state-S4/)

  const maintenanceSheet = page.locator(
    '[data-inventory-item="RUNTIME-ITM-G01-MAINTENANCE-SHEET"]',
  )
  await maintenanceSheet.click()
  await clickHotspot(page, 'RUNTIME-HS-G01-02-MAP-KEY')
  await expect(maintenanceSheet).toBeVisible()
  await expect(page.locator('.game-shell')).toHaveClass(/state-S4/)

  const mapKey = page.locator(
    '[data-inventory-item="RUNTIME-ITM-G01-STAR-MAP-KEY"]',
  )
  await mapKey.dragTo(
    page.locator('[data-drop-target="RUNTIME-HS-G01-02-MAP-KEY"]'),
  )
  await expect(page.locator('.game-shell')).toHaveClass(/state-S5/)
  await expect(mapKey).toHaveCount(0)
  await capture(page, testInfo, '06-scn02-map-unlocked.png')

  await page.reload()
  await expect(page.locator('.game-shell')).toHaveClass(/state-S5/)
  await expect(maintenanceSheet).toBeVisible()
  await maintenanceSheet.dragTo(
    page.locator('[data-drop-target="HS-G01-0011"]'),
  )
  await expect(page.locator('.game-shell')).toHaveClass(/state-S6/)
  await expect(page.locator('[data-dialogue-id="DLG-G01-0008"]')).toBeVisible()
  await capture(page, testInfo, '07-scn02-task-chain-complete.png')
  await advanceDialogue(page)
  await expect(
    page.getByRole('heading', { name: '前往漏气货舱' }),
  ).toBeVisible()

  const save = await saveSnapshot(page)
  expect(save.flags.world_star_core_count).toBe(0)
  expect(save.flags.g01_chapter_complete).toBe(false)
  expect(save.flags.g01_handoff_to_g02).toBe(false)
  expect(errors).toEqual([])
})

test('SCN-G01-03 preserves real HOS and repair progress across soft failure and reload', async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000)
  const errors = collectBrowserErrors(page)
  await seedScene(page, 'SCN-G01-03')
  await capture(page, testInfo, '08-scn03-initial.png')
  await clickHotspot(page, 'HS-G01-0013')
  await expect(page.locator('.game-shell')).toHaveClass(/state-S1/)
  await expect(page.locator('[data-dialogue-id="DLG-G01-0009"]')).toBeVisible()
  await advanceDialogue(page)

  await clickHotspot(page, 'RUNTIME-HS-G01-03-EMERGENCY-BOX')
  await expect(page.getByRole('heading', { name: '找出可用的维修物' })).toBeVisible()
  await capture(page, testInfo, '09-scn03-hos-initial.png')
  const hosPairs = [
    ['ITM-G01-007', 'HOS-G01-003-01'],
    ['ITM-G01-008', 'HOS-G01-003-02'],
    ['ITM-G01-009', 'HOS-G01-003-03'],
    ['RUNTIME-ITM-G01-REPRESS-KEY', 'HOS-G01-003-04'],
  ] as const
  for (const [itemId, hotspotId] of hosPairs) {
    await expectAligned(page, itemId, hotspotId)
    await clickHotspot(page, hotspotId)
    await expect(page.locator(`[data-collectible-item="${itemId}"]`)).toHaveCount(0)
  }
  await expect(page.locator('.game-shell')).toHaveClass(/state-S2/)
  await capture(page, testInfo, '10-scn03-hos-complete-inventory.png')

  const tape = page.locator('[data-inventory-item="ITM-G01-007"]')
  await tape.click()
  await clickHotspot(page, 'HS-G01-0014')
  await expect(tape).toBeVisible()
  await expect(page.locator('.game-shell')).toHaveClass(/state-S2/)

  const gauge = page.locator('[data-inventory-item="ITM-G01-009"]')
  await gauge.dragTo(page.locator('[data-drop-target="HS-G01-0014"]'))
  await expect(page.locator('.game-shell')).toHaveClass(/state-S3/)
  await expect(gauge).toBeVisible()
  await expect(page.locator('[data-dialogue-id="DLG-G01-0010"]')).toBeVisible()
  await advanceDialogue(page)

  await clickHotspot(page, 'RUNTIME-HS-G01-03-GAUGE-PUZZLE')
  await capture(page, testInfo, '11-scn03-pressure-closeup.png')
  for (const name of ['隔离外舱读数', '读取裂口压差', '锁定安全时间窗']) {
    await page.getByRole('button', { name }).click()
  }
  await expect(page.locator('.game-shell')).toHaveClass(/state-S4/)

  await tape.click()
  await clickHotspot(page, 'HS-G01-0015-PATCH')
  await expect(tape).toBeVisible()
  const patch = page.locator('[data-inventory-item="ITM-G01-008"]')
  await patch.dragTo(page.locator('[data-drop-target="HS-G01-0015-PATCH"]'))
  await expect(patch).toHaveCount(0)
  await capture(page, testInfo, '12-scn03-patch-installed.png')

  const beforeFailure = await saveSnapshot(page)
  await page.locator('[data-action="trigger-cargo-soft-fail"]').click()
  await expect(
    page.getByRole('heading', { name: '已退回货舱安全门' }),
  ).toBeVisible()
  const afterFailure = await saveSnapshot(page)
  expect(afterFailure.inventoryItemIds).toEqual(beforeFailure.inventoryItemIds)
  expect(afterFailure.foundItemIds).toEqual(beforeFailure.foundItemIds)
  expect(afterFailure.completedHotspotIds).toEqual(
    beforeFailure.completedHotspotIds,
  )
  expect(afterFailure.completedPuzzleIds).toEqual(
    beforeFailure.completedPuzzleIds,
  )
  expect(afterFailure.flags.g01_scn03_evidence_pressure_reading).toBe(true)
  await capture(page, testInfo, '13-scn03-soft-failure-safe-node.png')

  await page.reload()
  await expect(
    page.getByRole('heading', { name: '已退回货舱安全门' }),
  ).toBeVisible()
  await expect(
    page.locator('[data-collectible-item="ITM-G01-008"]'),
  ).toHaveCount(0)
  await page.getByRole('button', { name: '从保留进度继续' }).click()
  await tape.dragTo(page.locator('[data-drop-target="HS-G01-0015-TAPE"]'))
  await expect(page.locator('.game-shell')).toHaveClass(/state-S5/)

  const key = page.locator(
    '[data-inventory-item="RUNTIME-ITM-G01-REPRESS-KEY"]',
  )
  await key.dragTo(page.locator('[data-drop-target="HS-G01-0016"]'))
  await expect(page.locator('.game-shell')).toHaveClass(/state-S6/)
  await expect(page.locator('[data-dialogue-id="DLG-G01-0011"]')).toBeVisible()
  await capture(page, testInfo, '14-scn03-repress-dialogue.png')
  await advanceDialogue(page)
  await expect(
    page.getByRole('heading', { name: '货舱压力恢复' }),
  ).toBeVisible()
  await capture(page, testInfo, '15-scn03-complete.png')

  const save = await saveSnapshot(page)
  expect(save.flags.g01_cargo_sealed).toBe(true)
  expect(save.flags.world_star_core_count).toBe(0)
  expect(save.flags.g01_chapter_complete).toBe(false)
  expect(save.flags.g01_handoff_to_g02).toBe(false)
  expect(save.currentSceneId).toBe('SCN-G01-03')
  expect(errors).toEqual([])
})
