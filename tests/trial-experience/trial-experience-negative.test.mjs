import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

const mutations = [
  'title-bypass',
  'continue-always-enabled',
  'fake-login',
  'fake-audio',
  'story-too-short',
  'character-missing',
  'item-missing',
  'item-field-missing',
  'ui-meta-pollutes-story',
  'schema-downgrade',
  'later-scene-entry',
  'developer-copy',
  'reset-single-confirm',
  'archive-missing-dialogue',
  'version-wrong',
]

for (const mutation of mutations) {
  test(`rejects ${mutation}`, () => {
    const result = spawnSync(process.execPath, ['scripts/validate-trial-experience.mjs', `--mutation=${mutation}`], {
      cwd: process.cwd(),
      encoding: 'utf8',
    })
    assert.notEqual(result.status, 0, `${mutation} unexpectedly passed`)
    assert.match(`${result.stdout}\n${result.stderr}`, /TRIAL-[A-Z]+-[0-9]{3}/)
  })
}
