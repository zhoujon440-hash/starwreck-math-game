import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

const mutations = [
  'star-core-one',
  'chapter-complete',
  'handoff-g02',
  'ability-unlocked',
  'hint-missing-level',
  'danger-drops-evidence',
  'danger-drops-progress',
  'wrong-use-consumes',
  'missing-safe-node',
  'invented-official-id',
  'scn06-implemented',
  'unauthorized-art',
]

for (const mutation of mutations) {
  test(`rejects ${mutation}`, () => {
    const result = spawnSync(process.execPath, ['scripts/validate-g01-pr-b.mjs', `--mutation=${mutation}`], {
      cwd: process.cwd(),
      encoding: 'utf8',
    })
    assert.notEqual(result.status, 0, `${mutation} unexpectedly passed`)
    assert.match(`${result.stdout}\n${result.stderr}`, /PRB-[A-Z]+-[0-9]{3}/)
  })
}
