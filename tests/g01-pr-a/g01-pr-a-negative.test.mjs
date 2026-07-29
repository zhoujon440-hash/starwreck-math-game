import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '../..')
const fixtures = readdirSync(resolve(import.meta.dirname, '../fixtures/g01-pr-a-negative'))
  .filter((name) => name.endsWith('.json'))
  .sort()

for (const fixture of fixtures) {
  test(`rejects ${basename(fixture, '.json')}`, () => {
    const result = spawnSync(
      process.execPath,
      [
        'scripts/validate-g01-pr-a.mjs',
        `--fixture=tests/fixtures/g01-pr-a-negative/${fixture}`,
      ],
      { cwd: root, encoding: 'utf8' },
    )
    assert.notEqual(result.status, 0, `${fixture} unexpectedly passed`)
    assert.match(
      `${result.stdout}\n${result.stderr}`,
      /PRA-[A-Z]+-[0-9]{3}/,
      `${fixture} did not report a PR-A rule ID`,
    )
  })
}
