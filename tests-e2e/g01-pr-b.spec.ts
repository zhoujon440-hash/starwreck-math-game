import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { expect, type Page, test, type TestInfo } from '@playwright/test'

const scn04ItemIds = [
  'RUNTIME-ITM-G01-010-A',
  'RUNTIME-ITM-G01-010-B',
  'RUNTIME-ITM-G01-010-C',
  'ITM-G01-011',
]

const browserErrors = (page: Page) => {
  const errors: string[] = []
  page.on('console', (message) => message.type() === 'error' && errors.push(message.text()))
  page.on('pageerror', (error) => errors.push(error.message))
  return errors
}

const capture = async (page: Page, info: TestInfo, name: string) => {
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all([...document.images].map(async (image) => {
      if (!image.complete) await new Promise<void>((resolve) => image.addEventListener('load', () => resolve(), { once: true }))
      if (image.naturalWidth) await image.decode()
    }))
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
  })
  const path = join(process.cwd(), 'test-results', 'g01-pr-b-visual', info.project.name, name)
  await mkdir(dirname(path), { recursive: true })
  await page.screenshot({ path, fullPage: true })
}

const seed = async (page: Page, sceneId: 'SCN-G01-04' | 'SCN-G01-05') => {
  await page.goto('/')
  await page.evaluate((currentSceneId) => {
    localStorage.clear()
    const updatedAt = new Date().toISOString()
    const session = {
      schemaVersion: 2,
      chapterId: 'G01',
      currentSceneId,
      sceneState: 'S0',
      sceneStates: { 'SCN-G01-00': 'S6', 'SCN-G01-01': 'S6', 'SCN-G01-02': 'S6', 'SCN-G01-03': 'S6', [currentSceneId]: 'S0' },
      activeRuntimeNodeId: null,
      safeRecovery: null,
      foundItemIds: ['ITM-G01-001'],
      inventoryItemIds: ['ITM-G01-001'],
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
        world_star_core_count: 0,
        ability_qima_search: false,
        ability_analysis: false,
        ability_pathfinding: false,
        ability_teleport: false,
        ability_shrink: false,
        ability_clone: false,
      },
      dialogue: { currentDialogueId: null, active: false, readDialogueIds: Array.from({ length: 16 }, (_, index) => `DLG-G01-${String(index + 1).padStart(4, '0')}`) },
      dialogueHistory: [],
      characterStates: { 'CHAR-XINGYU': 'normal', 'CHAR-QIMA': 'normal' },
      unlockedCharacterIds: ['CHAR-XINGYU', 'CHAR-QIMA'],
      characterDiscoveries: {},
      transitionLog: [],
      updatedAt,
    }
    localStorage.setItem('starwreck:save:G01:v1', JSON.stringify(session))
    localStorage.setItem('starwreck:checkpoint:G01:v1', JSON.stringify(session))
  }, sceneId)
  await page.reload()
  await expect(page.locator('.game-shell')).toHaveAttribute('data-scene-id', sceneId)
}

const clickHotspot = async (page: Page, id: string) => {
  const target = page.locator(`[data-hotspot-id="${id}"]`)
  await expect(target).toBeVisible()
  await target.click()
}

const useItem = async (page: Page, itemId: string, targetId: string) => {
  await page.locator(`[data-inventory-item="${itemId}"]`).click()
  await clickHotspot(page, targetId)
}

test('SCN-G01-04 full HOPA, soft recovery, history and profile evidence', async ({ page }, info) => {
  const errors = browserErrors(page)
  await seed(page, 'SCN-G01-04')
  await capture(page, info, '01-scn04-initial.png')
  await clickHotspot(page, 'HS-G01-0017')
  await expect(page.locator('#star-map-hos-title')).toBeVisible()
  for (let index = 1; index <= 4; index += 1) {
    const item = page.locator(`[data-collectible-item="${scn04ItemIds[index - 1]}"]`)
    const hotspot = page.locator(`[data-hotspot-id="HOS-G01-004-${String(index).padStart(2, '0')}"]`)
    const [itemBox, hotspotBox] = await Promise.all([item.boundingBox(), hotspot.boundingBox()])
    expect(itemBox).not.toBeNull()
    expect(hotspotBox).not.toBeNull()
    expect(Math.abs(itemBox!.x + itemBox!.width / 2 - (hotspotBox!.x + hotspotBox!.width / 2))).toBeLessThan(2)
    expect(Math.abs(itemBox!.y + itemBox!.height / 2 - (hotspotBox!.y + hotspotBox!.height / 2))).toBeLessThan(2)
  }
  await capture(page, info, '02-scn04-hos-initial.png')
  for (let index = 1; index <= 4; index += 1) await clickHotspot(page, `HOS-G01-004-${String(index).padStart(2, '0')}`)
  await expect(page.locator('.game-shell')).toHaveClass(/state-S2/)
  await capture(page, info, '03-scn04-hos-items-inventory.png')

  await useItem(page, 'ITM-G01-011', 'HS-G01-0018-A')
  await expect(page.locator(`[data-inventory-item="ITM-G01-011"]`)).toBeVisible()
  await capture(page, info, '04-scn04-wrong-use-nonconsume.png')
  await useItem(page, 'RUNTIME-ITM-G01-010-A', 'HS-G01-0018-A')
  await useItem(page, 'RUNTIME-ITM-G01-010-B', 'HS-G01-0018-B')
  await useItem(page, 'RUNTIME-ITM-G01-010-C', 'HS-G01-0018-C')
  await expect(page.locator('.game-shell')).toHaveClass(/state-S3/)
  await capture(page, info, '05-scn04-fragments-embedded.png')
  await clickHotspot(page, 'HS-G01-0018')
  await page.getByRole('button', { name: '锁定十二星门环' }).click()
  await expect(page.locator('.game-shell')).toHaveClass(/state-S4/)
  await capture(page, info, '06-scn04-calibrated.png')

  await page.locator('[data-action="trigger-pr-b-soft-fail"]').click()
  await expect(page.locator('[data-safe-recovery-node="SCN-G01-04:star-map-console-safe"]')).toBeVisible()
  await capture(page, info, '07-scn04-safe-node.png')
  await page.reload()
  await expect(page.locator('[data-safe-recovery-node="SCN-G01-04:star-map-console-safe"]')).toBeVisible()
  await capture(page, info, '08-scn04-safe-node-refresh.png')
  await page.getByRole('button', { name: '保留进度继续' }).click()
  await clickHotspot(page, 'HS-G01-0019')
  await expect(page.locator('.game-shell')).toHaveClass(/state-S5/)
  await capture(page, info, '09-scn04-evidence-analysis.png')
  await useItem(page, 'ITM-G01-011', 'HS-G01-0020')
  await expect(page.locator('.game-shell')).toHaveClass(/state-S6/)
  await capture(page, info, '10-scn04-complete.png')
  await page.getByRole('button', { name: '对话历史' }).click()
  await capture(page, info, '11-dialogue-history.png')
  await page.getByRole('button', { name: /关闭.*历史/ }).click()
  await page.getByRole('button', { name: '角色档案' }).click()
  await capture(page, info, '12-character-profile.png')
  expect(errors).toEqual([])
})

test('SCN-G01-05 ordered route, window failure, save recovery and boundary', async ({ page }, info) => {
  const errors = browserErrors(page)
  await seed(page, 'SCN-G01-05')
  await capture(page, info, '13-scn05-initial.png')
  await clickHotspot(page, 'HS-G01-0021')
  await capture(page, info, '14-scn05-node-a.png')
  await clickHotspot(page, 'HS-G01-0022')
  await clickHotspot(page, 'RUNTIME-HS-G01-05-BYPASS-TOOL-SLOT')
  await capture(page, info, '15-scn05-bypass-inventory.png')
  await useItem(page, 'ITM-G01-001', 'HS-G01-0023')
  await expect(page.locator(`[data-inventory-item="ITM-G01-001"]`)).toBeVisible()
  await capture(page, info, '16-scn05-wrong-use-nonconsume.png')
  await useItem(page, 'ITM-G01-012', 'HS-G01-0023')
  await expect(page.locator('.game-shell')).toHaveClass(/state-S4/)
  await capture(page, info, '17-scn05-window-open.png')
  await page.locator('[data-action="trigger-pr-b-soft-fail"]').click()
  await capture(page, info, '18-scn05-window-failure-safe-node.png')
  await page.reload()
  await expect(page.locator('[data-safe-recovery-node="SCN-G01-05:route-safe-node"]')).toBeVisible()
  await capture(page, info, '19-scn05-safe-node-refresh.png')
  await page.getByRole('button', { name: '保留进度继续' }).click()
  await clickHotspot(page, 'HS-G01-0024')
  await clickHotspot(page, 'RUNTIME-HS-G01-05-LANDING-CONFIRM')
  await expect(page.locator('.game-shell')).toHaveClass(/state-S6/)
  await capture(page, info, '20-scn05-complete-boundary.png')
  await page.reload()
  await expect(page.locator('[data-next-boundary="scn-g01-06"]')).toBeVisible()
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('starwreck:save:G01:v1')!))
  expect(saved.flags).toMatchObject({ world_star_core_count: 0, g01_chapter_complete: false, g01_handoff_to_g02: false })
  for (const key of ['ability_qima_search', 'ability_analysis', 'ability_pathfinding', 'ability_teleport', 'ability_shrink', 'ability_clone']) expect(saved.flags[key]).toBe(false)
  expect(errors).toEqual([])
})
