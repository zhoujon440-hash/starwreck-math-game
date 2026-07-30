import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

const mutations = [
  'star-core-one',
  'early-completion',
  'g02-gameplay',
  'advanced-ability',
  'ability-order',
  'hint-missing-level',
  'hint-completes-all',
  'danger-drops-item',
  'danger-drops-hos',
  'danger-drops-evidence',
  'danger-no-refresh-node',
  'danger-creates-evidence',
  'invented-official-id',
  'unauthorized-art',
  'missing-runtime-asset',
  'pr5-art',
]

for (const mutation of mutations) {
  test(`rejects ${mutation}`, () => {
    const result = spawnSync(
      process.execPath,
      ['scripts/validate-g01-demo.mjs', `--mutation=${mutation}`],
      { cwd: process.cwd(), encoding: 'utf8' },
    )
    assert.notEqual(result.status, 0, `${mutation} unexpectedly passed`)
    assert.match(`${result.stdout}\n${result.stderr}`, /DEMO-[A-Z]+-[0-9]{3}/)
  })
}
