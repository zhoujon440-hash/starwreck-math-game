import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { test } from "node:test";
import {
  loadBaseline,
  runAll,
  validateCatalogs,
  validateForbiddenTerms,
  validateSchemasAndHopa,
  validateStory,
} from "../../scripts/baseline-validation-lib.mjs";
import { validateExpandedForbidden } from "../../scripts/baseline-strict-validation.mjs";

test("the accepted baseline passes every aggregate rule", () => {
  const result = runAll(loadBaseline());
  assert.deepEqual(result.issues, []);
  assert.equal(result.ruleCount, 632);
});

test("catalog, story, schema and technology sections pass independently", () => {
  const snapshot = loadBaseline();
  for (const validator of [
    validateCatalogs,
    validateStory,
    validateSchemasAndHopa,
    validateForbiddenTerms,
  ]) {
    assert.deepEqual(validator(snapshot).issues, []);
  }
});

test("ten HOPA modules plus MasterData have checked-in schemas", () => {
  const files = readdirSync("schemas/hopa").filter((name) => name.endsWith(".schema.json"));
  assert.equal(files.length, 11);
});

test("prohibitive rules and isolated history pass semantic scanning", () => {
  const snapshot = loadBaseline();
  const bossProhibition = ["禁止出现", "Boss", "战。"].join("");
  const legacyProhibition = ["主角固定为星宇；旧名小", "砾只允许存在于legacy。"].join("");
  snapshot.syntheticCurrentExecutionFiles.push(
    { path: "docs/plan/prohibition-example.md", content: bossProhibition },
    { path: "docs/baseline/00_SOURCE_OF_TRUTH.md", content: legacyProhibition },
    { path: "docs/review/BASELINE_CONFLICT_REPORT.md", content: "historical conflict fixture" },
    { path: "docs/baseline/source_text/example.md", content: "formal source fixture" },
    { path: "tests/fixtures/baseline-negative/example.md", content: "negative fixture" },
  );
  assert.deepEqual(validateExpandedForbidden(snapshot).issues, []);
});
