import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

const mutations = [
  'scope-add-scn03',
  'boundary-interactive',
  'star-core-one',
  'chapter-complete',
  'ability-early',
  'adapter-fake-official',
  'hint-missing-level',
  'hint-wrong-semantics',
  'wrong-use-consumes',
  'duplicate-grant',
  'danger-no-safe-node',
  'danger-drops-evidence',
  'danger-drops-progress',
  'danger-creates-evidence',
  'save-drops-g01',
  'unauthorized-art',
  'runtime-sha-missing',
  'direct-board-runtime',
]

for (const mutation of mutations) {
  test(`rejects ${mutation}`, () => {
    const result = spawnSync(
      process.execPath,
      ['scripts/validate-g02-slice-01.mjs', `--mutation=${mutation}`],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
      },
    )
    assert.notEqual(result.status, 0, `${mutation} unexpectedly passed`)
    assert.match(
      `${result.stdout}\n${result.stderr}`,
      /G02-[A-Z]+-[0-9]{3}/,
    )
  })
}
