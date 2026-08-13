import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, test, type Page, type TestInfo } from '@playwright/test'
import { solveTrialMechanic, type TrialMechanicType } from './helpers/trial-mechanics'

test.use({ trace: 'retain-on-failure', video: 'off' })
test.setTimeout(240_000)

const saveKey = 'starwreck:save:G01:v1'
const sceneRoute = [
  'SCN-G01-00', 'SCN-G01-01', 'SCN-G01-02', 'SCN-G01-03', 'SCN-G01-04', 'SCN-G01-05',
  'SCN-G01-06', 'SCN-G01-07', 'SCN-G02-00', 'SCN-G02-01', 'SCN-G02-02',
]

const mechanics = [
  { sceneId: 'SCN-G01-00', state: 'S4', hotspot: 'HS-G01-0005', id: 'RUNTIME-PUZ-G01-ROTATING-CIRCUIT', type: 'rotating-circuit' },
  { sceneId: 'SCN-G01-01', state: 'S5', hotspot: 'RUNTIME-HS-G01-01-BOOT-SEQUENCE', id: 'PUZ-G01-QIMA-BOOT', type: 'signal-memory' },
  { sceneId: 'SCN-G01-02', state: 'S3', hotspot: 'RUNTIME-HS-G01-02-TASK-PUZZLE', id: 'RUNTIME-PUZ-G01-TASK-DEPENDENCY', type: 'task-order' },
  { sceneId: 'SCN-G01-03', state: 'S3', hotspot: 'RUNTIME-HS-G01-03-GAUGE-PUZZLE', id: 'RUNTIME-PUZ-G01-PRESSURE-CALIBRATION', type: 'airflow-maze' },
  { sceneId: 'SCN-G01-04', state: 'S3', hotspot: 'HS-G01-0018', id: 'TUT-MECH-002', type: 'star-map-snap' },
  { sceneId: 'SCN-G01-05', state: 'S4', hotspot: 'HS-G01-0024', id: 'RUNTIME-PUZ-G01-GARBAGE-ROUTE', type: 'garbage-route' },
  { sceneId: 'SCN-G01-06', state: 'S2', hotspot: 'RUNTIME-HS-G01-06-SIGNAL-ALIGNMENT', id: 'RUNTIME-PUZ-G01-SIGNAL-ALIGNMENT', type: 'waveform-tuning' },
  { sceneId: 'SCN-G01-07', state: 'S3', hotspot: 'RUNTIME-HS-G01-07-IMPACT-DAMPING', id: 'RUNTIME-PUZ-G01-IMPACT-DAMPING', type: 'attitude-balance' },
  { sceneId: 'SCN-G02-00', state: 'S2', hotspot: 'RUNTIME-HS-G02-00-PULSE-ZOOM', id: 'RUNTIME-PUZ-G02-PULSE-SCAN', type: 'pattern-decode' },
  { sceneId: 'SCN-G02-01', state: 'S2', hotspot: 'RUNTIME-HS-G02-01-RESCUE-CONFIRM', id: 'RUNTIME-PUZ-G02-CRANE-COUNTERWEIGHT', type: 'crane-counterweight' },
  { sceneId: 'SCN-G02-02', state: 'S5', hotspot: 'RUNTIME-HS-G02-02-ARCHIVE', id: 'RUNTIME-PUZ-G02-BORROW-RETURN', type: 'borrow-use-return' },
] as const satisfies readonly { sceneId: string; state: string; hotspot: string; id: string; type: TrialMechanicType }[]

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

const expectNoQimaIdentityLeak = async (page: Page) => {
  expect(await page.locator('body').innerText()).not.toContain('七码')
  await expect(page.locator('[aria-label*="七码"], [alt*="七码"], [title*="七码"]')).toHaveCount(0)
  await expect(page.locator('[data-character-card-id="CHAR-QIMA"]')).toHaveCount(0)
  await expect(page.locator('.character-profile[data-character-id="CHAR-QIMA"]')).toHaveCount(0)
}

const dragMechanic = async (page: Page, type: string, token: string, slot: string) => {
  const panel = page.locator(`[data-trial-mechanic="${type}"]`)
  await panel.locator(`[data-mechanic-draggable][data-mechanic-target="${token}"]`).dragTo(panel.locator(`[data-mechanic-dropzone="${slot}"]`))
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

    if (mechanic.type === 'signal-memory') {
      await panel.locator('[data-action="mechanic-play"]').click()
      await panel.locator('[data-mechanic-target="cyan"]').click()
    } else if (mechanic.type === 'airflow-maze') await panel.locator('[data-mechanic-target="ice-pocket"]').click()
    else if (mechanic.type === 'garbage-route') await panel.locator('[data-mechanic-target="wreck-field"]').click()
    else await panel.locator('[data-action="mechanic-submit"]').click()
    await expect(panel).toHaveAttribute('data-mechanic-status', 'error')
    await capture(page, info, `${String(index + 1).padStart(2, '0')}-${mechanic.type}-error.png`)

    if (mechanic.type === 'rotating-circuit') await panel.locator('[data-mechanic-target="input-junction"]').click()
    else if (mechanic.type === 'signal-memory') {
      await panel.locator('[data-action="mechanic-play"]').click()
      await panel.locator('[data-mechanic-target="amber"]').click()
    } else if (mechanic.type === 'task-order') await dragMechanic(page, mechanic.type, 'pressure', 'timeline-1')
    else if (mechanic.type === 'airflow-maze') await panel.locator('[data-mechanic-target="inlet"]').click()
    else if (mechanic.type === 'star-map-snap') {
      await panel.locator('[data-action="mechanic-rotate"][data-mechanic-target="fragment-a"]').click()
      await dragMechanic(page, mechanic.type, 'fragment-a', 'star-slot-a')
    } else if (mechanic.type === 'garbage-route') await panel.locator('[data-mechanic-target="node-a"]').click()
    else if (mechanic.type === 'waveform-tuning') await panel.locator('[data-mechanic-range="frequency"]').fill('62')
    else if (mechanic.type === 'attitude-balance') await panel.locator('[data-mechanic-range="pitch"]').fill('50')
    else if (mechanic.type === 'pattern-decode') await panel.locator('[data-mechanic-range="pulse-1"]').fill('3')
    else if (mechanic.type === 'crane-counterweight') await dragMechanic(page, mechanic.type, 'weight-1', 'right-far')
    else await dragMechanic(page, mechanic.type, 'borrow-heater', 'heater-borrow')
    await expect(panel).toHaveAttribute('data-mechanic-status', 'partial')
    await capture(page, info, `${String(index + 1).padStart(2, '0')}-${mechanic.type}-partial.png`)

    await solveTrialMechanic(page, mechanic.type, { close: false })
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
  await expectNoQimaIdentityLeak(page)
  await page.locator('[data-hotspot-id="RUNTIME-HS-G01-01-BOOT-SEQUENCE"]').click()
  await expectNoQimaIdentityLeak(page)
  await page.locator('[data-action="mechanic-play"]').click()
  for (const token of ['amber', 'cyan', 'white', 'violet']) await page.locator(`[data-mechanic-target="${token}"]`).click()
  await expect(page.locator('[data-mechanic-status="complete"]')).toBeVisible()
  await expectNoQimaIdentityLeak(page)
  await capture(page, info, 'qima-boot-complete-before-reveal.png')
  await page.getByRole('button', { name: '关闭启动信号记忆' }).click()
  await expect(page.locator('[data-dialogue-id="DLG-G01-0004"]')).toBeVisible()
  for (const id of ['DLG-G01-0004', 'DLG-G01-0005', 'DLG-G01-0006']) {
    await expect(page.locator(`[data-dialogue-id="${id}"]`)).toBeVisible()
    await expectNoQimaIdentityLeak(page)
    await page.getByRole('button', { name: '下一句' }).click()
  }
  await expect(page.locator('[data-dialogue-id="DLG-G01-0025"]')).toContainText('EDU-0077')
  await expect(page.locator('body')).toContainText('七码')
  await capture(page, info, 'qima-self-introduction.png')
  for (const id of ['DLG-G01-0025', 'DLG-G01-0026', 'DLG-G01-0027']) {
    await expect(page.locator(`[data-dialogue-id="${id}"]`)).toBeVisible()
    await page.getByRole('button', { name: '下一句' }).click()
  }
  await expect(page.locator('[data-dialogue-id="DLG-G01-0028"]')).toContainText('当前任务')
  await page.getByRole('button', { name: '继续探索' }).click()
  await expect(page.locator('[data-character-unlock="CHAR-QIMA"]')).toBeVisible()
  await expect(page.locator('[data-character-card-id="CHAR-QIMA"]')).toHaveCount(0)
  await expect(page.locator('.task-strip')).toContainText('前往中控台，找回船上第一张维修任务单')
  await capture(page, info, 'qima-nonblocking-unlock-after-story-reveal.png')
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
