import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, test, type Page, type TestInfo } from '@playwright/test'

test.use({ trace: 'on', video: 'on' })
test.setTimeout(240_000)

const saveKey = 'starwreck:save:G01:v1'
const sceneRoute = [
  'SCN-G01-00', 'SCN-G01-01', 'SCN-G01-02', 'SCN-G01-03', 'SCN-G01-04', 'SCN-G01-05',
  'SCN-G01-06', 'SCN-G01-07', 'SCN-G02-00', 'SCN-G02-01', 'SCN-G02-02',
]

const mechanics = [
  { sceneId: 'SCN-G01-00', state: 'S4', hotspot: 'HS-G01-0005', id: 'RUNTIME-PUZ-G01-ROTATING-CIRCUIT', type: 'rotating-circuit', targets: { 'input-junction': 1, 'relay-junction': 2, 'output-junction': 3 } },
  { sceneId: 'SCN-G01-01', state: 'S5', hotspot: 'RUNTIME-HS-G01-01-BOOT-SEQUENCE', id: 'PUZ-G01-QIMA-BOOT', type: 'signal-memory', sequence: ['amber', 'cyan', 'white', 'violet'], tokens: ['cyan', 'amber', 'violet', 'white'] },
  { sceneId: 'SCN-G01-02', state: 'S3', hotspot: 'RUNTIME-HS-G01-02-TASK-PUZZLE', id: 'RUNTIME-PUZ-G01-TASK-DEPENDENCY', type: 'task-order', sequence: ['pressure', 'patch', 'repress'], tokens: ['repress', 'pressure', 'patch'] },
  { sceneId: 'SCN-G01-03', state: 'S3', hotspot: 'RUNTIME-HS-G01-03-GAUGE-PUZZLE', id: 'RUNTIME-PUZ-G01-PRESSURE-CALIBRATION', type: 'airflow-maze', sequence: ['inlet', 'lower-valve', 'upper-valve', 'gauge'], tokens: ['inlet', 'upper-valve', 'ice-pocket', 'lower-valve', 'gauge'] },
  { sceneId: 'SCN-G01-04', state: 'S3', hotspot: 'HS-G01-0018', id: 'TUT-MECH-002', type: 'star-map-snap', sequence: ['fragment-a', 'fragment-b', 'fragment-c'], tokens: ['fragment-c', 'fragment-a', 'fragment-b'] },
  { sceneId: 'SCN-G01-05', state: 'S4', hotspot: 'HS-G01-0024', id: 'RUNTIME-PUZ-G01-GARBAGE-ROUTE', type: 'garbage-route', sequence: ['node-a', 'node-b', 'bypass-window', 'safe-landing'], tokens: ['node-a', 'wreck-field', 'node-b', 'bypass-window', 'safe-landing'] },
  { sceneId: 'SCN-G01-06', state: 'S2', hotspot: 'RUNTIME-HS-G01-06-SIGNAL-ALIGNMENT', id: 'RUNTIME-PUZ-G01-SIGNAL-ALIGNMENT', type: 'waveform-tuning', targets: { frequency: 62, phase: 38, gain: 74 } },
  { sceneId: 'SCN-G01-07', state: 'S3', hotspot: 'RUNTIME-HS-G01-07-IMPACT-DAMPING', id: 'RUNTIME-PUZ-G01-IMPACT-DAMPING', type: 'attitude-balance', targets: { pitch: 50, roll: 50 } },
  { sceneId: 'SCN-G02-00', state: 'S2', hotspot: 'RUNTIME-HS-G02-00-PULSE-ZOOM', id: 'RUNTIME-PUZ-G02-PULSE-SCAN', type: 'pattern-decode', sequence: ['triple', 'double', 'triple'], tokens: ['double', 'triple', 'single', 'echo'] },
  { sceneId: 'SCN-G02-01', state: 'S2', hotspot: 'RUNTIME-HS-G02-01-RESCUE-CONFIRM', id: 'RUNTIME-PUZ-G02-CRANE-COUNTERWEIGHT', type: 'crane-counterweight', sequence: ['weight-2-left', 'weight-1-right', 'weight-3-left'], tokens: ['weight-2-left', 'weight-1-right', 'weight-3-left'] },
  { sceneId: 'SCN-G02-02', state: 'S5', hotspot: 'RUNTIME-HS-G02-02-ARCHIVE', id: 'RUNTIME-PUZ-G02-BORROW-RETURN', type: 'borrow-use-return', sequence: ['borrow-heater', 'use-heater', 'return-heater', 'borrow-screen', 'use-screen', 'return-screen'], tokens: ['borrow-heater', 'use-heater', 'return-heater', 'borrow-screen', 'use-screen', 'return-screen'] },
] as const

const sessionFor = (sceneId: string, sceneState: string) => {
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
      g02_screen_a_restored: sceneId === 'SCN-G02-02', g02_screen_b_restored: sceneId === 'SCN-G02-02', g02_screen_c_restored: sceneId === 'SCN-G02-02',
    },
    dialogue: { currentDialogueId: null, active: false, readDialogueIds: [] }, dialogueHistory: [],
    characterStates: { 'CHAR-XINGYU': 'determined', 'CHAR-QIMA': 'normal', 'CHAR-ALMAO': 'relieved', 'CHAR-ZHENG': 'warning' },
    unlockedCharacterIds: ['CHAR-XINGYU', 'CHAR-QIMA', 'CHAR-ALMAO', 'CHAR-ZHENG'], characterDiscoveries: {}, transitionLog: [], updatedAt: new Date().toISOString(),
  }
}

const meta = () => ({ version: 1, introSeen: true, g02RecapSeen: true,
  seenCharacterCards: ['CHAR-XINGYU', 'CHAR-QIMA', 'CHAR-ALMAO', 'CHAR-ZHENG'], seenItemCards: [],
  settings: { fontSize: 'standard', dialogueSpeed: 'quick', reducedMotion: true }, updatedAt: new Date().toISOString() })

const seed = async (page: Page, session: ReturnType<typeof sessionFor>, seenCharacters?: string[]) => {
  const ui = meta()
  if (seenCharacters) ui.seenCharacterCards = seenCharacters
  await page.goto('/')
  await page.evaluate(({ key, value, ui }) => {
    localStorage.setItem(key, JSON.stringify(value))
    localStorage.setItem('starwreck:ui-meta:v1', JSON.stringify(ui))
    sessionStorage.removeItem('starwreck:trial:runtime-active')
  }, { key: saveKey, value: session, ui })
  await page.reload()
  await page.locator('[data-trial-action="continue"]').click()
}

const capture = async (page: Page, info: TestInfo, name: string) => {
  const output = join(process.cwd(), 'test-results', 'trial-corrective', info.project.name)
  await mkdir(output, { recursive: true })
  await page.screenshot({ path: join(output, name), fullPage: true, animations: 'disabled' })
}

test('all eleven levels expose distinct real controls and four persistent states', async ({ page }, info) => {
  const errors: string[] = []
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('pageerror', (error) => errors.push(error.message))
  for (const [index, mechanic] of mechanics.entries()) {
    await seed(page, sessionFor(mechanic.sceneId, mechanic.state))
    await page.locator(`[data-hotspot-id="${mechanic.hotspot}"]`).click()
    const panel = page.locator(`[data-trial-mechanic="${mechanic.type}"]`)
    await expect(panel).toHaveAttribute('data-mechanic-status', 'initial')
    await capture(page, info, `${String(index + 1).padStart(2, '0')}-${mechanic.type}-initial.png`)

    if ('sequence' in mechanic) {
      const wrong = mechanic.tokens.find((token) => token !== mechanic.sequence[0])!
      await panel.locator(`[data-mechanic-target="${wrong}"]`).click()
    } else {
      await panel.locator('[data-action="mechanic-submit"]').click()
    }
    await expect(panel).toHaveAttribute('data-mechanic-status', 'error')
    await capture(page, info, `${String(index + 1).padStart(2, '0')}-${mechanic.type}-error.png`)

    if ('sequence' in mechanic) {
      await panel.locator(`[data-mechanic-target="${mechanic.sequence[0]}"]`).click()
    } else if (mechanic.type === 'rotating-circuit') {
      await panel.locator('[data-mechanic-target="input-junction"]').click()
    } else {
      const [target, value] = Object.entries(mechanic.targets)[0]
      await panel.locator(`[data-mechanic-range="${target}"]`).fill(String(value))
    }
    await expect(panel).toHaveAttribute('data-mechanic-status', 'partial')
    await capture(page, info, `${String(index + 1).padStart(2, '0')}-${mechanic.type}-partial.png`)

    if ('sequence' in mechanic) {
      for (const token of mechanic.sequence.slice(1)) await panel.locator(`[data-mechanic-target="${token}"]`).click()
    } else if (mechanic.type === 'rotating-circuit') {
      for (const [target, clicks] of Object.entries(mechanic.targets)) {
        const already = target === 'input-junction' ? 1 : 0
        for (let click = already; click < clicks; click += 1) await panel.locator(`[data-mechanic-target="${target}"]`).click()
      }
    } else {
      for (const [target, value] of Object.entries(mechanic.targets).slice(1)) {
        await panel.locator(`[data-mechanic-range="${target}"]`).fill(String(value))
      }
    }
    await expect(panel).toHaveAttribute('data-mechanic-status', 'complete')
    await capture(page, info, `${String(index + 1).padStart(2, '0')}-${mechanic.type}-complete.png`)
    const persisted = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}'), saveKey)
    expect(persisted.mechanicProgress[mechanic.id].status).toBe('complete')
    expect(persisted.flags.world_star_core_count).toBe(0)
  }
  expect(errors).toEqual([])
})

test('Qima is revealed by repair, boot, self-introduction and mission dialogue before the card', async ({ page }, info) => {
  const session = sessionFor('SCN-G01-01', 'S5')
  session.flags.g01_qima_online = false
  session.flags.qima_identity_revealed = false
  session.unlockedCharacterIds = ['CHAR-XINGYU']
  session.characterStates['CHAR-QIMA'] = 'booting'
  await seed(page, session, ['CHAR-XINGYU'])
  await expect(page.locator('[data-character-card-id="CHAR-QIMA"]')).toHaveCount(0)
  await page.locator('[data-hotspot-id="RUNTIME-HS-G01-01-BOOT-SEQUENCE"]').click()
  for (const token of ['amber', 'cyan', 'white', 'violet']) await page.locator(`[data-mechanic-target="${token}"]`).click()
  await expect(page.locator('[data-mechanic-status="complete"]')).toBeVisible()
  await capture(page, info, 'qima-boot-complete-before-reveal.png')
  await page.getByRole('button', { name: '关闭启动信号记忆' }).click()
  await expect(page.locator('[data-dialogue-id="DLG-G01-0004"]')).toBeVisible()
  for (const id of ['DLG-G01-0004', 'DLG-G01-0005', 'DLG-G01-0006']) {
    await expect(page.locator(`[data-dialogue-id="${id}"]`)).toBeVisible()
    await expect(page.locator('[data-character-card-id="CHAR-QIMA"]')).toHaveCount(0)
    await page.getByRole('button', { name: '下一句' }).click()
  }
  await expect(page.locator('[data-dialogue-id="DLG-G01-0025"]')).toContainText('EDU-0077')
  await capture(page, info, 'qima-self-introduction.png')
  for (const id of ['DLG-G01-0025', 'DLG-G01-0026', 'DLG-G01-0027']) {
    await expect(page.locator(`[data-dialogue-id="${id}"]`)).toBeVisible()
    await page.getByRole('button', { name: '下一句' }).click()
  }
  await expect(page.locator('[data-dialogue-id="DLG-G01-0028"]')).toContainText('当前任务')
  await page.getByRole('button', { name: '继续探索' }).click()
  await expect(page.locator('[data-character-card-id="CHAR-QIMA"]')).toBeVisible()
  await expect(page.locator('.task-strip')).toContainText('前往中控台，找回船上第一张维修任务单')
  await capture(page, info, 'qima-card-after-story-reveal.png')
})

test('scene map revisits unlocked scenes without regressing the current task', async ({ page }, info) => {
  const session = sessionFor('SCN-G01-03', 'S3')
  session.foundItemIds = ['ITM-G01-001', 'ITM-G01-002', 'ITM-G01-007']
  session.inventoryItemIds = ['ITM-G01-007']
  session.usedItemIds = ['ITM-G01-001', 'ITM-G01-002']
  await seed(page, session)
  await page.getByRole('button', { name: '场景地图' }).click()
  await expect(page.locator('.scene-map-route .is-locked')).toHaveCount(7)
  await capture(page, info, 'scene-map-unlocked-boundary.png')
  await page.locator('[data-action="visit-scene"][data-scene-id="SCN-G01-00"]').click()
  await expect(page.locator('[data-scene-id="SCN-G01-00"]')).toBeVisible()
  await expect(page.locator('.task-strip')).toHaveAttribute('data-task-scene', 'SCN-G01-03')
  await expect(page.getByRole('button', { name: '返回当前任务' })).toBeVisible()
  await capture(page, info, 'scene-revisit-keeps-mainline.png')
  const afterVisit = await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}'), saveKey)
  expect(afterVisit.foundItemIds).toEqual(session.foundItemIds)
  expect(afterVisit.mainlineSceneId).toBe('SCN-G01-03')
  await page.reload()
  await expect(page.locator('[data-scene-id="SCN-G01-00"]')).toBeVisible()
  await page.getByRole('button', { name: '返回当前任务' }).click()
  await expect(page.locator('[data-scene-id="SCN-G01-03"]')).toBeVisible()
  await expect(page.locator('.task-strip')).toContainText('气流迷宫')
})

test('light shell covers menus, task UI, cards and modals without horizontal overflow', async ({ page }, info) => {
  await page.goto('/')
  const titleColors = await page.locator('[data-trial-view="title"]').evaluate((element) => {
    const style = getComputedStyle(element)
    return { background: style.backgroundColor, color: style.color }
  })
  expect(titleColors.background).toBe('rgb(243, 245, 247)')
  await capture(page, info, 'light-title-shell.png')
  await seed(page, sessionFor('SCN-G01-04', 'S3'))
  await page.getByRole('button', { name: '任务记录' }).click()
  await expect(page.locator('.journal-modal')).toHaveCSS('background-color', 'rgba(255, 255, 255, 0.98)')
  await capture(page, info, 'light-task-log.png')
  await page.getByRole('button', { name: '关闭任务与证据' }).click()
  await page.getByRole('button', { name: '场景地图' }).click()
  await capture(page, info, 'light-scene-map.png')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
