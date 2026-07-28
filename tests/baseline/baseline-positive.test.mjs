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

test("the accepted baseline passes every aggregate rule", () => {
  const result = runAll(loadBaseline());
  assert.deepEqual(result.issues, []);
  assert.equal(result.ruleCount, 630);
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
