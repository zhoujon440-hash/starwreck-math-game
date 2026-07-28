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
