import { expect, type Locator, type Page } from '@playwright/test'

export type TrialMechanicType =
  | 'rotating-circuit' | 'signal-memory' | 'task-order' | 'airflow-maze'
  | 'star-map-snap' | 'garbage-route' | 'waveform-tuning' | 'attitude-balance'
  | 'pattern-decode' | 'crane-counterweight' | 'borrow-use-return'

const drag = async (panel: Locator, token: string, slot: string): Promise<void> => {
  const source = panel.locator(`[data-mechanic-draggable][data-mechanic-target="${token}"]`)
  const [sourceClass, parentClass] = await Promise.all([
    source.getAttribute('class'),
    source.locator('..').getAttribute('class'),
  ])
  if (sourceClass?.includes('is-placed-correctly') || parentClass?.includes('is-placed-correctly')) return
  await source.dragTo(panel.locator(`[data-mechanic-dropzone="${slot}"]`))
}

export const solveTrialMechanic = async (
  page: Page,
  type: TrialMechanicType,
  options: { close?: boolean } = {},
): Promise<void> => {
  const panel = page.locator(`[data-trial-mechanic="${type}"]`)
  await expect(panel).toBeVisible()

  if (type === 'rotating-circuit') {
    for (const [target, wanted] of [['input-junction', 1], ['relay-junction', 2], ['output-junction', 3]] as const) {
      const control = panel.locator(`[data-mechanic-target="${target}"]`)
      const current = Number(await control.getAttribute('data-mechanic-value'))
      for (let index = 0; index < (wanted - current + 4) % 4; index += 1) await control.click()
    }
    await panel.locator('[data-action="mechanic-submit"]').click()
  } else if (type === 'signal-memory') {
    if (await panel.locator('[data-playback-seen="true"]').count() === 0) await panel.locator('[data-action="mechanic-play"]').click()
    const completed = await panel.locator('.memory-key.is-confirmed').count()
    for (const token of ['amber', 'cyan', 'white', 'violet'].slice(completed)) await panel.locator(`[data-mechanic-target="${token}"]`).click()
  } else if (type === 'task-order') {
    for (const [token, slot] of [['pressure', 'timeline-1'], ['patch', 'timeline-2'], ['repress', 'timeline-3']]) await drag(panel, token, slot)
    await panel.locator('[data-action="mechanic-submit"]').click()
  } else if (type === 'airflow-maze') {
    const completed = await panel.locator('.maze-node.is-confirmed').count()
    for (const token of ['inlet', 'lower-valve', 'upper-valve', 'gauge'].slice(completed)) await panel.locator(`[data-mechanic-target="${token}"]`).click()
  } else if (type === 'star-map-snap') {
    for (const [token, slot, rotations] of [['fragment-a', 'star-slot-a', 1], ['fragment-b', 'star-slot-b', 3], ['fragment-c', 'star-slot-c', 2]] as const) {
      const piece = panel.locator(`[data-mechanic-draggable][data-mechanic-target="${token}"]`)
      if ((await piece.locator('..').getAttribute('class'))?.includes('is-placed-correctly')) continue
      const rotate = panel.locator(`[data-action="mechanic-rotate"][data-mechanic-target="${token}"]`)
      const current = Number(await rotate.getAttribute('data-mechanic-value'))
      for (let index = current; index < rotations; index += 1) await rotate.click()
      await drag(panel, token, slot)
    }
    await panel.locator('[data-action="mechanic-submit"]').click()
  } else if (type === 'garbage-route') {
    const completed = await panel.locator('.route-node.is-confirmed').count()
    for (const token of ['node-a', 'node-b', 'bypass-window', 'safe-landing'].slice(completed)) await panel.locator(`[data-mechanic-target="${token}"]`).click()
  } else if (type === 'waveform-tuning' || type === 'attitude-balance') {
    const values = type === 'waveform-tuning' ? { frequency: 62, phase: 38, gain: 74 } : { pitch: 50, roll: 50 }
    for (const [target, value] of Object.entries(values)) await panel.locator(`[data-mechanic-range="${target}"]`).fill(String(value))
    await panel.locator('[data-action="mechanic-submit"]').click()
  } else if (type === 'pattern-decode') {
    for (const [target, value] of Object.entries({ 'pulse-1': 3, 'pulse-2': 2, 'pulse-3': 3 })) await panel.locator(`[data-mechanic-range="${target}"]`).fill(String(value))
    await panel.locator('[data-action="mechanic-submit"]').click()
  } else if (type === 'crane-counterweight') {
    for (const [token, slot] of [['weight-1', 'right-far'], ['weight-2', 'right-near'], ['weight-3', 'left-near']]) await drag(panel, token, slot)
    await panel.locator('[data-action="mechanic-submit"]').click()
  } else {
    const placements = {
      'borrow-heater': 'heater-borrow', 'use-heater': 'heater-use', 'return-heater': 'heater-return',
      'borrow-screen': 'screen-borrow', 'use-screen': 'screen-use', 'return-screen': 'screen-return',
    }
    for (const [token, slot] of Object.entries(placements)) await drag(panel, token, slot)
    await panel.locator('[data-action="mechanic-submit"]').click()
  }

  await expect(panel).toHaveAttribute('data-mechanic-status', 'complete')
  if (options.close !== false) {
    await panel.locator('[data-action="close-puzzle"]').click()
    await expect(panel).toHaveCount(0)
  }
}
