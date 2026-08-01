import { expect, test, type Page, type TestInfo } from '@playwright/test'

test.use({ trace: 'on', video: 'on' })

const saveKey = 'starwreck:save:G01:v1'

const seedG01Handoff = async (page: Page): Promise<void> => {
  await page.addInitScript(
    ({ key }) => {
      const session = {
        schemaVersion: 2,
        chapterId: 'G01',
        currentSceneId: 'G02-BOUNDARY',
        sceneState: 'S0',
        sceneStates: {
          'SCN-G01-00': 'S6',
          'SCN-G01-01': 'S6',
          'SCN-G01-02': 'S6',
          'SCN-G01-03': 'S6',
          'SCN-G01-04': 'S6',
          'SCN-G01-05': 'S6',
          'SCN-G01-06': 'S6',
          'SCN-G01-07': 'S6',
          'G02-BOUNDARY': 'S0',
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
          g02_intro_scan_done: false,
          g02_almao_rescued: false,
          g02_resource_labels: 0,
          g02_archive_restored: false,
        },
        dialogue: {
          currentDialogueId: null,
          active: false,
          readDialogueIds: [],
        },
        dialogueHistory: [],
        characterStates: {
          'CHAR-XINGYU': 'determined',
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

const clickHotspot = async (page: Page, id: string): Promise<void> => {
  const hotspot = page.locator(`[data-hotspot-id="${id}"]`)
  await expect(hotspot).toBeVisible()
  await hotspot.click()
}

const drag = async (
  page: Page,
  itemId: string,
  targetId: string,
): Promise<void> => {
  await page
    .locator(`[data-inventory-item="${itemId}"]`)
    .dragTo(page.locator(`[data-drop-target="${targetId}"]`))
}

const advanceDialogue = async (page: Page, count: number): Promise<void> => {
  for (let index = 0; index < count; index += 1) {
    await page.getByRole('button', { name: /继续探索|下一句/ }).click()
  }
}

const requestHint = async (page: Page, expectedText: string): Promise<void> => {
  await page.getByRole('button', { name: '获取渐进式提示' }).click()
  await expect(page.locator('.toast')).toContainText(expectedText)
}

const waitForHintCooldown = async (page: Page): Promise<void> => {
  await page.waitForTimeout(1_650)
  await expect(page.getByRole('button', { name: '获取渐进式提示' })).toBeEnabled()
}

test('G01 handoff through SCN-G02-00—02 forms a persistent HOPA vertical slice', async ({
  page,
}, info) => {
  test.setTimeout(360_000)
  const consoleErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => consoleErrors.push(error.message))

  await seedG01Handoff(page)
  await page.goto('/')
  await expect(page.locator('[data-scene-id="G02-BOUNDARY"]')).toBeVisible()
  await expect(page.getByRole('heading', { name: '旧屏幕谷外缘' })).toBeVisible()
  await capture(page, info, '00-g01-to-g02-handoff.png')

  await page.getByRole('button', { name: '进入旧屏幕谷' }).click()
  await expect(page.locator('[data-dialogue-id="DLG-G02-0001"]')).toBeVisible()
  await capture(page, info, '01-scn00-opening-dialogue.png')
  await advanceDialogue(page, 2)
  await expect(page.locator('[data-scene-id="SCN-G02-00"]')).toBeVisible()
  await capture(page, info, '02-scn00-initial.png')

  await clickHotspot(page, 'HS-G02-0001')
  const beforeScn00Failure = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    saveKey,
  )
  await page
    .getByRole('button', { name: '观察掩体外正在掠过的磁性碎片风' })
    .click()
  await expect(
    page.locator(
      '[data-safe-recovery-node="SCN-G02-00:satellite-axle-cover"]',
    ),
  ).toBeVisible()
  await capture(page, info, '03-scn00-soft-failure.png')
  await page.reload()
  await expect(
    page.locator(
      '[data-safe-recovery-node="SCN-G02-00:satellite-axle-cover"]',
    ),
  ).toBeVisible()
  await capture(page, info, '04-scn00-safe-node-after-refresh.png')
  await page.getByRole('button', { name: '保留进度继续' }).click()
  const afterScn00Resume = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    saveKey,
  )
  expect(afterScn00Resume.completedHotspotIds).toEqual(
    beforeScn00Failure.completedHotspotIds,
  )
  expect(afterScn00Resume.flags.g02_evidence_001).not.toBe(true)

  await clickHotspot(page, 'HS-G02-0002')
  await page
    .getByRole('button', { name: '打开七码封存脉冲扫描近景' })
    .click()
  await expect(
    page.getByRole('heading', { name: '封存脉冲取样窗' }),
  ).toBeVisible()
  await capture(page, info, '05a-scn00-pulse-initial.png')
  await page.getByRole('button', { name: '封存当前取样' }).click()
  await expect(page.locator('.toast')).toContainText('没有同步')
  await capture(page, info, '05b-scn00-pulse-wrong-retained.png')
  await page.getByRole('button', { name: '关闭封存脉冲取样' }).click()

  await requestHint(page, '先在断卫星轴背风侧观察蓝色脉冲')
  await capture(page, info, '05c-scn00-hint-direction.png')
  await waitForHintCooldown(page)
  await requestHint(page, '扫描窗会重复显示两组等长脉冲')
  await capture(page, info, '05d-scn00-hint-area.png')
  await waitForHintCooldown(page)
  await requestHint(page, '七码会把一个尚未校准的取样控制量调整到合法位置')
  await page.waitForTimeout(550)
  await page.getByRole('button', { name: '打开七码封存脉冲扫描近景' }).click()
  await expect(page.locator('[data-pulse-control="interval"]')).toHaveAttribute('data-control-value', '3')
  await expect(page.locator('[data-pulse-control="gain"]')).toHaveAttribute('data-control-value', '1')
  await expect(page.locator('[data-pulse-control="window"]')).toHaveAttribute('data-control-value', '1')
  await capture(page, info, '05e-scn00-hint-one-control-only.png')

  await page.getByRole('button', { name: '提高扫描增益' }).click()
  await page.getByRole('button', { name: '延长取样窗口' }).click()
  await page.getByRole('button', { name: '延长取样窗口' }).click()
  await capture(page, info, '05f-scn00-pulse-partial-calibration.png')
  await page.getByRole('button', { name: '封存当前取样' }).click()
  await expect(page.locator('.game-shell')).toHaveClass(/state-S3/)
  await capture(page, info, '05g-scn00-pulse-completed.png')
  await clickHotspot(page, 'RUNTIME-HS-G02-00-SAMPLE')
  await clickHotspot(page, 'RUNTIME-HS-G02-00-VERIFY')
  await clickHotspot(page, 'RUNTIME-HS-G02-00-EXIT')
  await expect(page.getByRole('heading', { name: '垃圾雨之前完成' })).toBeVisible()
  await capture(page, info, '06-scn00-complete.png')

  await page.getByRole('button', { name: '继续探索' }).click()
  await expect(page.locator('[data-scene-id="SCN-G02-01"]')).toBeVisible()
  await capture(page, info, '07-scn01-initial.png')
  await clickHotspot(page, 'RUNTIME-HS-G02-01-OBSERVE')
  await expect(page.locator('[data-dialogue-id="DLG-G02-0003"]')).toBeVisible()
  await capture(page, info, '08-scn01-almao-dialogue.png')
  await advanceDialogue(page, 2)
  await expect(
    page.locator(
      '[data-inventory-item="RUNTIME-ITM-G02-MAGNETIC-GRAPNEL"]',
    ),
  ).toBeVisible()
  await drag(
    page,
    'RUNTIME-ITM-G02-MAGNETIC-GRAPNEL',
    'HS-G02-0003',
  )
  await expect(page.locator('.game-shell')).toHaveClass(/state-S2/)

  const beforeScn01Failure = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    saveKey,
  )
  await page
    .getByRole('button', { name: '在吊臂松脱警告期间冒险靠近阿铆' })
    .click()
  await expect(
    page.locator(
      '[data-safe-recovery-node="SCN-G02-01:old-screen-valley-safe"]',
    ),
  ).toBeVisible()
  await capture(page, info, '09-scn01-soft-failure-after-grapnel.png')
  await page.reload()
  await page.getByRole('button', { name: '保留进度继续' }).click()
  const afterScn01Resume = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    saveKey,
  )
  expect(afterScn01Resume.usedItemIds).toEqual(beforeScn01Failure.usedItemIds)
  expect(afterScn01Resume.flags.g02_grapnel_installed).toBe(true)
  expect(
    afterScn01Resume.inventoryItemIds.filter(
      (id: string) => id === 'RUNTIME-ITM-G02-MAGNETIC-GRAPNEL',
    ),
  ).toHaveLength(0)

  await clickHotspot(page, 'RUNTIME-HS-G02-01-RESCUE-CONFIRM')
  await expect(page.locator('[data-dialogue-id="DLG-G02-0005"]')).toBeVisible()
  await capture(page, info, '10-scn01-almao-rescued.png')
  await advanceDialogue(page, 2)
  for (const id of ['HS-G02-0005', 'HS-G02-0006', 'HS-G02-0007']) {
    await clickHotspot(page, id)
  }
  await capture(page, info, '11-scn01-three-resource-labels.png')
  await page
    .getByRole('button', { name: '打开资源归属证据近景并完成分类' })
    .click()
  await capture(page, info, '11a-scn01-resource-slots-initial.png')
  await page
    .locator('[data-mechanism-item="RUNTIME-G02-LABEL-DOUBLE-RING"]')
    .dragTo(page.locator('[data-resource-slot="RUNTIME-G02-SLOT-DISCARDED"]'))
  await expect(page.locator('.toast')).toContainText('不吻合')
  await capture(page, info, '11b-scn01-resource-wrong-retained.png')
  await page.getByRole('button', { name: '关闭资源归属分析' }).click()

  await requestHint(page, '先看标签的磨损轮廓')
  await capture(page, info, '11c-scn01-hint-direction.png')
  await waitForHintCooldown(page)
  await requestHint(page, '双环、三路接头和断裂边缘')
  await capture(page, info, '11d-scn01-hint-area.png')
  await waitForHintCooldown(page)
  await requestHint(page, '七码会把一枚尚未归位的标签放入正确资源槽')
  await page.waitForTimeout(550)
  await page
    .getByRole('button', { name: '打开资源归属证据近景并完成分类' })
    .click()
  await expect(
    page.locator('[data-resource-slot="RUNTIME-G02-SLOT-PRIVATE"] [data-mechanism-item="RUNTIME-G02-LABEL-DOUBLE-RING"]'),
  ).toBeVisible()
  await expect(page.locator('[data-mechanism-item]')).toHaveCount(3)
  await capture(page, info, '11e-scn01-hint-one-label-only.png')
  await page
    .locator('[data-mechanism-item="RUNTIME-G02-LABEL-THREE-LINK"]')
    .dragTo(page.locator('[data-resource-slot="RUNTIME-G02-SLOT-PUBLIC-HEAT"]'))
  await capture(page, info, '11f-scn01-resource-partial.png')
  await page
    .locator('[data-mechanism-item="RUNTIME-G02-LABEL-BROKEN-EDGE"]')
    .dragTo(page.locator('[data-resource-slot="RUNTIME-G02-SLOT-DISCARDED"]'))
  await page.getByRole('button', { name: '确认资源归属' }).click()
  await expect(page.getByRole('heading', { name: '五尾清算完成' })).toBeVisible()
  await capture(page, info, '12-scn01-complete.png')

  await page.getByRole('button', { name: '继续探索' }).click()
  await expect(page.locator('[data-scene-id="SCN-G02-02"]')).toBeVisible()
  await capture(page, info, '13-scn02-initial.png')
  await requestHint(page, '先检查屏幕碎片堆，缺少的不是整块屏幕')
  await capture(page, info, '13a-scn02-formal-hint-direction.png')
  await waitForHintCooldown(page)
  await requestHint(page, '三枚电源键的边缘磨损分别对应三块主屏')
  await capture(page, info, '13b-scn02-formal-hint-area.png')
  await waitForHintCooldown(page)
  await clickHotspot(page, 'HS-G02-0011')
  await expect(page.locator('[data-dialogue-id="DLG-G02-0007"]')).toBeVisible()
  await advanceDialogue(page, 1)
  await page.getByRole('button', { name: '打开屏幕碎片堆找物近景' }).click()
  await expect(page.getByRole('heading', { name: '屏幕碎片堆' })).toBeVisible()
  await capture(page, info, '14-scn02-hos-initial.png')

  for (const label of [
    '在左上旧遥控器后找到电源键 A',
    '在右上网兜边找到电源键 B',
    '在中央断线下找到电源键 C',
  ]) {
    await page.getByRole('button', { name: label }).click()
  }
  await capture(page, info, '15-scn02-hos-partial.png')
  await page.reload()
  await expect(page.locator('[data-scene-id="SCN-G02-02"]')).toBeVisible()
  for (const id of ['ITM-G02-002', 'ITM-G02-003', 'ITM-G02-004']) {
    await expect(page.locator(`[data-inventory-item="${id}"]`)).toBeVisible()
  }
  await page.getByRole('button', { name: '打开屏幕碎片堆找物近景' }).click()
  await capture(page, info, '16-scn02-hos-partial-after-refresh.png')
  for (const label of [
    '在左下旧标签后找到短线 A',
    '在右下螺丝堆边找到短线 B',
    '在中央旧屏壳后找到镜面屏片',
  ]) {
    await page.getByRole('button', { name: label }).click()
  }
  await expect(page.locator('.game-shell')).toHaveClass(/state-S2/)
  await capture(page, info, '17-scn02-hos-complete-inventory.png')
  for (const developerText of ['ITM-G02', 'HS-G02', 'RUNTIME-', '本切片']) {
    await expect(page.locator('body')).not.toContainText(developerText)
  }

  await requestHint(page, '自动将一枚正确电源键放入对应槽')
  await page.waitForTimeout(550)
  await expect(page.locator('[data-inventory-item="ITM-G02-002"]')).toHaveCount(0)
  await expect(page.locator('[data-inventory-item="RUNTIME-ITM-G02-005-A"]')).toBeVisible()
  await expect(page.locator('.game-shell')).toHaveClass(/state-S2/)
  await capture(page, info, '17a-scn02-formal-hint-one-key-only.png')

  await drag(page, 'ITM-G02-006', 'HS-G02-0008')
  await expect(page.getByRole('status')).toContainText('接口不匹配')
  await expect(page.locator('[data-inventory-item="ITM-G02-006"]')).toBeVisible()
  await capture(page, info, '18-scn02-wrong-use-not-consumed.png')
  await drag(page, 'RUNTIME-ITM-G02-005-A', 'HS-G02-0008')
  await drag(page, 'ITM-G02-003', 'RUNTIME-HS-G02-0009-KEY')
  await drag(page, 'RUNTIME-ITM-G02-005-B', 'HS-G02-0009')
  await capture(page, info, '19-scn02-two-screens-restored.png')

  const beforeScn02Failure = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    saveKey,
  )
  await page
    .getByRole('button', { name: '触碰电视墙后方仍在放电的裸露电缆' })
    .click()
  await expect(
    page.locator('[data-safe-recovery-node="SCN-G02-02:tv-wall-safe"]'),
  ).toBeVisible()
  await capture(page, info, '20-scn02-soft-failure.png')
  await page.reload()
  await expect(
    page.locator('[data-safe-recovery-node="SCN-G02-02:tv-wall-safe"]'),
  ).toBeVisible()
  await capture(page, info, '21-scn02-soft-failure-after-refresh.png')
  await page.getByRole('button', { name: '保留进度继续' }).click()
  const afterScn02Resume = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    saveKey,
  )
  expect(afterScn02Resume.hosProgress).toEqual(beforeScn02Failure.hosProgress)
  expect(afterScn02Resume.usedItemIds).toEqual(beforeScn02Failure.usedItemIds)
  expect(afterScn02Resume.flags.g02_evidence_005).not.toBe(true)

  await drag(page, 'ITM-G02-004', 'HS-G02-0010')
  await clickHotspot(page, 'RUNTIME-HS-G02-02-ARCHIVE')
  await expect(page.locator('[data-dialogue-id="DLG-G02-0008"]')).toBeVisible()
  await capture(page, info, '22-scn02-archive-dialogue.png')
  await advanceDialogue(page, 2)
  await expect(
    page.getByRole('heading', { name: '谁说这是无主之物完成' }),
  ).toBeVisible()
  await capture(page, info, '23-scn02-complete.png')

  await page.getByRole('button', { name: '任务与证据' }).click()
  await expect(page.getByRole('heading', { name: '任务与证据' })).toBeVisible()
  await capture(page, info, '24-journal.png')
  await page.getByRole('button', { name: '关闭任务与证据' }).click()
  await page.getByRole('button', { name: '对话历史' }).click()
  await expect(page.getByRole('heading', { name: '对话历史' })).toBeVisible()
  await capture(page, info, '25-dialogue-history.png')
  await page.getByRole('button', { name: '关闭对话历史' }).click()
  await page.getByRole('button', { name: '角色档案' }).click()
  await expect(page.getByRole('heading', { name: '角色档案' })).toBeVisible()
  await capture(page, info, '26-character-profile.png')
  await page.getByRole('button', { name: '关闭角色档案' }).click()

  await page.getByRole('button', { name: '返回旧屏幕谷安全区' }).click()
  await expect(
    page.locator('[data-scene-id="RUNTIME-G02-ENERGY-SEARCH-BOUNDARY"]'),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: '四组能量信号' }),
  ).toBeVisible()
  await expect(page.locator('[data-hotspot-id]')).toHaveCount(0)
  await capture(page, info, '27-read-only-scn03-boundary.png')

  const finalSave = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!),
    saveKey,
  )
  expect(finalSave.flags).toMatchObject({
    g01_chapter_complete: true,
    g01_handoff_to_g02: true,
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
    g02_archive_restored: true,
    g02_magnetic_glove_owned: false,
    g02_admin_unlocked: false,
    g02_chapter_complete: false,
  })
  await page.reload()
  await expect(
    page.locator('[data-scene-id="RUNTIME-G02-ENERGY-SEARCH-BOUNDARY"]'),
  ).toBeVisible()
  await capture(page, info, '28-final-boundary-after-refresh.png')

  const forbidden = [
    'S0',
    'schema v',
    '项目负责人',
    '验收',
    '交付边界',
    '垂直切片',
    '本版本',
    '只读边界',
    '不开放热点',
    '不写入变量',
    'G02-SLICE',
  ]
  for (const text of forbidden) {
    await expect(page.locator('body')).not.toContainText(text)
  }
  expect(consoleErrors).toEqual([])
})
