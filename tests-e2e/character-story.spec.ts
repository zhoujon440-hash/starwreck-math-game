import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { expect, test, type Page, type TestInfo } from '@playwright/test'

const capture = async (
  page: Page,
  testInfo: TestInfo,
  fileName: string,
): Promise<void> => {
  const directory = join(
    process.cwd(),
    'test-results',
    'character-story',
    testInfo.project.name,
  )
  await mkdir(directory, { recursive: true })
  await page.screenshot({ path: join(directory, fileName), fullPage: true })
}

const clickHotspot = async (page: Page, hotspotId: string): Promise<void> => {
  const hotspot = page.locator(`[data-hotspot-id="${hotspotId}"]`)
  await expect(hotspot).toBeVisible()
  await hotspot.click()
}

const advanceVisibleDialogue = async (page: Page): Promise<void> => {
  await page.locator('.dialogue-performance [data-action="advance-dialogue"]').click()
}

test('SCN-G01-00 uses formal portraits, persistent dialogue, history and profile', async ({
  page,
}, testInfo) => {
  const browserErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text())
  })
  page.on('pageerror', (error) => browserErrors.push(error.message))

  await page.goto('/')
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
  await page.getByRole('button', { name: '开始搜寻' }).click()

  const opening = page.locator('[data-dialogue-id="DLG-G01-0001"]')
  await expect(opening).toBeVisible()
  await expect(opening.locator('img')).toHaveAttribute(
    'src',
    '/assets/characters/xingyu/xingyu_alert.png',
  )
  await expect(opening).toContainText('七码？回答。')
  await capture(page, testInfo, '01-scn00-xingyu-performance.png')

  await page.getByRole('button', { name: '下一句' }).click()
  await expect(page.locator('[data-dialogue-id="DLG-G01-0002"]')).toBeVisible()
  await page.reload()
  await expect(page.locator('[data-dialogue-id="DLG-G01-0002"]')).toBeVisible()

  await page.getByRole('button', { name: '对话历史' }).click()
  const history = page.getByRole('dialog', { name: '对话历史' })
  await expect(history).toBeVisible()
  await expect(history.locator('[data-history-dialogue-id]')).toHaveCount(2)
  await expect(history).toContainText('七码？回答。')
  await expect(history).toContainText('导航核心离线。维修舱进入应急照明模式。')
  await capture(page, testInfo, '02-dialogue-history-restored.png')
  await page.getByRole('button', { name: '关闭对话历史' }).click()

  await page.getByRole('button', { name: '角色档案' }).click()
  const profile = page.getByRole('dialog', { name: '角色档案' })
  await expect(profile).toBeVisible()
  await expect(profile.locator('[data-character-id="CHAR-XINGYU"]')).toBeVisible()
  await expect(profile.locator('img')).toHaveAttribute(
    'src',
    '/assets/characters/xingyu/xingyu_alert.png',
  )
  await expect(profile).not.toContainText('EDU-0077')
  await capture(page, testInfo, '03-xingyu-profile.png')
  await page.getByRole('button', { name: '关闭角色档案' }).click()

  const stored = await page.evaluate(() => {
    const value = window.localStorage.getItem('starwreck:save:G01:v1')
    return value ? JSON.parse(value) : null
  })
  expect(stored.schemaVersion).toBe(2)
  expect(stored.dialogue.currentDialogueId).toBe('DLG-G01-0002')
  expect(stored.dialogue.active).toBe(true)
  expect(stored.dialogueHistory).toHaveLength(2)
  expect(stored.unlockedCharacterIds).toEqual(['CHAR-XINGYU'])
  expect(stored.flags.world_star_core_count).toBe(0)
  expect(stored.flags.g01_chapter_complete).toBe(false)
  expect(stored.flags.g01_handoff_to_g02).toBe(false)
  expect(browserErrors).toEqual([])
})

test('SCN-G01-01 completes the formal HOPA recovery loop and restores from save', async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000)
  const browserErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') browserErrors.push(message.text())
  })
  page.on('pageerror', (error) => browserErrors.push(error.message))

  await page.goto('/')
  await page.evaluate(() => window.localStorage.clear())
  await page.reload()
  await page.getByRole('button', { name: '开始搜寻' }).click()
  await expect(page.locator('[data-dialogue-id="DLG-G01-0001"]')).toBeVisible()
  await capture(page, testInfo, '01-scn00-xingyu-dialogue.png')
  await advanceVisibleDialogue(page)
  await advanceVisibleDialogue(page)

  await clickHotspot(page, 'HS-G01-0001')
  await expect(page.locator('[data-dialogue-id="DLG-G01-0003"]')).toBeVisible()
  await advanceVisibleDialogue(page)
  await page.locator('[data-inventory-item="ITM-G01-001"]').click()
  await clickHotspot(page, 'HS-G01-0002')
  await clickHotspot(page, 'HS-G01-0003')
  for (const hotspotId of [
    'HOS-G01-001-01',
    'HOS-G01-001-02',
    'HOS-G01-001-03',
    'HOS-G01-001-04',
  ]) {
    await clickHotspot(page, hotspotId)
  }
  await page.locator('[data-inventory-item="ITM-G01-002"]').dragTo(
    page.locator('[data-drop-target="HS-G01-0004"]'),
  )
  await clickHotspot(page, 'HS-G01-0005')
  await page.getByRole('button', { name: '沿船尾通道前进' }).click()
  await page.getByRole('button', { name: '进入导航核心舱' }).click()

  await expect(page.locator('.game-shell')).toHaveAttribute(
    'data-scene-id',
    'SCN-G01-01',
  )
  await expect(page.locator('.scene-art')).toHaveCSS(
    'background-image',
    /SCENE-G01-002_navigation_core_cabin/,
  )
  await capture(page, testInfo, '02-scn01-initial-scene.png')

  await clickHotspot(page, 'RUNTIME-HS-G01-01-ENTRY')
  await expect(page.locator('[data-qima-state="offline"]')).toBeVisible()
  await capture(page, testInfo, '03-qima-offline.png')
  await clickHotspot(page, 'HS-G01-0005')
  await expect(page.locator('[data-qima-state="damaged"]')).toBeVisible()
  await capture(page, testInfo, '04-qima-damaged.png')

  await clickHotspot(page, 'HS-G01-0006')
  await expect(
    page.getByRole('dialog', { name: '找回七码的维修组件' }),
  ).toBeVisible()
  await expect(page.locator('.qima-hos-art .collectible-object')).toHaveCount(4)
  await expect(page.locator('.qima-hos-art .hos-distractor-object')).toHaveCount(6)
  await capture(page, testInfo, '05-hos-initial.png')

  await clickHotspot(page, 'HOS-G01-002-01')
  await expect(page.locator('[data-collectible-item="ITM-G01-004"]')).toHaveCount(0)
  await capture(page, testInfo, '06-qima-chip-collected.png')
  await page.getByRole('button', { name: '关闭导航零件堆特写' }).click()
  await expect(page.locator('[data-inventory-item="ITM-G01-004"]')).toBeVisible()
  await capture(page, testInfo, '07-inventory-with-chip.png')

  await clickHotspot(page, 'HS-G01-0006')
  for (const hotspotId of [
    'HOS-G01-002-02',
    'HOS-G01-002-03',
    'HOS-G01-002-04',
  ]) {
    await clickHotspot(page, hotspotId)
  }
  await expect(page.locator('.game-shell')).toHaveClass(/state-S3/)

  await clickHotspot(page, 'PUZ-G01-CHIP-ORIENTATION-HOTSPOT')
  await expect(page.getByRole('dialog', { name: '校正触点方向' })).toBeVisible()
  await page.getByRole('button', { name: '旋转 90°' }).click()
  await expect(page.locator('[data-chip-rotation="180"]')).toBeVisible()
  await page.getByRole('button', { name: '确认方向' }).click()
  await expect(page.locator('.game-shell')).toHaveClass(/state-S4/)

  const chip = page.locator('[data-inventory-item="ITM-G01-004"]')
  await chip.dragTo(page.locator('[data-drop-target="HS-G01-0007-CONTACT"]'))
  await expect(chip).toBeVisible()
  await expect(page.locator('.game-shell')).toHaveClass(/state-S4/)
  await expect(page.getByRole('status')).toContainText('接口不匹配')
  await capture(page, testInfo, '08-wrong-use-keeps-item.png')

  await page.locator('[data-inventory-item="ITM-G01-005"]').dragTo(
    page.locator('[data-drop-target="HS-G01-0007-CONTACT"]'),
  )
  await page.locator('[data-inventory-item="ITM-G01-006"]').dragTo(
    page.locator('[data-drop-target="HS-G01-0007-FUSE"]'),
  )
  await page.locator('[data-inventory-item="ITM-G01-004"]').dragTo(
    page.locator('[data-drop-target="HS-G01-0008"]'),
  )
  await capture(page, testInfo, '09-correct-repair-progress.png')
  await page
    .locator('[data-inventory-item="RUNTIME-ITM-G01-FIXED-BUCKLE"]')
    .dragTo(page.locator('[data-drop-target="RUNTIME-HS-G01-0008-BUCKLE"]'))

  await expect(page.locator('[data-qima-state="booting"]')).toBeVisible()
  await expect(page.locator('[data-boot-sequence="non-skippable"]')).toBeVisible()
  await capture(page, testInfo, '10-qima-booting.png')

  await expect(page.locator('.game-shell')).toHaveClass(/state-S6/, {
    timeout: 5_000,
  })
  await expect(page.locator('[data-qima-state="normal"]')).toBeVisible()
  await capture(page, testInfo, '11-qima-normal.png')
  await expect(page.locator('[data-dialogue-id="DLG-G01-0004"]')).toBeVisible()
  await capture(page, testInfo, '12-qima-first-dialogue.png')
  await advanceVisibleDialogue(page)
  await advanceVisibleDialogue(page)
  await advanceVisibleDialogue(page)
  await expect(page.getByRole('heading', { name: '七码已重新上线' })).toBeVisible()
  await capture(page, testInfo, '13-scn01-complete.png')

  await page.getByRole('button', { name: '对话历史' }).click()
  await expect(page.getByRole('dialog', { name: '对话历史' })).toContainText(
    '启动完成。我离线了四分十二秒。',
  )
  await capture(page, testInfo, '14-dialogue-history.png')
  await page.getByRole('button', { name: '关闭对话历史' }).click()
  await page.getByRole('button', { name: '角色档案' }).click()
  await expect(page.locator('[data-character-id="CHAR-QIMA"]')).toContainText(
    'EDU-0077',
  )
  await capture(page, testInfo, '15-character-profile.png')
  await page.getByRole('button', { name: '关闭角色档案' }).click()

  await page.reload()
  await expect(page.locator('.game-shell')).toHaveAttribute(
    'data-scene-id',
    'SCN-G01-01',
  )
  await expect(page.locator('.game-shell')).toHaveClass(/state-S6/)
  await expect(page.getByRole('heading', { name: '七码已重新上线' })).toBeVisible()
  await capture(page, testInfo, '16-save-restored.png')

  const stored = await page.evaluate(() => {
    const value = window.localStorage.getItem('starwreck:save:G01:v1')
    return value ? JSON.parse(value) : null
  })
  expect(stored.currentSceneId).toBe('SCN-G01-01')
  expect(stored.sceneStates['SCN-G01-01']).toBe('S6')
  expect(stored.hosProgress['HOS-G01-002']).toHaveLength(4)
  expect(stored.characterStates['CHAR-QIMA']).toBe('normal')
  expect(stored.dialogueHistory).toHaveLength(6)
  expect(stored.flags.g01_scn01_complete).toBe(true)
  expect(stored.flags.world_star_core_count).toBe(0)
  expect(browserErrors).toEqual([])
})
