import { createHash } from "node:crypto";
import {
  closeSync,
  createReadStream,
  existsSync,
  openSync,
  readFileSync,
  readSync,
  statSync,
} from "node:fs";
import { resolve } from "node:path";
import {
  formatIssue,
  loadBaseline,
  validateSourceLayer,
} from "./baseline-validation-lib.mjs";

const root = resolve(import.meta.dirname, "..");

const expectedPackageIds = [
  "PKG-PRODUCT-PLAN-V1.1",
  "PKG-G02-SCRIPT-FREEZE-V1.0",
  "PKG-CHARACTERS-V2.1",
  "PKG-SCENES-V1.0",
  "PKG-PROPS-V3.0",
  "PKG-MECH-V2.0",
  "PKG-UI-V2.0",
  "PKG-G02-G13-HOPA-V2.0",
  "PKG-G02-DATA-V2.1",
  "PKG-G03-DATA-V2.1",
  "PKG-HOPA-FX001-V1.0",
  "PKG-G01-V3.0",
  "PKG-G02-G13-DATA-V2.1",
  "PKG-FX-V2.0",
  "PKG-DANGER-V2.0",
  "DOC-G-S2-D01-V1.0",
  "DOC-G-S2-CHG-01-V1.0",
  "DOC-G-CHAR-01-V1.0",
  "DOC-G-ANIM-01-V1.0",
];

const requiredModules = [
  "场景流程",
  "热点清单",
  "找物清单",
  "背包道具流转",
  "对话脚本",
  "场景状态机",
  "三级提示",
  "存档与恢复",
  "程序变量",
  "资产映射",
];

function fail(message) {
  throw new Error(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function readJson(path) {
  return JSON.parse(readFileSync(resolve(root, path), "utf8"));
}

function unique(values, label) {
  assert(new Set(values).size === values.length, `${label} must be unique`);
}

function exactSet(actual, expected, label) {
  unique(actual, label);
  assert(
    actual.length === expected.length &&
      expected.every((value) => actual.includes(value)),
    `${label} mismatch`,
  );
}

async function sha256(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

function sha256CanonicalText(path) {
  const bytes = readFileSync(path);
  const normalized = Buffer.from(
    bytes.toString("latin1").replace(/\r\n?/g, "\n"),
    "latin1",
  );
  return createHash("sha256").update(normalized).digest("hex");
}

function readPrefix(path, length = 128) {
  const handle = openSync(path, "r");
  try {
    const buffer = Buffer.alloc(length);
    const bytesRead = readSync(handle, buffer, 0, length, 0);
    return buffer.subarray(0, bytesRead).toString("utf8");
  } finally {
    closeSync(handle);
  }
}

async function verifyPackage(packageRecord) {
  const path = resolve(root, packageRecord.repository_path);
  assert(existsSync(path), `missing imported package: ${packageRecord.repository_path}`);
  const firstBytes = readPrefix(path);
  if (firstBytes.startsWith("version https://git-lfs.github.com/spec/v1")) {
    const pointer = readFileSync(path, "utf8");
    assert(
      pointer.includes(`oid sha256:${packageRecord.expected_sha256}`),
      `LFS pointer oid mismatch: ${packageRecord.filename}`,
    );
    if (process.env.REQUIRE_LFS_OBJECTS === "1") {
      fail(`LFS object was not downloaded: ${packageRecord.filename}`);
    }
    return;
  }
  assert(
    statSync(path).size === packageRecord.expected_bytes,
    `package byte size mismatch: ${packageRecord.filename}`,
  );
  assert(
    (await sha256(path)) === packageRecord.expected_sha256,
    `package SHA-256 mismatch: ${packageRecord.filename}`,
  );
}

function exactIdRange(records, field, prefix, count, label) {
  exactSet(
    records.map((item) => item[field]),
    Array.from({ length: count }, (_, index) =>
      `${prefix}-${String(index + 1).padStart(3, "0")}`),
    label,
  );
}

function validateRawCatalog(path, prefix, count) {
  const text = readFileSync(resolve(root, path), "utf8").replace(/^\uFEFF/, "");
  const ids = [...text.matchAll(new RegExp(`^${prefix}-\\d{3},`, "gm"))].map(
    (match) => match[0].slice(0, -1),
  );
  exactSet(
    ids,
    Array.from({ length: count }, (_, index) =>
      `${prefix}-${String(index + 1).padStart(3, "0")}`),
    `${prefix} raw catalog ids`,
  );
}

const packages = readJson("source_packages/manifests/source-packages.json");
assert(packages.issue === 6, "source package manifest must belong to Issue #6");
exactSet(
  packages.imported.map((item) => item.package_id),
  expectedPackageIds,
  "formal package ids",
);
assert(
  Array.isArray(packages.missing_required) && packages.missing_required.length === 0,
  "P0-A merge gate requires missing_required.length === 0",
);
for (const item of packages.imported) {
  assert(item.status === "imported_verified", `${item.package_id} status is not verified`);
  assert(item.storage === "git_lfs", `${item.package_id} must use Git LFS`);
  assert(item.expected_bytes === item.observed_bytes, `${item.package_id} byte facts differ`);
  assert(
    item.expected_sha256 === item.observed_sha256,
    `${item.package_id} SHA facts differ`,
  );
  await verifyPackage(item);
}

const missing = readJson("source_packages/manifests/missing-sources.json");
assert(missing.issue === 6, "missing source report must belong to Issue #6");
assert(missing.missing_count === 0, "P0-A merge gate requires missing_count === 0");
assert(Array.isArray(missing.items) && missing.items.length === 0, "missing items must be []");

const extractionStats = readJson(
  "source_packages/manifests/docx-extraction-stats.json",
);
assert(extractionStats.documents.length === 39, "expected 39 extracted DOCX documents");
assert(
  extractionStats.all_available_documents_full_text_captured === true,
  "all imported DOCX text must be captured",
);
for (const document of extractionStats.documents) {
  assert(document.coverage_ratio === 1, `DOCX coverage failed: ${document.source_entry}`);
  assert(
    document.source_text_characters === document.captured_text_characters,
    `DOCX character parity failed: ${document.source_entry}`,
  );
}

const extracted = readJson("source_packages/manifests/extracted-files.json");
assert(extracted.count === extracted.files.length, "extracted file count mismatch");
assert(extracted.count >= 351, "expected at least 351 searchable extracted outputs");
for (const item of extracted.files) {
  const path = resolve(root, item.output_path);
  assert(existsSync(path), `missing extracted output: ${item.output_path}`);
  assert(
    ["canonical_lf", "raw_bytes"].includes(item.output_hash_mode),
    `unknown output hash mode: ${item.output_path}`,
  );
  const outputSha =
    item.output_hash_mode === "canonical_lf"
      ? sha256CanonicalText(path)
      : await sha256(path);
  assert(outputSha === item.output_sha256, `output SHA mismatch: ${item.output_path}`);
}

const chapters = Array.from(
  { length: 13 },
  (_, index) => `G${String(index + 1).padStart(2, "0")}`,
);
const storyIndex = readJson("docs/story/G01-G13/index.json");
assert(storyIndex.length === 13, "G01-G13 story index must contain 13 chapters");
exactSet(
  storyIndex.map((item) => item.chapter),
  chapters,
  "story chapters",
);
for (const record of storyIndex) {
  assert(record.status === "imported_verified", `${record.chapter} story is not verified`);
  assert(record.coverage_ratio === 1, `${record.chapter} story coverage is not 100%`);
  assert(existsSync(resolve(root, record.path)), `${record.chapter} Markdown is missing`);
}
assert(
  storyIndex.find((item) => item.chapter === "G01")?.world_star_core_count === 0,
  "G01 story index must freeze world_star_core_count at 0",
);

const dataIndex = readJson("data/source/index.json");
assert(dataIndex.length === 13, "G01-G13 data index must contain 13 chapters");
exactSet(
  dataIndex.map((item) => item.chapter),
  chapters,
  "data chapters",
);
for (const record of dataIndex) {
  assert(record.status === "imported_verified", `${record.chapter} data is not verified`);
  assert(record.files === 22, `${record.chapter} must index workbook + 20 modules + MasterData`);
  const base =
    record.chapter === "G01"
      ? "data/source/g01"
      : `data/source/g02-g13/${record.chapter}`;
  const chapterIndex = readJson(`${base}/index.json`);
  assert(chapterIndex.length === 22, `${record.chapter} file index must contain 22 entries`);
  for (const moduleName of requiredModules) {
    assert(existsSync(resolve(root, `${base}/csv/${moduleName}.csv`)), `${record.chapter} missing ${moduleName}.csv`);
    const moduleJson = readJson(`${base}/json/${moduleName}.json`);
    assert(Array.isArray(moduleJson) && moduleJson.length > 0, `${record.chapter} ${moduleName}.json is not queryable`);
  }
  const master = readJson(`${base}/json/${record.chapter}_MasterData.json`);
  assert(master.chapter === record.chapter, `${record.chapter} MasterData chapter mismatch`);
  assert(
    requiredModules.every(
      (moduleName) =>
        Array.isArray(master.modules?.[moduleName]) &&
        master.modules[moduleName].length > 0,
    ),
    `${record.chapter} MasterData modules are incomplete`,
  );
}
for (const chapter of ["G04", "G05"]) {
  assert(
    dataIndex.find((item) => item.chapter === chapter)?.structured_data_origin ===
      "deterministic_formal_workbook_extraction",
    `${chapter} must disclose its formal-workbook transformation`,
  );
}
assert(
  dataIndex.find((item) => item.chapter === "G01")?.world_star_core_count === 0,
  "G01 data index must freeze world_star_core_count at 0",
);
const g01Variables = readJson("data/source/g01/json/程序变量.json");
assert(
  g01Variables.some(
    (item) =>
      item.变量名 === "world_star_core_count" &&
      String(item.默认值) === "0" &&
      item.约束 === "保持0",
  ),
  "G01 world_star_core_count source rule must remain 0",
);

const boundaryPath = "docs/baseline/source_text/g01/G02_OPENING_BOUNDARY_V2.2.md";
assert(existsSync(resolve(root, boundaryPath)), "G02 opening boundary V2.2 is missing");
const boundary = readFileSync(resolve(root, boundaryPath), "utf8");
assert(
  boundary.includes("04_G02开场边界修订/星骸拾荒者_G02开场边界修订_V2.2.docx"),
  "G02 boundary provenance must point inside G01 V3.0",
);

const characters = readJson("data/source/catalogs/characters-71.json");
assert(characters.length === 71, "character catalog must contain 71 rows");
exactIdRange(characters, "catalog_id", "CAT-CHAR", 71, "internal character catalog ids");
exactIdRange(characters, "source_asset_id", "CHAR", 71, "character source registry ids");
assert(
  characters.every(
    (item) =>
      item.design_master_status === "complete" &&
      item.three_view_status === "complete" &&
      item.runtime_portrait_status === "not_produced" &&
      item.runtime_scene_asset_status === "not_produced",
  ),
  "character master and runtime statuses must remain separated",
);
assert(
  characters.filter((item) => item.official_id !== null).length === 1 &&
    characters.find((item) => item.character_name === "七码")?.official_id === "EDU-0077",
  "only 七码 may expose the confirmed official id EDU-0077",
);
assert(
  characters.find((item) => item.character_name === "星宇")?.official_id === null,
  "星宇 internal catalog id must not be presented as an official id",
);

const catalog = readJson("data/source/catalogs/asset-catalog-488.json");
const expectedDomains = {
  character: 71,
  scene: 91,
  prop: 46,
  mechanism: 47,
  ui: 83,
  fx: 41,
  danger: 76,
  g01_addition: 33,
};
assert(catalog.total === 488, "asset catalog total must be 488");
assert(catalog.assets.length === 488, "asset catalog must contain 488 rows");
assert(
  Object.entries(expectedDomains).every(
    ([domain, count]) => catalog.domain_counts[domain] === count,
  ) && Object.keys(catalog.domain_counts).length === Object.keys(expectedDomains).length,
  "asset domain counts do not match the confirmed 488 breakdown",
);
unique(catalog.assets.map((item) => item.catalog_id), "asset catalog ids");
assert(
  catalog.assets.every(
    (item) => item.runtime_asset === false && item.acceptance_asset === false,
  ),
  "design/production masters must not be labelled runtime or acceptance assets",
);
exactIdRange(catalog.assets.filter((item) => item.domain === "scene"), "official_id", "SCN", 91, "scene ids");
exactIdRange(catalog.assets.filter((item) => item.domain === "prop"), "official_id", "PROP", 46, "prop ids");
exactIdRange(catalog.assets.filter((item) => item.domain === "mechanism"), "official_id", "MECH", 47, "mechanism ids");
exactIdRange(catalog.assets.filter((item) => item.domain === "ui"), "official_id", "UI", 83, "UI ids");
exactIdRange(catalog.assets.filter((item) => item.domain === "fx"), "official_id", "FX", 41, "FX ids");
exactIdRange(catalog.assets.filter((item) => item.domain === "danger"), "official_id", "DANGER", 76, "DANGER ids");
const g01Assets = catalog.assets.filter((item) => item.domain === "g01_addition");
assert(
  g01Assets.length === 33 &&
    g01Assets.every(
      (item) =>
        typeof item.official_id === "string" &&
        item.official_id.length > 0 &&
        typeof item.name === "string" &&
        item.name.length > 0 &&
        item.source_package === "PKG-G01-V3.0",
    ),
  "G01 33 assets must use the formal V3.0 catalog, not empty slots",
);
assert(
  catalog.assets
    .filter((item) => item.domain === "fx")
    .every((item) => item.source_package === "PKG-FX-V2.0" && item.design_board),
  "FX-001—041 must use formal V2.0 source paths",
);
assert(
  catalog.assets
    .filter((item) => item.domain === "danger")
    .every((item) => item.source_package === "PKG-DANGER-V2.0" && item.design_board),
  "DANGER-001—076 must use formal V2.0 source paths",
);

validateRawCatalog("data/source/catalogs/raw/SCENE-91_V1.0.csv", "SCN", 91);
validateRawCatalog("data/source/catalogs/raw/PROP-46_V3.0.csv", "PROP", 46);
validateRawCatalog("data/source/catalogs/raw/MECH-47_V2.0.csv", "MECH", 47);
validateRawCatalog("data/source/catalogs/raw/UI-83_V2.0.csv", "UI", 83);

const substitution = readJson("source_packages/manifests/substitution-map.json");
for (const current of [
  "技能与装备效果HOPA正式包 V2.0",
  "危险视觉HOPA正式包 V2.0",
  "G01整合正式包 V3.0",
  "G-S2-D01 V1.0",
]) {
  assert(
    substitution.rules.find((item) => item.current === current)?.status ===
      "current_source_imported",
    `${current} substitution status is stale`,
  );
}

const legacy = readJson("archive/legacy/manifest.json");
for (const item of legacy.items.filter((entry) => entry.repository_path)) {
  const path = resolve(root, item.repository_path);
  assert(existsSync(path), `missing isolated legacy file: ${item.repository_path}`);
  const pointerOrFile = readPrefix(path);
  if (pointerOrFile.startsWith("version https://git-lfs.github.com/spec/v1")) {
    const pointer = readFileSync(path, "utf8");
    assert(pointer.includes(`oid sha256:${item.sha256}`), `legacy LFS oid mismatch: ${item.name}`);
  } else {
    assert((await sha256(path)) === item.sha256, `legacy SHA mismatch: ${item.name}`);
  }
}

const strictSourceResult = validateSourceLayer(loadBaseline(root));
assert(
  strictSourceResult.issues.length === 0,
  `strict source cross-validation failed:\n${strictSourceResult.issues
    .map(formatIssue)
    .join("\n")}`,
);

console.log(
  JSON.stringify({
    importedPackages: packages.imported.length,
    missingRequired: packages.missing_required.length,
    missingCount: missing.missing_count,
    extractedFiles: extracted.count,
    extractedDocx: extractionStats.documents.length,
    storyChapters: storyIndex.length,
    dataChapters: dataIndex.length,
    characters: characters.length,
    assets: catalog.assets.length,
    fx: catalog.domain_counts.fx,
    danger: catalog.domain_counts.danger,
    status: "ok",
  }),
);
