import { expect, test } from '@playwright/test'

const APP_URL = 'http://127.0.0.1:4174/starwreck-math-game/'
const saveKey = 'starwreck:save:G01:v1'

test('G02 runtime art is precached and its saved scene survives offline refresh', async ({
  context,
  page,
}) => {
  await page.addInitScript(
    ({ key }) => {
      localStorage.setItem(
        key,
        JSON.stringify({
          schemaVersion: 2,
          chapterId: 'G01',
          currentSceneId: 'SCN-G02-00',
          sceneState: 'S0',
          sceneStates: { 'SCN-G01-07': 'S6', 'G02-BOUNDARY': 'S1', 'SCN-G02-00': 'S0' },
          activeRuntimeNodeId: null,
          safeRecovery: null,
          foundItemIds: [],
          inventoryItemIds: [],
          usedItemIds: [],
          completedHotspotIds: ['RUNTIME-HS-G02-HANDOFF'],
          completedPuzzleIds: [],
          hosProgress: {},
          puzzleProgress: {},
          hintCount: 0,
          hintLevels: {},
          flags: {
            g01_scn07_complete: true,
            g01_landing_scanned: true,
            g01_chapter_complete: true,
            g01_handoff_to_g02: true,
            g01_scn06_search_authorized: true,
            g01_scn06_analysis_authorized: true,
            g01_scn06_pathfinding_authorized: true,
            ability_qima_search: true,
            ability_analysis: true,
            ability_pathfinding: true,
            ability_teleport: false,
            ability_shrink: false,
            ability_clone: false,
            world_star_core_count: 0,
            g02_intro_scan_done: false,
            g02_almao_rescued: false,
            g02_resource_labels: 0,
            g02_archive_restored: false,
          },
          dialogue: { currentDialogueId: null, active: false, readDialogueIds: [] },
          dialogueHistory: [],
          characterStates: { 'CHAR-XINGYU': 'determined', 'CHAR-QIMA': 'normal' },
          unlockedCharacterIds: ['CHAR-XINGYU', 'CHAR-QIMA'],
          characterDiscoveries: {},
          transitionLog: [],
          updatedAt: new Date().toISOString(),
        }),
      )
    },
    { key: saveKey },
  )

  await page.goto(APP_URL, { waitUntil: 'networkidle' })
  await expect(page.locator('[data-scene-id="SCN-G02-00"]')).toBeVisible()
  await page.evaluate(async () => navigator.serviceWorker.ready)
  await page.reload({ waitUntil: 'networkidle' })
  await expect
    .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
    .toBe(true)

  const cached = await page.evaluate(async () => {
    const keys = await caches.keys()
    const requests = (
      await Promise.all(
        keys.map(async (key) => {
          const cache = await caches.open(key)
          return cache.keys()
        }),
      )
    ).flat()
    return requests.map((request) => request.url)
  })
  expect(
    cached.some((url) =>
      url.includes(
        '/starwreck-math-game/assets/g02/slice-01/scn00/SCENE-G02-001_old-screen-valley-pulse.webp',
      ),
    ),
  ).toBe(true)

  await context.setOffline(true)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-scene-id="SCN-G02-00"]')).toBeVisible()
  const background = await page.locator('.scene-art').evaluate(
    (element) => getComputedStyle(element).backgroundImage,
  )
  expect(background).toContain('/assets/g02/slice-01/scn00/')
  await context.setOffline(false)
})
