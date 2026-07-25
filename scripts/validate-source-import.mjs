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

const root = resolve(import.meta.dirname, "..");

function fail(message) {
  throw new Error(message);
}

function readJson(path) {
  return JSON.parse(readFileSync(resolve(root, path), "utf8"));
}

function assert(condition, message) {
  if (!condition) fail(message);
}

async function sha256(path) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
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

function unique(values, label) {
  assert(new Set(values).size === values.length, `${label} must be unique`);
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

const packages = readJson("source_packages/manifests/source-packages.json");
assert(packages.issue === 6, "source package manifest must belong to Issue #6");
assert(packages.imported.length === 11, "expected 11 verified imported packages");
assert(packages.missing_required.length === 9, "expected 9 explicit missing sources");
unique(packages.imported.map((item) => item.package_id), "package ids");
unique(packages.missing_required.map((item) => item.source_id), "missing source ids");
for (const item of packages.imported) {
  assert(item.status === "imported_verified", `${item.package_id} status is not verified`);
  assert(item.expected_bytes === item.observed_bytes, `${item.package_id} byte facts differ`);
  assert(
    item.expected_sha256 === item.observed_sha256,
    `${item.package_id} SHA facts differ`,
  );
  await verifyPackage(item);
}

const missing = readJson("source_packages/manifests/missing-sources.json");
assert(missing.missing_count === 9, "missing source manifest count must be 9");
assert(
  missing.items.some((item) => item.source_id === "PKG-G01-V3.0"),
  "G01 V3.0 missing source must be explicit",
);
assert(
  missing.items.some((item) => item.source_id === "PKG-G02-G13-DATA-V2.1"),
  "complete G02-G13 V2.1 data package gap must be explicit",
);

const extractionStats = readJson(
  "source_packages/manifests/docx-extraction-stats.json",
);
assert(extractionStats.documents.length === 29, "expected 29 extracted DOCX documents");
assert(
  extractionStats.all_available_documents_full_text_captured === true,
  "all available DOCX text must be captured",
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
for (const item of extracted.files) {
  const path = resolve(root, item.output_path);
  assert(existsSync(path), `missing extracted output: ${item.output_path}`);
  assert((await sha256(path)) === item.output_sha256, `output SHA mismatch: ${item.output_path}`);
}

const storyIndex = readJson("docs/story/G01-G13/index.json");
assert(storyIndex.length === 13, "G01-G13 story index must contain 13 chapters");
unique(storyIndex.map((item) => item.chapter), "story chapters");
assert(
  storyIndex.find((item) => item.chapter === "G01")?.status === "missing_formal_source",
  "G01 must remain an explicit missing-source record",
);
for (let number = 2; number <= 13; number += 1) {
  const chapter = `G${String(number).padStart(2, "0")}`;
  const record = storyIndex.find((item) => item.chapter === chapter);
  assert(record?.status === "imported_verified", `${chapter} HOPA text is not verified`);
  assert(record?.coverage_ratio === 1, `${chapter} HOPA text coverage is not 100%`);
  assert(existsSync(resolve(root, record.path)), `${chapter} Markdown is missing`);
}

const dataIndex = readJson("data/source/index.json");
assert(dataIndex.length === 13, "G01-G13 data index must contain 13 chapters");
for (const chapter of ["G02", "G03"]) {
  assert(
    dataIndex.find((item) => item.chapter === chapter)?.status === "imported_verified",
    `${chapter} V2.1 data must be imported`,
  );
}
for (const chapter of ["G01", "G04", "G05", "G06", "G07", "G08", "G09", "G10", "G11", "G12", "G13"]) {
  assert(
    dataIndex.find((item) => item.chapter === chapter)?.status === "missing_formal_source",
    `${chapter} data gap must remain explicit`,
  );
}

const characters = readJson("data/source/catalogs/characters-71.json");
assert(characters.length === 71, "character catalog must contain 71 rows");
const characterIds = characters.map((item) => item["资产ID"]);
unique(characterIds, "character ids");
for (let index = 1; index <= 71; index += 1) {
  assert(
    characterIds.includes(`CHAR-${String(index).padStart(3, "0")}`),
    `missing CHAR-${String(index).padStart(3, "0")}`,
  );
}
assert(characters[0]["人物名称"] === "星宇", "CHAR-001 must be 星宇");

const catalog = readJson("data/source/catalogs/asset-catalog-488.json");
const expectedDomains = {
  character: 71,
  scene: 91,
  prop: 46,
  fx: 41,
  mechanism: 47,
  ui: 83,
  danger: 76,
  g01_addition: 33,
};
assert(catalog.total === 488, "asset catalog total must be 488");
assert(catalog.assets.length === 488, "asset catalog must contain 488 rows");
assert(
  JSON.stringify(catalog.domain_counts) === JSON.stringify(expectedDomains),
  "asset domain counts do not match the confirmed 488 breakdown",
);
unique(catalog.assets.map((item) => item.catalog_id), "asset catalog ids");
assert(
  catalog.assets.every((item) => item.runtime_asset === false),
  "source catalog entries must not be labelled runtime assets",
);
assert(
  catalog.assets
    .filter((item) => item.domain === "g01_addition")
    .every((item) => item.official_id === null && item.name === null),
  "G01 missing-source slots must not invent official ids or names",
);

for (const master of [
  "docs/baseline/production-masters/hopa-fx001/HOPA核心循环_冻结版.png",
  "docs/baseline/production-masters/hopa-fx001/HOPA场景分层与热点架构.png",
  "docs/baseline/production-masters/hopa-fx001/HOPA技术模块架构.png",
  "docs/baseline/production-masters/hopa-fx001/FX-001星宇瞬移_HOPA交互流程.png",
]) {
  assert(existsSync(resolve(root, master)), `missing design/production master: ${master}`);
  assert(statSync(resolve(root, master)).size > 0, `empty design/production master: ${master}`);
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

console.log(
  JSON.stringify({
    importedPackages: packages.imported.length,
    explicitMissingSources: packages.missing_required.length,
    extractedFiles: extracted.count,
    extractedDocx: extractionStats.documents.length,
    storyChaptersIndexed: storyIndex.length,
    characters: characters.length,
    assets: catalog.assets.length,
    status: "ok",
  }),
);
