import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '../..')
const validator = resolve(root, 'scripts/validate-character-story.mjs')
const fixtureRoot = resolve(
  root,
  'tests/fixtures/baseline-negative/character-story',
)

test('all Character Story rules, including formal runtime art, pass', () => {
  const result = spawnSync(process.execPath, [validator], {
    cwd: root,
    encoding: 'utf8',
  })
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`)
  assert.match(result.stdout, /CHARACTER_STORY_RULES_OK rules=49/)
})

for (const fixture of readdirSync(fixtureRoot)
  .filter((name) => name.endsWith('.json'))
  .sort()) {
  test(`negative fixture fails with complete diagnostic: ${fixture}`, () => {
    const path = resolve(fixtureRoot, fixture)
    const definition = JSON.parse(readFileSync(path, 'utf8'))
    const result = spawnSync(process.execPath, [validator, '--fixture', path], {
      cwd: root,
      encoding: 'utf8',
    })
    assert.notEqual(result.status, 0)
    const output = `${result.stdout}\n${result.stderr}`
    assert.match(output, new RegExp(`\\[${definition.expected_rule}\\]`))
    for (const field of ['path=', 'actual=', 'expected=', 'source=', 'fix=']) {
      assert.match(output, new RegExp(field))
    }
  })
}
