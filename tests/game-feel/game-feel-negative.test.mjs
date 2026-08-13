import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { test } from 'node:test'

const mutations = [
  'missing-presentation', 'duplicate-device', 'world-state-missing', 'camera-mode-missing',
  'modal-restored', 'drag-bounce-removed', 'blocking-item-card-restored', 'checklist-visible',
  'reduced-motion-removed', 'qima-leak', 'schema-upgrade', 'later-scene', 'skip-existing-gate',
]

for (const mutation of mutations) {
  test(`game-feel gate rejects ${mutation}`, () => {
    const result = spawnSync(process.execPath, ['scripts/validate-game-feel.mjs', `--mutation=${mutation}`], {
      cwd: process.cwd(), encoding: 'utf8', env: process.env,
    })
    assert.notEqual(result.status, 0, `${mutation} unexpectedly passed`)
    assert.match(`${result.stdout}\n${result.stderr}`, /GAME-FEEL-/)
  })
}
