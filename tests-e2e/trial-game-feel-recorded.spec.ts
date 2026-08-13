import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, test } from '@playwright/test'
import { solveTrialMechanic } from './helpers/trial-mechanics'

test.use({ trace: 'on', video: 'on' })
test.setTimeout(90_000)

test('records real crane counterweight dragging and the resulting rescue world state', async ({ page }, info) => {
  const sceneRoute = [
    'SCN-G01-00', 'SCN-G01-01', 'SCN-G01-02', 'SCN-G01-03', 'SCN-G01-04', 'SCN-G01-05',
    'SCN-G01-06', 'SCN-G01-07', 'SCN-G02-00', 'SCN-G02-01',
  ]
  const sceneStates = Object.fromEntries(sceneRoute.map((sceneId) => [sceneId, sceneId === 'SCN-G02-01' ? 'S2' : 'S6']))
  const session = {
    schemaVersion: 2, chapterId: 'G01', currentSceneId: 'SCN-G02-01', mainlineSceneId: 'SCN-G02-01',
    unlockedSceneIds: sceneRoute, completedSceneIds: sceneRoute.slice(0, -1), sceneState: 'S2', sceneStates,
    activeRuntimeNodeId: null, safeRecovery: null, foundItemIds: [], inventoryItemIds: [], usedItemIds: [],
    completedHotspotIds: [], completedPuzzleIds: [], hosProgress: {}, puzzleProgress: {}, mechanicProgress: {},
    hintCount: 0, hintLevels: {},
    flags: {
      g01_chapter_complete: true, g01_handoff_to_g02: true, g01_qima_online: true, qima_identity_revealed: true,
      almao_identity_revealed: true, zheng_identity_revealed: true, g01_scn06_search_authorized: true,
      g01_scn06_analysis_authorized: true, g01_scn06_pathfinding_authorized: true, g01_scn06_complete: true,
      g01_scn07_complete: true, g01_landing_scanned: true, world_star_core_count: 0,
      ability_qima_search: true, ability_analysis: true, ability_pathfinding: true,
      ability_teleport: false, ability_shrink: false, ability_clone: false,
      g02_intro_scan_done: true, g02_almao_rescued: false, g02_resource_labels: 0, g02_archive_restored: false,
      g02_grapnel_installed: true,
    },
    dialogue: { currentDialogueId: null, active: false, readDialogueIds: [] }, dialogueHistory: [],
    characterStates: { 'CHAR-XINGYU': 'determined', 'CHAR-QIMA': 'normal', 'CHAR-ALMAO': 'relieved', 'CHAR-ZHENG': 'warning' },
    unlockedCharacterIds: ['CHAR-XINGYU', 'CHAR-QIMA', 'CHAR-ALMAO', 'CHAR-ZHENG'], characterDiscoveries: {},
    transitionLog: [], updatedAt: new Date().toISOString(),
  }

  await page.goto('/')
  await page.evaluate((value) => {
    localStorage.setItem('starwreck:save:G01:v1', JSON.stringify(value))
    localStorage.setItem('starwreck:ui-meta:v1', JSON.stringify({
      version: 1, introSeen: true, g02RecapSeen: true,
      seenCharacterCards: ['CHAR-XINGYU', 'CHAR-QIMA', 'CHAR-ALMAO', 'CHAR-ZHENG'], seenItemCards: [],
      settings: { fontSize: 'standard', dialogueSpeed: 'quick', reducedMotion: false }, updatedAt: new Date().toISOString(),
    }))
    sessionStorage.removeItem('starwreck:trial:runtime-active')
  }, session)
  await page.reload()
  await page.locator('[data-trial-action="continue"]').click()

  const stage = page.locator('[data-game-stage="SCN-G02-01"]')
  await stage.locator('.stage-device-entry').click()
  const panel = stage.locator('[data-trial-mechanic="crane-counterweight"]')
  for (let attempt = 0; attempt < 2 && await panel.getAttribute('data-mechanic-status') === 'initial'; attempt += 1) {
    await panel.locator('[data-mechanic-draggable][data-mechanic-target="weight-1"]').dragTo(
      panel.locator('[data-mechanic-dropzone="right-far"]'),
    )
  }
  await expect(panel).toHaveAttribute('data-mechanic-status', 'partial')
  await solveTrialMechanic(page, 'crane-counterweight', { close: false })
  await expect(stage).toHaveAttribute('data-camera-mode', 'success')
  await expect(stage).toHaveAttribute('data-world-visual-state', 'complete')
  await expect(stage).toHaveAttribute('data-camera-mode', 'scene', { timeout: 6_000 })
  await expect(stage.locator('[data-device-surface="true"]')).toHaveCount(0)

  const directory = join(process.cwd(), 'test-results', 'trial-game-feel', info.project.name)
  await mkdir(directory, { recursive: true })
  await page.screenshot({ path: join(directory, 'recorded-crane-rescue-world-change.png'), fullPage: true, animations: 'disabled' })
})
