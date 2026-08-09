import { expect, type Page } from '@playwright/test'

export type TrialMechanicType =
  | 'rotating-circuit'
  | 'signal-memory'
  | 'task-order'
  | 'airflow-maze'
  | 'star-map-snap'
  | 'garbage-route'
  | 'waveform-tuning'
  | 'attitude-balance'
  | 'pattern-decode'
  | 'crane-counterweight'
  | 'borrow-use-return'

const sequences: Partial<Record<TrialMechanicType, readonly string[]>> = {
  'signal-memory': ['amber', 'cyan', 'white', 'violet'],
  'task-order': ['pressure', 'patch', 'repress'],
  'airflow-maze': ['inlet', 'lower-valve', 'upper-valve', 'gauge'],
  'star-map-snap': ['fragment-a', 'fragment-b', 'fragment-c'],
  'garbage-route': ['node-a', 'node-b', 'bypass-window', 'safe-landing'],
  'pattern-decode': ['triple', 'double', 'triple'],
  'crane-counterweight': ['weight-2-left', 'weight-1-right', 'weight-3-left'],
  'borrow-use-return': [
    'borrow-heater',
    'use-heater',
    'return-heater',
    'borrow-screen',
    'use-screen',
    'return-screen',
  ],
}

const values: Partial<Record<TrialMechanicType, Readonly<Record<string, number>>>> = {
  'waveform-tuning': { frequency: 62, phase: 38, gain: 74 },
  'attitude-balance': { pitch: 50, roll: 50 },
}

export const solveTrialMechanic = async (
  page: Page,
  type: TrialMechanicType,
  options: { close?: boolean } = {},
): Promise<void> => {
  const panel = page.locator(`[data-trial-mechanic="${type}"]`)
  await expect(panel).toBeVisible()

  if (type === 'rotating-circuit') {
    for (const [target, wanted] of [
      ['input-junction', 1],
      ['relay-junction', 2],
      ['output-junction', 3],
    ] as const) {
      const control = panel.locator(`[data-mechanic-target="${target}"]`)
      const current = Number(await control.getAttribute('data-mechanic-value'))
      for (let index = 0; index < (wanted - current + 4) % 4; index += 1) {
        await control.click()
      }
    }
  } else if (values[type]) {
    for (const [target, value] of Object.entries(values[type]!)) {
      await panel.locator(`[data-mechanic-range="${target}"]`).fill(String(value))
    }
    await panel.locator('[data-action="mechanic-submit"]').click()
  } else {
    const completed = await panel.locator('.mechanic-token.is-confirmed').count()
    for (const target of (sequences[type] ?? []).slice(completed)) {
      await panel.locator(`[data-mechanic-target="${target}"]`).click()
    }
  }

  await expect(panel).toHaveAttribute('data-mechanic-status', 'complete')
  if (options.close !== false) {
    await panel.locator('[data-action="close-puzzle"]').click()
    await expect(panel).toHaveCount(0)
  }
}
