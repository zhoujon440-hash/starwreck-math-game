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
import {
  validateExpandedForbidden,
  validateStrictCatalogSources,
} from "../../scripts/baseline-strict-validation.mjs";

test("the accepted baseline passes every aggregate rule", () => {
  const result = runAll(loadBaseline());
  assert.deepEqual(result.issues, []);
  assert.equal(result.ruleCount, 634);
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

test("all 488 assets resolve to unique formal rows with authoritative spot values", () => {
  const snapshot = loadBaseline();
  assert.equal(snapshot.catalog.assets.length, 488);
  assert.equal(new Set(snapshot.catalog.assets.map((asset) => asset.formal_row_id)).size, 488);
  const result = validateStrictCatalogSources(snapshot);
  assert.deepEqual(result.issues, []);

  const byId = new Map(snapshot.catalog.assets.map((asset) => [asset.catalog_id, asset]));
  assert.deepEqual(
    {
      name: byId.get("SCN-001").name,
      maturity: byId.get("SCN-001").maturity,
    },
    { name: "L00 拾光号坠落带", maturity: "已完成概念设计" },
  );
  assert.deepEqual(
    { name: byId.get("PROP-001").name, maturity: byId.get("PROP-001").maturity },
    { name: "磁力手套", maturity: "已确认基准" },
  );
  assert.deepEqual(
    { name: byId.get("MECH-001").name, maturity: byId.get("MECH-001").maturity },
    { name: "资源网络", maturity: "已确认冻结" },
  );
  assert.deepEqual(
    { name: byId.get("UI-001").name, confirmation: byId.get("UI-001").confirmation_status },
    { name: "标题/主菜单", confirmation: "已确认冻结" },
  );
  for (const id of ["FX-001", "DANGER-001", "SCENE-G01-001"]) {
    assert.ok(byId.get(id).formal_row_id, `${id} lacks a formal row locator`);
  }
  assert.equal(snapshot.catalog.assets.filter((asset) => asset.domain === "g01_addition").length, 33);
});
