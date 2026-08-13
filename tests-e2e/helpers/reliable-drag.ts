import { expect, type Locator, type Page } from '@playwright/test'

type DragOptions = {
  attempts?: number
  isComplete?: () => Promise<boolean>
}

const center = (box: { x: number; y: number; width: number; height: number }) => ({
  x: box.x + box.width / 2,
  y: box.y + box.height / 2,
})

const visibleHitPoint = async (locator: Locator): Promise<{ x: number; y: number } | null> =>
  locator.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    const offsets = [0.5, 0.35, 0.65, 0.2, 0.8]
    for (const yOffset of offsets) {
      for (const xOffset of offsets) {
        const point = { x: rect.left + rect.width * xOffset, y: rect.top + rect.height * yOffset }
        const hit = document.elementFromPoint(point.x, point.y)
        if (hit && (hit === element || element.contains(hit))) return point
      }
    }
    return null
  })

/**
 * Performs a real pointer drag instead of dispatching DOM events or mutating game state.
 * The deliberate first movement and stepped path make Chromium consistently begin an
 * HTML5 drag before the pointer reaches a drop zone, including on slower CI runners.
 */
export const dragWithMouse = async (
  page: Page,
  source: Locator,
  target: Locator,
  options: DragOptions = {},
): Promise<void> => {
  const attempts = options.attempts ?? 3
  const shell = page.locator('.game-shell')
  let lastError: unknown
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (options.isComplete && await options.isComplete()) return
    if (!options.isComplete && await shell.count() > 0) {
      await expect(shell).not.toHaveAttribute('data-object-interaction', /.+/, { timeout: 2_000 })
    }

    try {
      await expect(source).toBeVisible()
      await expect(target).toBeVisible()
      const sourceBox = await source.boundingBox()
      const targetBox = await target.boundingBox()
      if (!sourceBox || !targetBox) throw new Error('Cannot drag an element without a rendered bounding box')

      const from = await visibleHitPoint(source) ?? center(sourceBox)
      const to = await visibleHitPoint(target) ?? center(targetBox)
      await page.mouse.move(from.x, from.y)
      await page.mouse.down()
      try {
        await page.mouse.move(from.x + 12, from.y + 8, { steps: 4 })
        await page.waitForTimeout(80)
        await page.mouse.move(to.x, to.y, { steps: 24 })
        await page.waitForTimeout(120)
      } finally {
        await page.mouse.up()
      }

      const completed = options.isComplete ?? (async () => {
        const result = await shell.getAttribute('data-object-interaction')
        return result === 'installed' || result === 'error'
      })
      await expect.poll(completed, { timeout: 1_500, intervals: [50, 100, 200] }).toBe(true)
      return
    } catch (error) {
      lastError = error
      try { await page.mouse.up() } catch { /* pointer was already released */ }
      await page.waitForTimeout(120)
      // Re-querying locators on the next bounded attempt handles the expected panel re-render.
    }
  }

  if (options.isComplete && await options.isComplete()) return
  const detail = lastError instanceof Error ? `: ${lastError.message}` : ''
  throw new Error(`Real mouse drag did not reach its expected state after ${attempts} attempts${detail}`)
}

export const dragMechanicToken = async (
  page: Page,
  panel: Locator,
  token: string,
  slot: string,
): Promise<void> => {
  const source = panel.locator(`[data-mechanic-draggable][data-mechanic-target="${token}"]`)
  const target = panel.locator(`[data-mechanic-dropzone="${slot}"]`)
  const isComplete = async (): Promise<boolean> => {
    if (await source.count() === 0) return false
    const placedSlot = await source.getAttribute('data-placed-slot')
    const [sourceClass, parentClass] = await Promise.all([
      source.getAttribute('class'),
      source.locator('..').getAttribute('class'),
    ])
    return placedSlot === slot
      || Boolean(sourceClass?.includes('is-placed-correctly'))
      || Boolean(parentClass?.includes('is-placed-correctly'))
  }
  await dragWithMouse(page, source, target, { isComplete })
}

export const dragInventoryItem = async (
  page: Page,
  itemId: string,
  targetId: string,
): Promise<void> => {
  const source = page.locator(`[data-inventory-item="${itemId}"]`)
  await dragWithMouse(page, source, page.locator(`[data-drop-target="${targetId}"]`), {
    isComplete: async () => await source.count() === 0,
  })
}
