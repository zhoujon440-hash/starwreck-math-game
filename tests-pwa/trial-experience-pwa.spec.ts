import { expect, test } from '@playwright/test'

const APP_URL = 'http://127.0.0.1:4174/starwreck-math-game/'

test('trial title and legacy continue remain available after offline reload', async ({ context, page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('starwreck:save:G01:v1', JSON.stringify({
      schemaVersion: 2,
      chapterId: 'G01',
      currentSceneId: 'SCN-G01-00',
      sceneState: 'S0',
      sceneStates: { 'SCN-G01-00': 'S0' },
      activeRuntimeNodeId: null,
      safeRecovery: null,
      foundItemIds: [], inventoryItemIds: [], usedItemIds: [], completedHotspotIds: [], completedPuzzleIds: [],
      hosProgress: {}, puzzleProgress: {}, hintCount: 0, hintLevels: {},
      flags: { world_star_core_count: 0, g01_chapter_complete: false, g01_handoff_to_g02: false },
      dialogue: { currentDialogueId: null, active: false, readDialogueIds: [] },
      dialogueHistory: [],
      characterStates: { 'CHAR-XINGYU': 'normal', 'CHAR-QIMA': 'offline' },
      unlockedCharacterIds: ['CHAR-XINGYU', 'CHAR-QIMA'],
      characterDiscoveries: {}, transitionLog: [], updatedAt: new Date().toISOString(),
    }))
  })

  await page.goto(APP_URL, { waitUntil: 'networkidle' })
  await expect(page.locator('[data-trial-view="title"]')).toBeVisible()
  await page.evaluate(async () => navigator.serviceWorker.ready)
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true)

  await context.setOffline(true)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-trial-view="title"]')).toBeVisible()
  await expect(page.locator('[data-trial-action="continue"]')).toBeEnabled()
  await page.locator('[data-trial-action="continue"]').click()
  await expect(page.locator('[data-scene-id="SCN-G01-00"]')).toBeVisible()
  await context.setOffline(false)
})
