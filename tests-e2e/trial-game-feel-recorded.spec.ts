import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, test, type Page, type TestInfo } from '@playwright/test'
import { dragMechanicToken } from './helpers/reliable-drag'
import { solveTrialMechanic, type TrialMechanicType } from './helpers/trial-mechanics'

test.use({ trace: 'on', video: 'on' })
test.setTimeout(90_000)

const saveKey = 'starwreck:save:G01:v1'
const sceneRoute = [
  'SCN-G01-00', 'SCN-G01-01', 'SCN-G01-02', 'SCN-G01-03', 'SCN-G01-04', 'SCN-G01-05',
  'SCN-G01-06', 'SCN-G01-07', 'SCN-G02-00', 'SCN-G02-01',
] as const

type RecordedMechanic = {
  sceneId: typeof sceneRoute[number]
  state: string
  type: TrialMechanicType
  slug: string
}

const recordedMechanics: readonly RecordedMechanic[] = [
  { sceneId: 'SCN-G01-00', state: 'S4', type: 'rotating-circuit', slug: 'circuit-distribution-box' },
  { sceneId: 'SCN-G01-04', state: 'S3', type: 'star-map-snap', slug: 'star-map-table' },
  { sceneId: 'SCN-G02-01', state: 'S2', type: 'crane-counterweight', slug: 'crane-rescue' },
]

const sessionFor = (entry: RecordedMechanic) => {
  const index = sceneRoute.indexOf(entry.sceneId)
  const sceneStates = Object.fromEntries(sceneRoute.slice(0, index).map((sceneId) => [sceneId, 'S6']))
  sceneStates[entry.sceneId] = entry.state
  return {
    schemaVersion: 2, chapterId: 'G01', currentSceneId: entry.sceneId, mainlineSceneId: entry.sceneId,
    unlockedSceneIds: sceneRoute.slice(0, index + 1), completedSceneIds: sceneRoute.slice(0, index),
    sceneState: entry.state, sceneStates, activeRuntimeNodeId: null, safeRecovery: null,
    foundItemIds: [], inventoryItemIds: [], usedItemIds: [], completedHotspotIds: [], completedPuzzleIds: [],
    hosProgress: {}, puzzleProgress: {}, mechanicProgress: {}, hintCount: 0, hintLevels: {},
    flags: {
      g01_chapter_complete: index >= 8, g01_handoff_to_g02: index >= 8, g01_qima_online: true,
      qima_identity_revealed: true, almao_identity_revealed: index >= 9, zheng_identity_revealed: index >= 9,
      g01_scn06_search_authorized: true, g01_scn06_analysis_authorized: true,
      g01_scn06_pathfinding_authorized: true, g01_scn06_complete: index >= 7,
      g01_scn07_complete: index >= 8, g01_landing_scanned: index >= 8, world_star_core_count: 0,
      ability_qima_search: true, ability_analysis: true, ability_pathfinding: true,
      ability_teleport: false, ability_shrink: false, ability_clone: false,
      g02_intro_scan_done: index >= 9, g02_almao_rescued: false, g02_resource_labels: 0,
      g02_archive_restored: false, g02_grapnel_installed: entry.sceneId === 'SCN-G02-01',
    },
    dialogue: { currentDialogueId: null, active: false, readDialogueIds: [] }, dialogueHistory: [],
    characterStates: { 'CHAR-XINGYU': 'determined', 'CHAR-QIMA': 'normal', 'CHAR-ALMAO': 'relieved', 'CHAR-ZHENG': 'warning' },
    unlockedCharacterIds: ['CHAR-XINGYU', 'CHAR-QIMA', 'CHAR-ALMAO', 'CHAR-ZHENG'], characterDiscoveries: {},
    transitionLog: [], updatedAt: new Date().toISOString(),
  }
}

const seed = async (page: Page, entry: RecordedMechanic) => {
  await page.goto('/')
  await page.evaluate(({ key, session }) => {
    localStorage.setItem(key, JSON.stringify(session))
    localStorage.setItem('starwreck:ui-meta:v1', JSON.stringify({
      version: 1, introSeen: true, g02RecapSeen: true,
      seenCharacterCards: ['CHAR-XINGYU', 'CHAR-QIMA', 'CHAR-ALMAO', 'CHAR-ZHENG'], seenItemCards: [],
      settings: { fontSize: 'standard', dialogueSpeed: 'quick', reducedMotion: false }, updatedAt: new Date().toISOString(),
    }))
    sessionStorage.removeItem('starwreck:trial:runtime-active')
  }, { key: saveKey, session: sessionFor(entry) })
  await page.reload()
  await page.locator('[data-trial-action="continue"]').click()
}

const capture = async (page: Page, info: TestInfo, name: string) => {
  const directory = join(process.cwd(), 'test-results', 'trial-game-feel-recorded', info.project.name)
  await mkdir(directory, { recursive: true })
  await page.screenshot({ path: join(directory, name), fullPage: true, animations: 'disabled' })
}

for (const entry of recordedMechanics) {
  test(`records ${entry.type} as direct in-world mouse operation`, async ({ page }, info) => {
    const errors: string[] = []
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
    page.on('pageerror', (error) => errors.push(error.message))
    await seed(page, entry)

    const stage = page.locator(`[data-game-stage="${entry.sceneId}"]`)
    await capture(page, info, `${entry.slug}-scene-before.png`)
    await stage.locator('.stage-device-entry').click()
    const surface = stage.locator(`[data-trial-mechanic="${entry.type}"]`)
    await expect(surface).toHaveAttribute('data-in-world-mechanic', 'true')
    await expect(stage.locator('.trial-mechanic-panel')).toHaveCount(0)
    await expect(page.locator('.topbar')).toHaveCount(0)
    await expect(surface).not.toHaveCSS('background-color', 'rgb(255, 255, 255)')
    await capture(page, info, `${entry.slug}-object-focus.png`)

    if (entry.type === 'rotating-circuit') {
      await surface.locator('[data-mechanic-target="input-junction"]').click()
      await capture(page, info, `${entry.slug}-interaction-in-world.png`)
    } else if (entry.type === 'star-map-snap') {
      await surface.locator('[data-action="mechanic-rotate"][data-mechanic-target="fragment-a"]').click()
      await dragMechanicToken(page, surface, 'fragment-a', 'star-slot-a')
      await capture(page, info, `${entry.slug}-interaction-in-world.png`)
    } else {
      await dragMechanicToken(page, surface, 'weight-1', 'right-far')
      await capture(page, info, `${entry.slug}-interaction-in-world.png`)
    }

    await solveTrialMechanic(page, entry.type, { close: false })
    await expect(stage).toHaveAttribute('data-camera-mode', 'success')
    await expect(stage).toHaveAttribute('data-world-visual-state', 'complete')
    await expect(stage).toHaveAttribute('data-camera-mode', 'scene', { timeout: 6_000 })
    await capture(page, info, `${entry.slug}-world-after.png`)
    expect(errors).toEqual([])
  })
}
