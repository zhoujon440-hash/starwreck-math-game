import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '../..')
const validator = resolve(root, 'scripts/validate-character-assets.mjs')
const fixtureRoot = resolve(root, 'tests/fixtures/baseline-negative/characters')

test('formal character assets pass the Issue #8 gate', () => {
  const output = execFileSync(process.execPath, [validator], { cwd: root, encoding: 'utf8' })
  assert.match(output, /CHARACTER_ASSETS_OK/)
  assert.match(output, /xingyu=5/)
  assert.match(output, /qima=9/)
})

for (const fixture of readdirSync(fixtureRoot).filter((name) => name.endsWith('.json')).sort()) {
  test(`negative fixture fails with a complete diagnostic: ${fixture}`, () => {
    const path = resolve(fixtureRoot, fixture)
    const result = spawnSync(process.execPath, [validator, '--fixture', path], {
      cwd: root,
      encoding: 'utf8',
    })
    assert.notEqual(result.status, 0)
    const output = `${result.stdout}\n${result.stderr}`
    const definition = JSON.parse(
      execFileSync(process.execPath, ['-e', `process.stdout.write(require("fs").readFileSync(${JSON.stringify(path)},"utf8"))`], {
        encoding: 'utf8',
      }),
    )
    assert.match(output, new RegExp(`\\[${definition.expected_rule.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`))
    for (const field of ['path=', 'actual=', 'expected=', 'source=', 'fix=']) assert.match(output, new RegExp(field))
  })
}
