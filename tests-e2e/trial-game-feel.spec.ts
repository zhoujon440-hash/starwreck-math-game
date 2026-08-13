import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test'
import { dragMechanicToken, dragWithMouse } from './helpers/reliable-drag'
import { solveTrialMechanic, type TrialMechanicType } from './helpers/trial-mechanics'

test.use({ trace: 'retain-on-failure', video: 'off' })
test.setTimeout(90_000)

const saveKey = 'starwreck:save:G01:v1'
const sceneRoute = [
  'SCN-G01-00', 'SCN-G01-01', 'SCN-G01-02', 'SCN-G01-03', 'SCN-G01-04', 'SCN-G01-05',
  'SCN-G01-06', 'SCN-G01-07', 'SCN-G02-00', 'SCN-G02-01', 'SCN-G02-02',
] as const

const mechanics = [
  { sceneId: 'SCN-G01-00', state: 'S4', id: 'RUNTIME-PUZ-G01-ROTATING-CIRCUIT', type: 'rotating-circuit' },
  { sceneId: 'SCN-G01-01', state: 'S5', id: 'PUZ-G01-QIMA-BOOT', type: 'signal-memory' },
  { sceneId: 'SCN-G01-02', state: 'S3', id: 'RUNTIME-PUZ-G01-TASK-DEPENDENCY', type: 'task-order' },
  { sceneId: 'SCN-G01-03', state: 'S3', id: 'RUNTIME-PUZ-G01-PRESSURE-CALIBRATION', type: 'airflow-maze' },
  { sceneId: 'SCN-G01-04', state: 'S3', id: 'TUT-MECH-002', type: 'star-map-snap' },
  { sceneId: 'SCN-G01-05', state: 'S4', id: 'RUNTIME-PUZ-G01-GARBAGE-ROUTE', type: 'garbage-route' },
  { sceneId: 'SCN-G01-06', state: 'S2', id: 'RUNTIME-PUZ-G01-SIGNAL-ALIGNMENT', type: 'waveform-tuning' },
  { sceneId: 'SCN-G01-07', state: 'S3', id: 'RUNTIME-PUZ-G01-IMPACT-DAMPING', type: 'attitude-balance' },
  { sceneId: 'SCN-G02-00', state: 'S2', id: 'RUNTIME-PUZ-G02-PULSE-SCAN', type: 'pattern-decode' },
  { sceneId: 'SCN-G02-01', state: 'S2', id: 'RUNTIME-PUZ-G02-CRANE-COUNTERWEIGHT', type: 'crane-counterweight' },
  { sceneId: 'SCN-G02-02', state: 'S5', id: 'RUNTIME-PUZ-G02-BORROW-RETURN', type: 'borrow-use-return' },
] as const satisfies readonly { sceneId: typeof sceneRoute[number]; state: string; id: string; type: TrialMechanicType }[]

const sessionFor = (sceneId: typeof sceneRoute[number], sceneState: string) => {
  const index = sceneRoute.indexOf(sceneId)
  const sceneStates = Object.fromEntries(sceneRoute.slice(0, index).map((id) => [id, 'S6']))
  sceneStates[sceneId] = sceneState
  return {
    schemaVersion: 2, chapterId: 'G01', currentSceneId: sceneId, mainlineSceneId: sceneId,
    unlockedSceneIds: sceneRoute.slice(0, index + 1), completedSceneIds: sceneRoute.slice(0, index),
    sceneState, sceneStates, activeRuntimeNodeId: null, safeRecovery: null,
    foundItemIds: [], inventoryItemIds: [], usedItemIds: [], completedHotspotIds: [], completedPuzzleIds: [],
    hosProgress: {}, puzzleProgress: {}, mechanicProgress: {}, hintCount: 0, hintLevels: {},
    flags: {
      g01_chapter_complete: index >= 8, g01_handoff_to_g02: index >= 8, g01_qima_online: true,
      qima_identity_revealed: true, almao_identity_revealed: index >= 9, zheng_identity_revealed: index >= 9,
      g01_scn05_bypass_installed: sceneId === 'SCN-G01-05', g01_scn05_window_open: sceneId === 'SCN-G01-05',
      g01_scn05_window_deadline_at: new Date(Date.now() + 120_000).toISOString(),
      g01_scn06_search_authorized: true, g01_scn06_analysis_authorized: true, g01_scn06_pathfinding_authorized: true,
      g01_scn06_complete: index >= 7, g01_scn07_complete: index >= 8, g01_landing_scanned: index >= 8,
      world_star_core_count: 0, ability_qima_search: true, ability_analysis: true, ability_pathfinding: true,
      ability_teleport: false, ability_shrink: false, ability_clone: false,
      g02_intro_scan_done: index >= 9, g02_almao_rescued: index >= 10,
      g02_resource_labels: index >= 10 ? 3 : 0, g02_archive_restored: false,
      g02_grapnel_installed: sceneId === 'SCN-G02-01',
      g02_screen_a_restored: sceneId === 'SCN-G02-02', g02_screen_b_restored: sceneId === 'SCN-G02-02',
      g02_screen_c_restored: sceneId === 'SCN-G02-02',
    },
    dialogue: { currentDialogueId: null, active: false, readDialogueIds: [] }, dialogueHistory: [],
    characterStates: { 'CHAR-XINGYU': 'determined', 'CHAR-QIMA': 'normal', 'CHAR-ALMAO': 'relieved', 'CHAR-ZHENG': 'warning' },
    unlockedCharacterIds: ['CHAR-XINGYU', 'CHAR-QIMA', 'CHAR-ALMAO', 'CHAR-ZHENG'], characterDiscoveries: {},
    transitionLog: [], updatedAt: new Date().toISOString(),
  }
}

const seed = async (page: Page, session: ReturnType<typeof sessionFor>, reducedMotion = false) => {
  await page.goto('/')
  await page.evaluate(({ key, value, reduced }) => {
    localStorage.setItem(key, JSON.stringify(value))
    localStorage.setItem('starwreck:ui-meta:v1', JSON.stringify({
      version: 1, introSeen: true, g02RecapSeen: true,
      seenCharacterCards: ['CHAR-XINGYU', 'CHAR-QIMA', 'CHAR-ALMAO', 'CHAR-ZHENG'], seenItemCards: [],
      settings: { fontSize: 'standard', dialogueSpeed: 'quick', reducedMotion: reduced }, updatedAt: new Date().toISOString(),
    }))
    sessionStorage.removeItem('starwreck:trial:runtime-active')
  }, { key: saveKey, value: session, reduced: reducedMotion })
  await page.reload()
  await page.locator('[data-trial-action="continue"]').click()
}

const outputScreenshot = async (page: Page, info: TestInfo, name: string) => {
  const directory = join(process.cwd(), 'test-results', 'trial-game-feel', info.project.name)
  await mkdir(directory, { recursive: true })
  await page.screenshot({ path: join(directory, name), fullPage: true, animations: 'disabled' })
}

const makeOneRealMove = async (page: Page, panel: Locator, type: TrialMechanicType) => {
  if (type === 'rotating-circuit') await panel.locator('[data-mechanic-target="input-junction"]').click()
  else if (type === 'signal-memory') {
    await panel.locator('[data-action="mechanic-play"]').click()
    await panel.locator('[data-mechanic-target="amber"]').click()
  } else if (type === 'task-order') await dragMechanicToken(page, panel, 'pressure', 'timeline-1')
  else if (type === 'airflow-maze') await panel.locator('[data-mechanic-target="inlet"]').click()
  else if (type === 'star-map-snap') {
    await panel.locator('[data-action="mechanic-rotate"][data-mechanic-target="fragment-a"]').click()
    await dragMechanicToken(page, panel, 'fragment-a', 'star-slot-a')
  } else if (type === 'garbage-route') await panel.locator('[data-mechanic-target="node-a"]').click()
  else if (type === 'waveform-tuning') await panel.locator('[data-mechanic-range="frequency"]').fill('62')
  else if (type === 'attitude-balance') await panel.locator('[data-mechanic-range="pitch"]').fill('50')
  else if (type === 'pattern-decode') await panel.locator('[data-mechanic-range="pulse-1"]').fill('3')
  else if (type === 'crane-counterweight') await dragMechanicToken(page, panel, 'weight-1', 'right-far')
  else await dragMechanicToken(page, panel, 'borrow-heater', 'heater-borrow')
}

test('1366x768 and 1920x1080 are the explicit Game Feel acceptance resolutions', async ({ page }, info) => {
  expect(['1366x768', '1920x1080']).toContain(info.project.name)
  await seed(page, sessionFor('SCN-G01-00', 'S4'))
  await expect(page.locator('[data-game-stage="SCN-G01-00"]')).toBeVisible()
})

mechanics.forEach((mechanic, index) => {
  test(`${mechanic.sceneId} moves from scene to ${mechanic.type} device interaction and visible world change`, async ({ page }, info) => {
    const errors: string[] = []
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
    page.on('pageerror', (error) => errors.push(error.message))
    await seed(page, sessionFor(mechanic.sceneId, mechanic.state))
    const stage = page.locator(`[data-game-stage="${mechanic.sceneId}"]`)
    await expect(stage).toHaveAttribute('data-camera-mode', 'scene')
    await expect(stage).toHaveAttribute('data-world-visual-state', /initial|partial/)
    await expect(stage.locator('.legacy-objective-card')).toBeHidden()
    await outputScreenshot(page, info, `${String(index + 1).padStart(2, '0')}-${mechanic.type}-scene.png`)

    await stage.locator('.stage-device-entry').click()
    await expect(stage).toHaveAttribute('data-camera-mode', 'mechanic')
    const panel = stage.locator(`[data-trial-mechanic="${mechanic.type}"]`)
    await expect(panel).toHaveAttribute('data-device-surface', 'true')
    await expect(panel).not.toHaveAttribute('aria-modal', 'true')
    await makeOneRealMove(page, panel, mechanic.type)
    await expect(panel).toHaveAttribute('data-mechanic-status', 'partial')
    await outputScreenshot(page, info, `${String(index + 1).padStart(2, '0')}-${mechanic.type}-device.png`)

    await solveTrialMechanic(page, mechanic.type, { close: false })
    await expect(stage).toHaveAttribute('data-camera-mode', 'success')
    await expect(stage).toHaveAttribute('data-world-visual-state', 'complete')
    await expect(stage.locator('.stage-device')).toHaveAttribute('data-object-state', 'completed')
    await expect(stage).toHaveAttribute('data-camera-mode', 'scene', { timeout: 6_000 })
    await expect(stage.locator('[data-device-surface="true"]')).toHaveCount(0)
    await outputScreenshot(page, info, `${String(index + 1).padStart(2, '0')}-${mechanic.type}-world-change.png`)

    const persisted = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}'), saveKey)
    expect(persisted.mechanicProgress[mechanic.id].status).toBe('complete')
    expect(persisted.flags.world_star_core_count).toBe(0)
    expect(errors).toEqual([])
  })
})

test('reduced motion keeps every interaction state while making camera changes instant', async ({ page }, info) => {
  await seed(page, sessionFor('SCN-G01-04', 'S3'), true)
  const stage = page.locator('[data-game-stage="SCN-G01-04"]')
  await stage.locator('.stage-device-entry').click()
  await expect(stage).toHaveAttribute('data-camera-mode', 'mechanic')
  const duration = await stage.locator('.game-stage-world-plane').evaluate((node) => getComputedStyle(node).transitionDuration)
  expect(duration).toBe('0s')
  await outputScreenshot(page, info, 'reduced-motion-star-map-device.png')
})

test('a wrong inventory drop bounces back and a correct drop snaps without blocking the scene', async ({ page }, info) => {
  const session = sessionFor('SCN-G01-00', 'S3')
  session.foundItemIds = ['ITM-G01-002']
  session.inventoryItemIds = ['ITM-G01-002']
  await seed(page, session)
  const item = page.locator('[data-inventory-item="ITM-G01-002"]')
  const wrong = page.locator('[data-drop-target="HS-G01-0002"]')
  await dragWithMouse(page, item, wrong, {
    isComplete: async () => await page.locator('.game-shell').getAttribute('data-drop-feedback') === 'bounce',
  })
  await expect(page.locator('.game-shell')).toHaveAttribute('data-drop-feedback', 'bounce')
  await expect(item).toBeVisible()
  await outputScreenshot(page, info, 'inventory-wrong-drop-bounce.png')
  const correct = page.locator('[data-drop-target="HS-G01-0004"]')
  await dragWithMouse(page, item, correct, {
    isComplete: async () => await page.locator('[data-inventory-item="ITM-G01-002"]').count() === 0,
  })
  await expect(page.locator('.game-shell')).toHaveAttribute('data-drop-feedback', 'snap')
  await expect(item).toHaveCount(0)
  await outputScreenshot(page, info, 'inventory-correct-drop-snap.png')
})
