import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { test } from "node:test";

const fixtureRoot = resolve("tests/fixtures/baseline-negative");
const fixtures = readdirSync(fixtureRoot)
  .filter((name) => name.endsWith(".json"))
  .sort();

test("all forty-six required destructive fixtures exist", () => {
  assert.equal(fixtures.length, 46);
});

for (const filename of fixtures) {
  const fixturePath = join(fixtureRoot, filename);
  const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));
  test(`${fixture.id} exits non-zero and identifies ${fixture.expected_rule}`, () => {
    const result = spawnSync(
      process.execPath,
      ["scripts/validate-baseline.mjs", "--fixture", fixturePath],
      { encoding: "utf8" },
    );
    const output = `${result.stdout}\n${result.stderr}`;
    assert.equal(result.status, 1, output);
    assert.match(output, new RegExp(`\\[${fixture.expected_rule}\\]`), output);
    assert.match(output, /actual:/, output);
    assert.match(output, /expected:/, output);
    assert.match(output, /source:/, output);
    assert.match(output, /action:/, output);
    for (const context of fixture.expected_context ?? []) {
      assert.match(output, new RegExp(context), output);
    }
  });
}
