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

const waitForVisualAssets = async (page: Page): Promise<void> => {
  await page.evaluate(async () => {
    await document.fonts.ready
    const images = [...document.querySelectorAll<HTMLImageElement>('img')]
    await Promise.all(
      images.map(async (image) => {
        if (!image.complete) {
          await new Promise<void>((resolve, reject) => {
            image.addEventListener('load', () => resolve(), { once: true })
            image.addEventListener(
              'error',
              () => reject(new Error(`image failed to load: ${image.src}`)),
              { once: true },
            )
          })
        }
        if (image.naturalWidth === 0) {
          throw new Error(`image has no decoded pixels: ${image.src}`)
        }
        await image.decode()
      }),
    )

    const backgroundUrls = [
      ...new Set(
        [...document.querySelectorAll<HTMLElement>('*')]
          .map((element) => getComputedStyle(element).backgroundImage)
          .flatMap((background) =>
            [...background.matchAll(/url\(["']?(.+?)["']?\)/g)].map(
              (match) => match[1],
            ),
          )
          .filter((url): url is string => Boolean(url)),
      ),
    ]
    await Promise.all(
      backgroundUrls.map(
        (url) =>
          new Promise<void>((resolve, reject) => {
            const image = new Image()
            image.onload = () => resolve()
            image.onerror = () =>
              reject(new Error(`background failed to load: ${url}`))
            image.src = url
          }),
      ),
    )
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    )
  })
}

const capture = async (
  page: Page,
  testInfo: TestInfo,
  name: string,
): Promise<void> => {
  await waitForVisualAssets(page)
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
      activeRuntimeNodeId: null,
      safeRecovery: null,
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

const cargoHosPairs = [
  ['ITM-G01-007', 'HOS-G01-003-01'],
  ['ITM-G01-008', 'HOS-G01-003-02'],
  ['ITM-G01-009', 'HOS-G01-003-03'],
  ['RUNTIME-ITM-G01-REPRESS-KEY', 'HOS-G01-003-04'],
] as const

const advanceCargoTo = async (
  page: Page,
  stage: 'S1' | 'S2' | 'S3' | 'S4',
): Promise<void> => {
  await seedScene(page, 'SCN-G01-03')
  await clickHotspot(page, 'HS-G01-0013')
  await advanceDialogue(page)
  if (stage === 'S1') return

  await clickHotspot(page, 'RUNTIME-HS-G01-03-EMERGENCY-BOX')
  for (const [, hotspotId] of cargoHosPairs) await clickHotspot(page, hotspotId)
  await expect(page.locator('.game-shell')).toHaveClass(/state-S2/)
  if (stage === 'S2') return

  await page
    .locator('[data-inventory-item="ITM-G01-009"]')
    .dragTo(page.locator('[data-drop-target="HS-G01-0014"]'))
  await advanceDialogue(page)
  await expect(page.locator('.game-shell')).toHaveClass(/state-S3/)
  if (stage === 'S3') return

  await clickHotspot(page, 'RUNTIME-HS-G01-03-GAUGE-PUZZLE')
  for (const name of ['隔离外舱读数', '读取裂口压差', '锁定安全时间窗']) {
    await page.getByRole('button', { name }).click()
  }
  await expect(page.locator('.game-shell')).toHaveClass(/state-S4/)
  await page
    .locator('[data-inventory-item="ITM-G01-008"]')
    .dragTo(page.locator('[data-drop-target="HS-G01-0015-PATCH"]'))
  await expect(
    page.locator('[data-inventory-item="ITM-G01-008"]'),
  ).toHaveCount(0)
}

test('SCN-G01-02 completes a real scene-search, close-up, puzzle and drag flow', async ({
  page,
}, testInfo) => {
  test.setTimeout(180_000)
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
  await capture(page, testInfo, '06a-scn02-wrong-use-before.png')
  await maintenanceSheet.click()
  await clickHotspot(page, 'RUNTIME-HS-G01-02-MAP-KEY')
  await expect(maintenanceSheet).toBeVisible()
  await expect(page.locator('.game-shell')).toHaveClass(/state-S4/)
  await capture(page, testInfo, '06b-scn02-wrong-use-after-item-kept.png')

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
  await expect(
    page.locator('[data-hotspot-id="HS-G01-0012"]'),
  ).toHaveCount(0)
  await expect(
    page.locator('[data-hotspot-id="RUNTIME-HS-G01-02-CARGO-ENTRY"]'),
  ).toBeVisible()
  await capture(page, testInfo, '07b-scn02-runtime-cargo-entry-boundary.png')

  const save = await saveSnapshot(page)
  expect(save.flags.world_star_core_count).toBe(0)
  expect(save.flags.g01_chapter_complete).toBe(false)
  expect(save.flags.g01_handoff_to_g02).toBe(false)
  expect(errors).toEqual([])
})

test('SCN-G01-03 preserves real HOS and repair progress across soft failure and reload', async ({
  page,
}, testInfo) => {
  test.setTimeout(180_000)
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
  for (const [itemId, hotspotId] of cargoHosPairs) {
    await expectAligned(page, itemId, hotspotId)
    await clickHotspot(page, hotspotId)
    await expect(page.locator(`[data-collectible-item="${itemId}"]`)).toHaveCount(0)
  }
  await expect(page.locator('.game-shell')).toHaveClass(/state-S2/)
  await capture(page, testInfo, '10-scn03-hos-complete-inventory.png')

  const tape = page.locator('[data-inventory-item="ITM-G01-007"]')
  await capture(page, testInfo, '10a-scn03-wrong-use-before.png')
  await tape.click()
  await clickHotspot(page, 'HS-G01-0014')
  await expect(tape).toBeVisible()
  await expect(page.locator('.game-shell')).toHaveClass(/state-S2/)
  await capture(page, testInfo, '10b-scn03-wrong-use-after-item-kept.png')

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
  await expect(page.locator('.game-shell')).toHaveAttribute(
    'data-runtime-node-id',
    'SCN-G01-03:cargo-safety-door',
  )
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
  await expect(page.locator('.game-shell')).toHaveAttribute(
    'data-runtime-node-id',
    'SCN-G01-03:cargo-safety-door',
  )
  await capture(page, testInfo, '13b-scn03-safe-node-after-refresh.png')
  await page.getByRole('button', { name: /从 S4 保留进度继续/ }).click()
  await expect(page.locator('.game-shell')).toHaveClass(/state-S4/)
  await capture(page, testInfo, '13c-scn03-resumed-at-pre-failure-state.png')
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

  await page.getByRole('button', { name: '对话历史' }).click()
  await capture(page, testInfo, '16a-scn03-dialogue-history-before-refresh.png')
  await page.reload()
  await page.getByRole('button', { name: '对话历史' }).click()
  await expect(
    page.locator('[data-history-dialogue-id="DLG-G01-0011"]'),
  ).toBeVisible()
  await capture(page, testInfo, '16b-scn03-dialogue-history-after-refresh.png')
  await page.getByRole('button', { name: '关闭对话历史' }).click()

  await page.getByRole('button', { name: '角色档案' }).click()
  await capture(page, testInfo, '17a-scn03-character-profile-before-refresh.png')
  await page.reload()
  await page.getByRole('button', { name: '角色档案' }).click()
  await expect(page.locator('[data-character-id="CHAR-QIMA"]')).toBeVisible()
  await capture(page, testInfo, '17b-scn03-character-profile-after-refresh.png')
  await page.getByRole('button', { name: '关闭角色档案' }).click()

  await capture(page, testInfo, '18a-scn03-s6-before-refresh.png')
  await page.reload()
  await expect(page.locator('.game-shell')).toHaveClass(/state-S6/)
  await expect(
    page.getByRole('heading', { name: '货舱压力恢复' }),
  ).toBeVisible()
  await expect(page.locator('[data-evidence-summary]')).toContainText(
    '漏气调查、测压读数与正确修复步骤',
  )
  await capture(page, testInfo, '18b-scn03-s6-after-refresh.png')
  await expect(page.getByRole('button', { name: '前往导航星图室' })).toBeVisible()
  await capture(page, testInfo, '19-scn04-entry-open.png')

  const save = await saveSnapshot(page)
  expect(save.flags.g01_cargo_sealed).toBe(true)
  expect(save.flags.world_star_core_count).toBe(0)
  expect(save.flags.g01_chapter_complete).toBe(false)
  expect(save.flags.g01_handoff_to_g02).toBe(false)
  expect(save.currentSceneId).toBe('SCN-G01-03')
  expect(errors).toEqual([])
})

for (const stage of ['S1', 'S2', 'S3', 'S4'] as const) {
  test(`SCN-G01-03 ${stage} soft failure enters and persists the real safety node`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(90_000)
    const errors = collectBrowserErrors(page)
    await advanceCargoTo(page, stage)
    const beforeFailure = await saveSnapshot(page)
    await capture(page, testInfo, `20-${stage.toLowerCase()}-failure-before.png`)

    await page.locator('[data-action="trigger-cargo-soft-fail"]').click()
    await expect(page.locator('.game-shell')).toHaveAttribute(
      'data-runtime-node-id',
      'SCN-G01-03:cargo-safety-door',
    )
    await expect(
      page.locator('[data-safe-recovery-node="SCN-G01-03:cargo-safety-door"]'),
    ).toHaveAttribute('data-pre-failure-state', stage)
    const atSafetyNode = await saveSnapshot(page)
    expect(atSafetyNode.safeRecovery.preFailureState).toBe(stage)
    expect(atSafetyNode.inventoryItemIds).toEqual(beforeFailure.inventoryItemIds)
    expect(atSafetyNode.foundItemIds).toEqual(beforeFailure.foundItemIds)
    expect(atSafetyNode.hosProgress).toEqual(beforeFailure.hosProgress)
    expect(atSafetyNode.completedHotspotIds).toEqual(
      beforeFailure.completedHotspotIds,
    )
    expect(atSafetyNode.completedPuzzleIds).toEqual(
      beforeFailure.completedPuzzleIds,
    )
    expect(atSafetyNode.puzzleProgress).toEqual(beforeFailure.puzzleProgress)
    expect(atSafetyNode.flags.g01_scn03_evidence_leak_confirmed).toBe(true)
    expect(
      atSafetyNode.flags.g01_scn03_evidence_pressure_reading === true,
    ).toBe(stage === 'S4')
    await capture(page, testInfo, `21-${stage.toLowerCase()}-actual-safe-node.png`)

    await page.reload()
    await expect(page.locator('.game-shell')).toHaveAttribute(
      'data-runtime-node-id',
      'SCN-G01-03:cargo-safety-door',
    )
    await capture(
      page,
      testInfo,
      `22-${stage.toLowerCase()}-safe-node-after-refresh.png`,
    )

    await page.getByRole('button', { name: new RegExp(`从 ${stage} 保留进度继续`) }).click()
    await expect(page.locator('.game-shell')).toHaveClass(
      new RegExp(`state-${stage}`),
    )
    const resumed = await saveSnapshot(page)
    expect(resumed.activeRuntimeNodeId).toBeNull()
    expect(resumed.safeRecovery).toBeNull()
    expect(resumed.sceneState).toBe(stage)
    expect(resumed.inventoryItemIds).toEqual(beforeFailure.inventoryItemIds)
    expect(resumed.foundItemIds).toEqual(beforeFailure.foundItemIds)
    expect(resumed.hosProgress).toEqual(beforeFailure.hosProgress)
    expect(new Set(resumed.foundItemIds).size).toBe(resumed.foundItemIds.length)
    await capture(
      page,
      testInfo,
      `23-${stage.toLowerCase()}-resumed-original-progress.png`,
    )
    expect(errors).toEqual([])
  })
}
