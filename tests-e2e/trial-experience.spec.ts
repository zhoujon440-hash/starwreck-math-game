import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, test, type Page, type TestInfo } from '@playwright/test'

test.use({ trace: 'on', video: 'on' })

const saveKey = 'starwreck:save:G01:v1'
const forbiddenPlayerCopy = /schema(?:\s+v?\d+)?|RUNTIME-[A-Z0-9-]+|项目负责人|验收|交付边界|垂直切片|门禁|测试文字|开发阶段/i

const collectErrors = (page: Page): string[] => {
  const errors: string[] = []
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
  page.on('pageerror', (error) => errors.push(error.message))
  return errors
}

const capture = async (page: Page, info: TestInfo, name: string): Promise<void> => {
  const output = join(process.cwd(), 'test-results', 'trial-experience', info.project.name)
  await mkdir(output, { recursive: true })
  await page.screenshot({ path: join(output, name), fullPage: true, animations: 'disabled' })
}

const legacySession = (sceneId = 'SCN-G02-02') => ({
  schemaVersion: 2,
  chapterId: 'G01',
  currentSceneId: sceneId,
  sceneState: 'S2',
  sceneStates: {
    'SCN-G01-00': 'S6', 'SCN-G01-01': 'S6', 'SCN-G01-02': 'S6', 'SCN-G01-03': 'S6',
    'SCN-G01-04': 'S6', 'SCN-G01-05': 'S6', 'SCN-G01-06': 'S6', 'SCN-G01-07': 'S6',
    'G02-BOUNDARY': 'S1', 'SCN-G02-00': 'S6', 'SCN-G02-01': 'S6', 'SCN-G02-02': 'S2',
  },
  activeRuntimeNodeId: null,
  safeRecovery: null,
  foundItemIds: ['ITM-G01-001', 'ITM-G01-002', 'ITM-G02-002'],
  inventoryItemIds: ['ITM-G02-002'],
  usedItemIds: ['ITM-G01-001', 'ITM-G01-002'],
  completedHotspotIds: [],
  completedPuzzleIds: [],
  hosProgress: {},
  puzzleProgress: {},
  hintCount: 0,
  hintLevels: {},
  flags: {
    g01_chapter_complete: true,
    g01_handoff_to_g02: true,
    g01_qima_online: true,
    g01_scn06_search_authorized: true,
    g01_scn06_analysis_authorized: true,
    g01_scn06_pathfinding_authorized: true,
    g01_scn07_complete: true,
    g01_landing_scanned: true,
    g01_scn07_autosave_confirmed: true,
    g01_scn07_exit_ready: true,
    world_star_core_count: 0,
    ability_qima_search: true,
    ability_analysis: true,
    ability_pathfinding: true,
    ability_teleport: false,
    ability_shrink: false,
    ability_clone: false,
    g02_intro_scan_done: true,
    g02_almao_rescued: true,
    g02_resource_labels: 3,
    g02_archive_restored: false,
    g02_evidence_001: true,
  },
  dialogue: { currentDialogueId: null, active: false, readDialogueIds: ['DLG-G02-0001'] },
  dialogueHistory: [{ dialogueId: 'DLG-G02-0001', speakerId: 'CHAR-XINGYU', text: '我有四个问题。', sequence: 1 }],
  characterStates: { 'CHAR-XINGYU': 'determined', 'CHAR-QIMA': 'normal', 'CHAR-ALMAO': 'relieved', 'CHAR-ZHENG': 'warning' },
  unlockedCharacterIds: ['CHAR-XINGYU', 'CHAR-QIMA', 'CHAR-ALMAO', 'CHAR-ZHENG'],
  characterDiscoveries: {},
  transitionLog: [],
  updatedAt: new Date().toISOString(),
})

test('new browser presents title, sourced intro and legal G01 start', async ({ page }, info) => {
  const errors = collectErrors(page)
  await page.goto('/')
  await expect(page.locator('[data-trial-view="title"]')).toBeVisible()
  await expect(page.locator('[data-trial-action="continue"]')).toBeDisabled()
  await expect(page.getByRole('heading', { name: /星骸拾荒者/ })).toBeVisible()
  await capture(page, info, '01-title-no-save.png')

  const titleText = await page.locator('body').innerText()
  expect(titleText).not.toMatch(forbiddenPlayerCopy)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)

  await page.locator('[data-trial-action="new-game"]').click()
  await expect(page.locator('[data-story-card-id="WORLD-TWELVE-GATES"]')).toBeVisible()
  await capture(page, info, '02-story-intro.png')
  await page.locator('[data-trial-action="intro-next"]').click()
  await page.locator('[data-trial-action="intro-next"]').click()
  await expect(page.locator('[data-story-card-id="WORLD-XINGYU-QIMA"]')).toContainText('星宇与七码')
  await capture(page, info, '03-xingyu-qima-intro.png')

  await page.locator('[data-trial-action="intro-skip"]').click()
  await expect(page.locator('[data-trial-view="chapter-guide"]')).toContainText('拾光号：坠落之前')
  expect(await page.evaluate((key) => localStorage.getItem(key), saveKey)).toBeNull()
  await capture(page, info, '04-g01-chapter-guide.png')
  await page.locator('[data-trial-action="chapter-start"]').click()
  await expect(page.locator('[data-trial-view="game"]')).toBeVisible()
  await expect(page.getByRole('button', { name: '开始搜寻' })).toBeVisible()
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}').flags?.g01_chapter_complete, saveKey)).not.toBe(true)
  await page.getByRole('button', { name: '开始搜寻' }).click()
  await page.getByRole('button', { name: '下一句' }).click()
  await page.getByRole('button', { name: '继续探索' }).click()
  await page.locator('[data-hotspot-id="HS-G01-0001"]').click()
  await expect(page.locator('[data-item-card-id="ITM-G01-001"]')).toContainText('获得物品')
  await capture(page, info, '05-first-item-card.png')
  await page.locator('[data-trial-action="dismiss-card"]').click()
  expect(errors).toEqual([])
})

test('legacy schema v2 save continues, archives used items and persists settings', async ({ page }, info) => {
  const errors = collectErrors(page)
  await page.addInitScript(({ key, session }) => localStorage.setItem(key, JSON.stringify(session)), {
    key: saveKey,
    session: legacySession(),
  })
  await page.goto('/')
  await expect(page.locator('[data-trial-view="title"]')).toContainText('旧电视墙')
  await expect(page.locator('[data-trial-action="continue"]')).toBeEnabled()
  await capture(page, info, '05-title-legacy-save.png')

  await page.locator('[data-trial-action="new-game"]').click()
  await expect(page.locator('[data-trial-view="new-game-confirm"]')).toBeVisible()
  await capture(page, info, '06-new-game-confirm.png')
  await page.locator('[data-trial-action="title"]').click()
  await expect(page.locator('[data-save-state="available"]')).toBeVisible()

  await page.locator('[data-trial-action="continue"]').click()
  await expect(page.locator('[data-scene-id="SCN-G02-02"]')).toBeVisible()
  await expect(page.locator('[data-trial-view="story-intro"]')).toHaveCount(0)
  await page.getByRole('button', { name: '主菜单' }).click()
  await page.getByRole('button', { name: '故事档案' }).click()
  await expect(page.locator('[data-trial-view="archive"]')).toBeVisible()
  await page.locator('[data-trial-action="archive-tab"][data-tab="items"]').click()
  await expect(page.locator('[data-item-coverage-count="25"]')).toBeVisible()
  await expect(page.getByText('应急手灯', { exact: true })).toBeVisible()
  await page.locator('[data-trial-action="view-item"][data-item-id="ITM-G01-001"]').click()
  await expect(page.locator('[data-item-card-id="ITM-G01-001"]')).toContainText('已使用')
  await capture(page, info, '07-used-item-detail.png')
  await page.locator('[data-trial-action="dismiss-card"]').click()
  await page.locator('[data-trial-action="archive-tab"][data-tab="characters"]').click()
  await expect(page.getByText('阿铆', { exact: true })).toBeVisible()
  await expect(page.getByText('郑', { exact: true })).toBeVisible()
  await capture(page, info, '08-character-archive.png')
  await page.locator('[data-trial-action="archive-close"]').click()

  await page.getByRole('button', { name: '设置' }).click()
  await page.locator('[data-trial-action="setting-font"][data-value="extra-large"]').click()
  await page.locator('[data-trial-action="setting-motion"]').click()
  await expect(page.locator('html')).toHaveAttribute('data-font-size', 'extra-large')
  await capture(page, info, '09-settings-persisted.png')
  await page.reload()
  await expect(page.locator('[data-scene-id="SCN-G02-02"]')).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('data-font-size', 'extra-large')
  expect(errors).toEqual([])
})

test('corrupt save returns safely and reset requires two confirmations', async ({ page }, info) => {
  const errors = collectErrors(page)
  await page.addInitScript((key) => localStorage.setItem(key, '{not-json'), saveKey)
  await page.goto('/')
  await expect(page.locator('[data-trial-view="title"]')).toContainText('已安全返回标题页')
  await expect(page.locator('[data-trial-action="continue"]')).toBeDisabled()
  await capture(page, info, '10-corrupt-save-safe-title.png')

  await page.evaluate(({ key, session }) => localStorage.setItem(key, JSON.stringify(session)), {
    key: saveKey,
    session: legacySession('SCN-G01-05'),
  })
  await page.reload()
  await page.locator('[data-trial-action="settings"]').click()
  await page.locator('[data-trial-action="reset-stage-one"]').click()
  await expect(page.locator('[data-reset-stage="1"]')).toBeVisible()
  await page.locator('[data-trial-action="reset-stage-two"]').click()
  await expect(page.locator('[data-reset-stage="2"]')).toBeVisible()
  await capture(page, info, '11-reset-final-confirm.png')
  await page.locator('[data-trial-action="reset-confirm"]').click()
  await expect(page.locator('[data-save-state="empty"]')).toBeVisible()
  expect(await page.evaluate((key) => localStorage.getItem(key), saveKey)).toBeNull()
  expect(errors).toEqual([])
})

test('Almao and Zheng character cards appear once at their formal first encounters', async ({ page }, info) => {
  const errors = collectErrors(page)
  const session = legacySession('SCN-G02-01')
  session.sceneState = 'S0'
  session.sceneStates['SCN-G02-01'] = 'S0'
  session.unlockedCharacterIds = ['CHAR-XINGYU', 'CHAR-QIMA']
  delete session.characterStates['CHAR-ALMAO']
  delete session.characterStates['CHAR-ZHENG']
  session.inventoryItemIds = []
  session.foundItemIds = []
  session.usedItemIds = []
  session.flags.g02_almao_rescued = false
  session.flags.g02_resource_labels = 0

  await page.addInitScript(({ key, seeded }) => {
    localStorage.setItem(key, JSON.stringify(seeded))
    localStorage.setItem('starwreck:ui-meta:v1', JSON.stringify({
      version: 1,
      introSeen: true,
      g02RecapSeen: true,
      seenCharacterCards: ['CHAR-XINGYU', 'CHAR-QIMA'],
      seenItemCards: [],
      settings: { fontSize: 'standard', dialogueSpeed: 'standard', reducedMotion: false },
      updatedAt: new Date().toISOString(),
    }))
  }, { key: saveKey, seeded: session })

  await page.goto('/')
  await page.locator('[data-trial-action="continue"]').click()
  await page.locator('[data-hotspot-id="RUNTIME-HS-G02-01-OBSERVE"]').click()
  await expect(page.locator('[data-item-card-id="RUNTIME-ITM-G02-MAGNETIC-GRAPNEL"]')).toBeVisible()
  await page.locator('[data-trial-action="dismiss-card"]').click()
  await expect(page.locator('[data-character-card-id="CHAR-ALMAO"]')).toBeVisible()
  await capture(page, info, '12-almao-first-card.png')
  await page.locator('[data-trial-action="dismiss-card"]').click()
  await page.locator('[data-inventory-item="RUNTIME-ITM-G02-MAGNETIC-GRAPNEL"]').dragTo(
    page.locator('[data-drop-target="HS-G02-0003"]'),
  )
  await page.locator('[data-hotspot-id="RUNTIME-HS-G02-01-RESCUE-CONFIRM"]').click()
  await expect(page.locator('[data-character-card-id="CHAR-ZHENG"]')).toBeVisible()
  await capture(page, info, '13-zheng-first-card.png')
  await page.locator('[data-trial-action="dismiss-card"]').click()

  const seen = await page.evaluate(() => JSON.parse(localStorage.getItem('starwreck:ui-meta:v1') ?? '{}').seenCharacterCards)
  expect(seen).toEqual(expect.arrayContaining(['CHAR-ALMAO', 'CHAR-ZHENG']))
  await page.reload()
  await expect(page.locator('[data-character-card-id]')).toHaveCount(0)
  expect(errors).toEqual([])
})
