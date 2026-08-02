import { expect, type Page } from '@playwright/test'

export const enterTrialRuntime = async (page: Page): Promise<void> => {
  const title = page.locator('[data-trial-view="title"]')
  if (!(await title.isVisible().catch(() => false))) return

  const continueButton = page.locator('[data-trial-action="continue"]')
  if (await continueButton.isEnabled()) {
    await markHistoricalCardsSeen(page)
    await page.reload()
    await page.locator('[data-trial-action="continue"]').click()
  } else {
    await page.locator('[data-trial-action="new-game"]').click()
    await expect(page.locator('[data-trial-view="story-intro"]')).toBeVisible()
    await page.locator('[data-trial-action="intro-skip"]').click()
    await expect(page.locator('[data-trial-view="chapter-guide"]')).toBeVisible()
    await page.locator('[data-trial-action="chapter-start"]').click()
    await expect(page.locator('[data-trial-view="game"]')).toBeVisible()
    await markHistoricalCardsSeen(page)
    await page.reload()
  }

  await expect(page.locator('[data-trial-view="game"]')).toBeVisible()
}

const markHistoricalCardsSeen = async (page: Page): Promise<void> => {
  await page.evaluate(() => {
    const itemIds = [
      'ITM-G01-001', 'ITM-G01-002', 'ITM-G01-004', 'ITM-G01-005', 'ITM-G01-006',
      'RUNTIME-ITM-G01-FIXED-BUCKLE', 'RUNTIME-ITM-G01-MAINTENANCE-SHEET',
      'RUNTIME-ITM-G01-STAR-MAP-KEY', 'ITM-G01-007', 'ITM-G01-008', 'ITM-G01-009',
      'RUNTIME-ITM-G01-REPRESS-KEY', 'RUNTIME-ITM-G01-010-A', 'RUNTIME-ITM-G01-010-B',
      'RUNTIME-ITM-G01-010-C', 'ITM-G01-011', 'ITM-G01-012', 'ITM-G01-013',
      'RUNTIME-ITM-G02-MAGNETIC-GRAPNEL', 'ITM-G02-002', 'ITM-G02-003', 'ITM-G02-004',
      'RUNTIME-ITM-G02-005-A', 'RUNTIME-ITM-G02-005-B', 'ITM-G02-006',
    ]
    localStorage.setItem('starwreck:ui-meta:v1', JSON.stringify({
      version: 1,
      introSeen: true,
      g02RecapSeen: true,
      seenCharacterCards: ['CHAR-XINGYU', 'CHAR-QIMA', 'CHAR-ALMAO', 'CHAR-ZHENG'],
      seenItemCards: itemIds,
      settings: { fontSize: 'standard', dialogueSpeed: 'standard', reducedMotion: false },
      updatedAt: new Date().toISOString(),
    }))
  })
}
