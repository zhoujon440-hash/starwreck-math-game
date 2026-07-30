import { expect, test, type Page, type TestInfo } from '@playwright/test'

test.use({ trace: 'on', video: 'on' })

const saveKey = 'starwreck:save:G01:v1'

const seedPrC = async (page: Page): Promise<void> => {
  await page.addInitScript(
    ({ key }) => {
      const session = {
        schemaVersion: 2,
        chapterId: 'G01',
        currentSceneId: 'SCN-G01-06',
        sceneState: 'S0',
        sceneStates: {
          'SCN-G01-00': 'S6',
          'SCN-G01-01': 'S6',
          'SCN-G01-02': 'S6',
          'SCN-G01-03': 'S6',
          'SCN-G01-04': 'S6',
          'SCN-G01-05': 'S6',
          'SCN-G01-06': 'S0',
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
          g01_scn05_complete: true,
          world_star_core_count: 0,
          ability_qima_search: false,
          ability_analysis: false,
          ability_pathfinding: false,
          ability_teleport: false,
          ability_shrink: false,
          ability_clone: false,
        },
        dialogue: {
          currentDialogueId: null,
          active: false,
          readDialogueIds: [],
        },
        dialogueHistory: [],
        characterStates: {
          'CHAR-XINGYU': 'normal',
          'CHAR-QIMA': 'normal',
        },
        unlockedCharacterIds: ['CHAR-XINGYU', 'CHAR-QIMA'],
        characterDiscoveries: {},
        transitionLog: [],
        updatedAt: new Date().toISOString(),
      }
      if (!localStorage.getItem(key)) {
        localStorage.setItem(key, JSON.stringify(session))
      }
    },
    { key: saveKey },
  )
}

const capture = async (
  page: Page,
  info: TestInfo,
  name: string,
): Promise<void> => {
  await expect(page.locator('[data-scene-canvas]')).toBeVisible()
  await page.screenshot({
    path: info.outputPath(name),
    fullPage: true,
    animations: 'disabled',
  })
}

const advanceDialogue = async (page: Page, count = 1): Promise<void> => {
  for (let index = 0; index < count; index += 1) {
    await page.getByRole('button', { name: /继续探索|下一句/ }).click()
  }
}

test('SCN06—SCN07 complete the formal G01 demo handoff with persistent soft failure', async ({
  page,
}, info) => {
  const consoleErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => consoleErrors.push(error.message))

  await seedPrC(page)
  await page.goto('/')
  await expect(page.locator('[data-scene-id="SCN-G01-06"]')).toBeVisible()
  await capture(page, info, 'scn06-01-initial.png')

  await page.getByRole('button', { name: '调查中央求救信号接收器' }).click()
  await expect(page.getByRole('heading', { name: '复原自删除的求救记录' })).toBeVisible()
  await capture(page, info, 'scn06-02-hos-initial.png')

  for (const name of ['信号记忆棱镜', '调谐线圈', '求救记录', '相位校准钥']) {
    await page.getByRole('button', { name: `在求救信号接收器中找到${name}` }).click()
  }
  await expect(page.locator('[data-scene-id="SCN-G01-06"]')).toHaveClass(/state-S2/)
  await expect(page.getByText('求救记录', { exact: true }).last()).toBeVisible()
  await capture(page, info, 'scn06-03-hos-complete-inventory.png')

  await page.getByRole('button', { name: '打开求救波形频段校准近景' }).click()
  for (const name of ['锁定求救频段', '同步重复相位', '提升弱信号增益']) {
    await page.getByRole('button', { name: new RegExp(name) }).click()
  }
  await expect(page.locator('[data-dialogue-id="DLG-G01-0017"]')).toBeVisible()
  await capture(page, info, 'scn06-04-distress-dialogue.png')
  await advanceDialogue(page, 2)

  await page.getByRole('button', { name: '按下左侧七码搜寻授权槽' }).click()
  await page.getByRole('button', { name: '按下中央分析授权槽' }).click()
  await page.getByRole('button', { name: '按下右侧已探索节点寻路授权槽' }).click()
  await expect(page.locator('[data-dialogue-id="DLG-G01-0019"]')).toBeVisible()
  await capture(page, info, 'scn06-05-three-basic-abilities.png')
  await advanceDialogue(page)
  await page.getByRole('button', { name: '合上观测记录存档拨杆' }).click()
  await expect(page.getByRole('heading', { name: '三项基础能力已授权' })).toBeVisible()
  await capture(page, info, 'scn06-06-complete.png')

  await page.getByRole('button', { name: '进入锈环星近地轨道' }).click()
  await expect(page.locator('[data-dialogue-id="DLG-G01-0020"]')).toBeVisible()
  await capture(page, info, 'scn07-01-initial-dialogue.png')
  await advanceDialogue(page)

  await page.getByRole('button', { name: '启动中央垃圾雨落点扫描台' }).click()
  await page.getByRole('button', { name: '打开落点扫描台近景' }).click()
  for (const name of ['七码搜寻', '分析', '寻路']) {
    await page.getByRole('button', { name: new RegExp(name) }).click()
  }
  await expect(page.locator('[data-dialogue-id="DLG-G01-0021"]')).toBeVisible()
  await capture(page, info, 'scn07-02-landing-scan-complete.png')
  await advanceDialogue(page)

  const beforeFailure = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), saveKey)
  await page
    .getByRole('button', { name: '尝试穿过舷窗右上方的不稳定垃圾雨走廊' })
    .click()
  await expect(
    page.locator('[data-safe-recovery-node="SCN-G01-07:orbit-safe-node"]'),
  ).toBeVisible()
  await capture(page, info, 'scn07-03-soft-failure-safe-node.png')
  await page.reload()
  await expect(
    page.locator('[data-safe-recovery-node="SCN-G01-07:orbit-safe-node"]'),
  ).toBeVisible()
  await capture(page, info, 'scn07-04-safe-node-after-refresh.png')
  await page.getByRole('button', { name: '从安全节点继续' }).click()
  const afterResume = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), saveKey)
  expect(afterResume.inventoryItemIds).toEqual(beforeFailure.inventoryItemIds)
  expect(afterResume.hosProgress).toEqual(beforeFailure.hosProgress)
  expect(afterResume.completedPuzzleIds).toEqual(beforeFailure.completedPuzzleIds)
  expect(afterResume.flags.g01_scn06_evidence_distress_record).toBe(true)
  expect(afterResume.flags.g01_landing_scanned).toBe(true)

  await page.getByRole('button', { name: '确认舷窗中央的安全着陆走廊' }).click()
  await page.getByRole('button', { name: '打开垃圾雨冲击缓冲机关' }).click()
  for (const name of ['锁定船体姿态', '接通冲击缓冲', '闭合着陆锁']) {
    await page.getByRole('button', { name: new RegExp(name) }).click()
  }
  await capture(page, info, 'scn07-05-impact-stabilized.png')

  await page.getByRole('button', { name: '确认右侧自动存档信标' }).click()
  await advanceDialogue(page, 3)
  await page.getByRole('button', { name: '打开左侧拾光号舱门' }).click()
  await expect(page.getByRole('heading', { name: '旧屏幕谷外缘已抵达' })).toBeVisible()
  await capture(page, info, 'scn07-06-complete.png')
  await page.getByRole('button', { name: '完成G01序章' }).click()

  const boundary = page.locator('[data-scene-id="G02-BOUNDARY"]')
  await expect(boundary).toBeVisible()
  await expect(
    page.getByRole('heading', {
      name: '序章《拾光号：坠落之前》完成',
    }),
  ).toBeVisible()
  await capture(page, info, 'g02-boundary-01-handoff.png')

  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), saveKey)
  expect(saved.flags.g01_chapter_complete).toBe(true)
  expect(saved.flags.g01_handoff_to_g02).toBe(true)
  expect(saved.flags.world_star_core_count).toBe(0)
  expect(saved.flags.ability_qima_search).toBe(true)
  expect(saved.flags.ability_analysis).toBe(true)
  expect(saved.flags.ability_pathfinding).toBe(true)
  expect(saved.flags.ability_teleport).toBe(false)
  expect(saved.flags.ability_shrink).toBe(false)
  expect(saved.flags.ability_clone).toBe(false)

  await page.reload()
  await expect(page.locator('[data-scene-id="G02-BOUNDARY"]')).toBeVisible()
  await page.getByRole('button', { name: '查看任务与证据' }).click()
  await expect(page.getByRole('heading', { name: '任务与证据' })).toBeVisible()
  await capture(page, info, 'g02-boundary-02-journal-after-refresh.png')
  expect(consoleErrors).toEqual([])
})

test('new game continuously traverses SCN00—SCN07 and stops at the G02 boundary', async ({
  page,
}, info) => {
  test.setTimeout(180_000)
  const consoleErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => consoleErrors.push(error.message))

  const clickId = async (id: string): Promise<void> => {
    const hotspot = page.locator(`[data-hotspot-id="${id}"]`)
    await expect(hotspot).toBeVisible()
    await hotspot.click()
  }
  const drag = async (itemId: string, targetId: string): Promise<void> => {
    await page
      .locator(`[data-inventory-item="${itemId}"]`)
      .dragTo(page.locator(`[data-drop-target="${targetId}"]`))
  }

  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.getByRole('button', { name: '开始搜寻' }).click()
  await advanceDialogue(page, 2)
  await capture(page, info, 'full-00-scn00-initial.png')

  await clickId('HS-G01-0001')
  await advanceDialogue(page)
  await page.locator('[data-inventory-item="ITM-G01-001"]').click()
  await clickId('HS-G01-0002')
  await clickId('HS-G01-0003')
  for (const id of [
    'HOS-G01-001-01',
    'HOS-G01-001-02',
    'HOS-G01-001-03',
    'HOS-G01-001-04',
  ]) {
    await clickId(id)
  }
  await capture(page, info, 'full-scn00-02-middle-hos-complete.png')
  await drag('ITM-G01-002', 'HS-G01-0004')
  await clickId('HS-G01-0005')
  await page.getByRole('button', { name: '沿船尾通道前进' }).click()
  await capture(page, info, 'full-01-scn00-complete.png')
  await page.getByRole('button', { name: '进入导航核心舱' }).click()

  await capture(page, info, 'full-02-scn01-initial.png')
  await clickId('RUNTIME-HS-G01-01-ENTRY')
  await clickId('HS-G01-0005')
  await clickId('HS-G01-0006')
  for (const id of [
    'HOS-G01-002-01',
    'HOS-G01-002-02',
    'HOS-G01-002-03',
    'HOS-G01-002-04',
  ]) {
    await clickId(id)
  }
  await capture(page, info, 'full-scn01-02-middle-components-found.png')
  await clickId('PUZ-G01-CHIP-ORIENTATION-HOTSPOT')
  await page.getByRole('button', { name: '旋转 90°' }).click()
  await page.getByRole('button', { name: '确认方向' }).click()
  await drag('ITM-G01-005', 'HS-G01-0007-CONTACT')
  await drag('ITM-G01-006', 'HS-G01-0007-FUSE')
  await drag('ITM-G01-004', 'HS-G01-0008')
  await drag('RUNTIME-ITM-G01-FIXED-BUCKLE', 'RUNTIME-HS-G01-0008-BUCKLE')
  await expect(page.locator('.game-shell')).toHaveClass(/state-S6/, {
    timeout: 6_000,
  })
  await expect(page.locator('[data-dialogue-id="DLG-G01-0004"]')).toBeVisible()
  await advanceDialogue(page, 3)
  await capture(page, info, 'full-03-scn01-complete.png')
  await page.getByRole('button', { name: '前往中控任务台' }).click()

  await capture(page, info, 'full-04-scn02-initial.png')
  await clickId('HS-G01-0009')
  await advanceDialogue(page)
  await clickId('RUNTIME-CLUE-G01-02-01')
  await clickId('RUNTIME-CLUE-G01-02-02')
  await capture(page, info, 'full-scn02-02-middle-task-evidence.png')
  await clickId('HS-G01-0010')
  await page.getByRole('button', { name: '记下路径' }).click()
  await clickId('RUNTIME-HS-G01-02-TASK-PUZZLE')
  for (const name of ['测量货舱压力', '封堵外壳裂口', '启动货舱复压']) {
    await page.getByRole('button', { name: new RegExp(name) }).click()
  }
  await drag('RUNTIME-ITM-G01-STAR-MAP-KEY', 'RUNTIME-HS-G01-02-MAP-KEY')
  await drag('RUNTIME-ITM-G01-MAINTENANCE-SHEET', 'HS-G01-0011')
  await advanceDialogue(page)
  await capture(page, info, 'full-05-scn02-complete.png')
  await page.getByRole('button', { name: '打开货舱安全门' }).click()
  await advanceDialogue(page)

  await capture(page, info, 'full-06-scn03-initial.png')
  await clickId('HS-G01-0013')
  await advanceDialogue(page)
  await clickId('RUNTIME-HS-G01-03-EMERGENCY-BOX')
  for (const id of [
    'HOS-G01-003-01',
    'HOS-G01-003-02',
    'HOS-G01-003-03',
    'HOS-G01-003-04',
  ]) {
    await clickId(id)
  }
  await capture(page, info, 'full-scn03-02-middle-emergency-supplies.png')
  await drag('ITM-G01-009', 'HS-G01-0014')
  await advanceDialogue(page)
  await clickId('RUNTIME-HS-G01-03-GAUGE-PUZZLE')
  for (const name of ['隔离外舱读数', '读取裂口压差', '锁定安全时间窗']) {
    await page.getByRole('button', { name }).click()
  }
  await drag('ITM-G01-008', 'HS-G01-0015-PATCH')
  await drag('ITM-G01-007', 'HS-G01-0015-TAPE')
  await drag('RUNTIME-ITM-G01-REPRESS-KEY', 'HS-G01-0016')
  await advanceDialogue(page)
  await capture(page, info, 'full-07-scn03-complete.png')
  await page.getByRole('button', { name: '前往导航星图室' }).click()
  await advanceDialogue(page)

  await capture(page, info, 'full-08-scn04-initial.png')
  await clickId('HS-G01-0017')
  await advanceDialogue(page)
  for (const id of [
    'HOS-G01-004-01',
    'HOS-G01-004-02',
    'HOS-G01-004-03',
    'HOS-G01-004-04',
  ]) {
    await clickId(id)
  }
  await capture(page, info, 'full-scn04-02-middle-fragments-found.png')
  await page.locator('[data-inventory-item="RUNTIME-ITM-G01-010-A"]').click()
  await clickId('HS-G01-0018-A')
  await page.locator('[data-inventory-item="RUNTIME-ITM-G01-010-B"]').click()
  await clickId('HS-G01-0018-B')
  await page.locator('[data-inventory-item="RUNTIME-ITM-G01-010-C"]').click()
  await clickId('HS-G01-0018-C')
  await clickId('HS-G01-0018')
  await page.getByRole('button', { name: '锁定十二星门环' }).click()
  await clickId('HS-G01-0019')
  await advanceDialogue(page)
  await page.locator('[data-inventory-item="ITM-G01-011"]').click()
  await clickId('HS-G01-0020')
  await capture(page, info, 'full-09-scn04-complete.png')
  await page.getByRole('button', { name: '前往驾驶舱规划航线' }).click()

  await capture(page, info, 'full-10-scn05-initial.png')
  await clickId('HS-G01-0021')
  await advanceDialogue(page)
  await clickId('HS-G01-0022')
  await clickId('RUNTIME-HS-G01-05-BYPASS-TOOL-SLOT')
  await page.locator('[data-inventory-item="ITM-G01-012"]').click()
  await clickId('HS-G01-0023')
  await advanceDialogue(page)
  await capture(page, info, 'full-scn05-02-middle-bypass-window.png')
  await clickId('HS-G01-0024')
  await clickId('RUNTIME-HS-G01-05-LANDING-CONFIRM')
  await capture(page, info, 'full-11-scn05-complete.png')
  await page.getByRole('button', { name: '追踪锈环星求救信号' }).click()

  await capture(page, info, 'full-12-scn06-initial.png')
  await clickId('HS-G01-0025')
  for (const name of ['信号记忆棱镜', '调谐线圈', '求救记录', '相位校准钥']) {
    await page.getByRole('button', { name: `在求救信号接收器中找到${name}` }).click()
  }
  await capture(page, info, 'full-scn06-02-middle-signal-components.png')
  await clickId('RUNTIME-HS-G01-06-SIGNAL-ALIGNMENT')
  for (const name of ['锁定求救频段', '同步重复相位', '提升弱信号增益']) {
    await page.getByRole('button', { name: new RegExp(name) }).click()
  }
  await advanceDialogue(page, 2)
  await clickId('HS-G01-0026')
  await clickId('HS-G01-0027')
  await clickId('HS-G01-0028')
  await advanceDialogue(page)
  await clickId('RUNTIME-HS-G01-06-SAVE-OBSERVATION')
  await capture(page, info, 'full-13-scn06-complete.png')
  await page.getByRole('button', { name: '进入锈环星近地轨道' }).click()
  await advanceDialogue(page)

  await capture(page, info, 'full-14-scn07-initial.png')
  await clickId('HS-G01-0029')
  await clickId('RUNTIME-HS-G01-07-LANDING-SCANNER')
  for (const name of ['七码搜寻', '分析', '寻路']) {
    await page.getByRole('button', { name: new RegExp(name) }).click()
  }
  await advanceDialogue(page)
  await capture(page, info, 'full-scn07-02-middle-landing-scan.png')
  await clickId('RUNTIME-HS-G01-07-CORRIDOR-CONFIRM')
  await clickId('RUNTIME-HS-G01-07-IMPACT-DAMPING')
  for (const name of ['锁定船体姿态', '接通冲击缓冲', '闭合着陆锁']) {
    await page.getByRole('button', { name: new RegExp(name) }).click()
  }
  await clickId('HS-G01-0030')
  await advanceDialogue(page, 3)
  await clickId('HS-G01-0031')
  await capture(page, info, 'full-15-scn07-complete.png')
  await page.getByRole('button', { name: '完成G01序章' }).click()
  await expect(page.locator('[data-scene-id="G02-BOUNDARY"]')).toBeVisible()
  await capture(page, info, 'full-16-g02-boundary.png')

  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), saveKey)
  expect(saved.flags).toMatchObject({
    g01_chapter_complete: true,
    g01_handoff_to_g02: true,
    world_star_core_count: 0,
  })
  expect(consoleErrors).toEqual([])
})
