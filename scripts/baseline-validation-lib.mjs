import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyStrictFixture,
  validateExpandedForbidden,
  validateStarCoreContracts,
  validateStrictHopa,
  validateStrictSource,
} from "./baseline-strict-validation.mjs";

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export const MODULE_SCHEMAS = {
  场景流程: "scene-flow.schema.json",
  热点清单: "hotspots.schema.json",
  找物清单: "hidden-objects.schema.json",
  背包道具流转: "inventory-flow.schema.json",
  对话脚本: "dialogue.schema.json",
  场景状态机: "scene-state.schema.json",
  三级提示: "hints.schema.json",
  存档与恢复: "save-recovery.schema.json",
  程序变量: "variables.schema.json",
  资产映射: "asset-mapping.schema.json",
};

export function readJson(root, path) {
  return JSON.parse(readFileSync(join(root, path), "utf8"));
}

export function sha256(path) {
  const hash = createHash("sha256");
  hash.update(readFileSync(path));
  return hash.digest("hex");
}

export function issue(ruleId, path, actual, expected, source, version, action) {
  return { ruleId, path, actual, expected, source, version, action };
}

export function formatIssue(item) {
  return [
    `[${item.ruleId}] ${item.path}`,
    `  actual: ${JSON.stringify(item.actual)}`,
    `  expected: ${JSON.stringify(item.expected)}`,
    `  source: ${item.source} (${item.version})`,
    `  action: ${item.action}`,
  ].join("\n");
}

export function printResult(section, issues, ruleCount) {
  if (issues.length === 0) {
    console.log(`PASS ${section}: ${ruleCount} rules`);
    return;
  }
  console.error(`FAIL ${section}: ${issues.length} violation(s) across ${ruleCount} rules`);
  for (const item of issues) console.error(formatIssue(item));
}

export function loadBaseline(root = REPO_ROOT) {
  const chapters = {};
  for (let number = 1; number <= 13; number += 1) {
    const chapter = `G${String(number).padStart(2, "0")}`;
    const base =
      number === 1 ? "data/source/g01" : `data/source/g02-g13/${chapter}`;
    chapters[chapter] = readJson(root, `${base}/json/${chapter}_MasterData.json`);
  }
  return {
    root,
    policy: readJson(root, "config/baseline-policy.json"),
    sourceManifest: readJson(root, "source_packages/manifests/source-packages.json"),
    missingSources: readJson(root, "source_packages/manifests/missing-sources.json"),
    extractedFiles: readJson(root, "source_packages/manifests/extracted-files.json"),
    substitutions: readJson(root, "source_packages/manifests/substitution-map.json"),
    legacy: readJson(root, "archive/legacy/manifest.json"),
    characters: readJson(root, "data/source/catalogs/characters-71.json"),
    catalog: readJson(root, "data/source/catalogs/asset-catalog-488.json"),
    storyIndex: readJson(root, "docs/story/G01-G13/index.json"),
    dataIndex: readJson(root, "data/source/index.json"),
    g02Boundary: readFileSync(
      join(root, "docs/baseline/source_text/g01/G02_OPENING_BOUNDARY_V2.2.md"),
      "utf8",
    ),
    packageJson: readJson(root, "package.json"),
    chapters,
    syntheticCurrentExecutionFiles: [],
  };
}

export function applyFixture(snapshot, fixturePath) {
  if (!fixturePath) return snapshot;
  const fixture = JSON.parse(readFileSync(resolve(fixturePath), "utf8"));
  switch (fixture.mutation) {
    case "missing-prop":
      snapshot.catalog.assets = snapshot.catalog.assets.filter(
        (asset) => asset.official_id !== "PROP-023",
      );
      break;
    case "duplicate-fx":
      snapshot.catalog.assets.find((asset) => asset.official_id === "FX-002").official_id =
        "FX-001";
      break;
    case "wrong-qima-official-id":
      snapshot.characters.find((character) => character.character_name === "七码").official_id =
        "CHAR-002";
      break;
    case "replace-xingyu-with-legacy-name":
      snapshot.characters.find((character) => character.character_name === "星宇").character_name =
        "小砾";
      break;
    case "world-star-core-one":
      snapshot.dataIndex.find((chapter) => chapter.chapter === "G01").world_star_core_count = 1;
      break;
    case "missing-g01-handoff":
      delete snapshot.dataIndex.find((chapter) => chapter.chapter === "G01")
        .g01_handoff_to_g02;
      break;
    case "g02-repeats-tutorial":
      snapshot.policy.story.g02_effective_opening =
        "星宇首次登场、七码恢复与基础HOPA教学";
      break;
    case "illegal-scene-state":
      snapshot.chapters.G01.modules["场景状态机"][0]["状态码"] = "S7";
      break;
    case "critical-item-consumed-on-error":
      applyStrictFixture(snapshot, fixture.mutation);
      break;
    case "missing-danger-safe-recovery":
      applyStrictFixture(snapshot, "danger-missing-safe-node");
      break;
    case "design-master-marked-runtime-ready":
      snapshot.catalog.assets[0].runtime_asset = true;
      break;
    case "unity-current-runtime":
      snapshot.dataIndex[0].runtime_technology = "Unity";
      break;
    case "boss-current-execution-term":
      snapshot.syntheticCurrentExecutionFiles.push({
        path: "src/negative-fixture.ts",
        content: "export const Boss = { implementation: true };",
      });
      break;
    case "modified-source-sha":
      snapshot.sourceManifest.imported[0].observed_sha256 = "0".repeat(64);
      break;
    default:
      if (!applyStrictFixture(snapshot, fixture.mutation)) {
        throw new Error(`unknown negative fixture mutation: ${fixture.mutation}`);
      }
  }
  return snapshot;
}

function expectedSequence(prefix, count) {
  return Array.from(
    { length: count },
    (_, index) => `${prefix}-${String(index + 1).padStart(3, "0")}`,
  );
}

export function validateCatalogs(snapshot) {
  const issues = [];
  let ruleCount = 0;
  const source = "docs/baseline/08_CONFIRMED_BASELINE_V2.md";
  const version = "P0-A confirmed baseline";
  const { characters, catalog, policy } = snapshot;
  const add = (condition, ...args) => {
    ruleCount += 1;
    if (!condition) issues.push(issue(...args));
  };

  add(
    characters.length === 71,
    "CAT-CHAR-COUNT",
    "data/source/catalogs/characters-71.json",
    characters.length,
    71,
    source,
    version,
    "Restore the verified 71-character catalog from the formal V2.1 package.",
  );
  add(
    new Set(characters.map((row) => row.catalog_id)).size === 71,
    "CAT-CHAR-CATALOG-ID-UNIQUE",
    "data/source/catalogs/characters-71.json#/catalog_id",
    characters.length - new Set(characters.map((row) => row.catalog_id)).size,
    0,
    source,
    version,
    "Resolve duplicate internal catalog_id values without inventing official IDs.",
  );
  const fakeOfficial = characters.filter(
    (row) => typeof row.official_id === "string" && /^CHAR-\d{3}$/i.test(row.official_id),
  );
  add(
    fakeOfficial.length === 0,
    "CAT-CHAR-NO-FAKE-OFFICIAL-ID",
    "data/source/catalogs/characters-71.json#/official_id",
    fakeOfficial.map((row) => row.official_id),
    [],
    source,
    version,
    "Set non-official continuous identifiers to catalog_id and official_id to null.",
  );
  for (const [name, officialId] of [
    ["星宇", null],
    ["七码", "EDU-0077"],
  ]) {
    const rows = characters.filter((row) => row.character_name === name);
    add(
      rows.length === 1 && rows[0].official_id === officialId,
      `CAT-CHAR-${name === "星宇" ? "XINGYU" : "QIMA"}-IDENTITY`,
      `data/source/catalogs/characters-71.json#/${name}`,
      rows.map((row) => ({ name: row.character_name, official_id: row.official_id })),
      [{ name, official_id: officialId }],
      "docs/baseline/characters",
      "confirmed",
      `Restore the confirmed identity for ${name}.`,
    );
  }
  add(
    characters.every(
      (row) =>
        row.design_master_status === "complete" && row.three_view_status === "complete",
    ),
    "CAT-CHAR-DESIGN-71-COMPLETE",
    "data/source/catalogs/characters-71.json#/design_status",
    characters.filter(
      (row) =>
        row.design_master_status !== "complete" || row.three_view_status !== "complete",
    ).length,
    0,
    source,
    version,
    "Correct the design/three-view master status from the verified V2.1 package.",
  );
  add(
    characters.every(
      (row) =>
        row.runtime_portrait_status === "not_produced" &&
        row.runtime_scene_asset_status === "not_produced",
    ),
    "CAT-CHAR-RUNTIME-SEPARATE",
    "data/source/catalogs/characters-71.json#/runtime_status",
    characters.filter(
      (row) =>
        row.runtime_portrait_status !== "not_produced" ||
        row.runtime_scene_asset_status !== "not_produced",
    ).length,
    0,
    source,
    version,
    "Keep design-master completion separate from runtime asset production.",
  );

  add(
    catalog.total === 488 && catalog.assets.length === 488,
    "CAT-ASSET-TOTAL",
    "data/source/catalogs/asset-catalog-488.json",
    { declared: catalog.total, actual: catalog.assets.length },
    { declared: 488, actual: 488 },
    source,
    version,
    "Restore the formal multi-source 488-asset catalog.",
  );
  const actualCounts = Object.fromEntries(
    Object.keys(policy.catalog.domain_counts).map((domain) => [
      domain,
      catalog.assets.filter((asset) => asset.domain === domain).length,
    ]),
  );
  add(
    JSON.stringify(actualCounts) === JSON.stringify(policy.catalog.domain_counts),
    "CAT-ASSET-DOMAIN-COUNTS",
    "data/source/catalogs/asset-catalog-488.json#/domain_counts",
    actualCounts,
    policy.catalog.domain_counts,
    source,
    version,
    "Restore the affected domain from its formal source package.",
  );
  const officialIds = catalog.assets
    .map((asset) => asset.official_id)
    .filter((value) => value !== null);
  add(
    new Set(officialIds.map((value) => value.toUpperCase())).size === officialIds.length,
    "CAT-ASSET-OFFICIAL-ID-UNIQUE",
    "data/source/catalogs/asset-catalog-488.json#/official_id",
    officialIds.length - new Set(officialIds.map((value) => value.toUpperCase())).size,
    0,
    source,
    version,
    "Resolve duplicate or case-variant official IDs from the formal catalog.",
  );
  for (const [domain, spec] of Object.entries(policy.catalog.formal_sequences)) {
    const observed = catalog.assets
      .filter((asset) => asset.domain === domain)
      .map((asset) => asset.official_id)
      .sort();
    const expected = expectedSequence(spec.prefix, spec.count);
    add(
      JSON.stringify(observed) === JSON.stringify(expected),
      `CAT-ASSET-${spec.prefix}-CONTINUITY`,
      `data/source/catalogs/asset-catalog-488.json#/${domain}`,
      observed,
      expected,
      source,
      version,
      `Restore the ${spec.prefix} formal sequence; do not invent, duplicate, or renumber IDs.`,
    );
  }
  const g01Assets = catalog.assets.filter((asset) => asset.domain === "g01_addition");
  add(
    g01Assets.length === 33 &&
      g01Assets.every(
        (asset) =>
          asset.official_id &&
          !officialIds
            .filter((id) => !g01Assets.some((item) => item.official_id === id))
            .includes(asset.official_id),
      ),
    "CAT-G01-SPECIALIZED-33",
    "data/source/catalogs/asset-catalog-488.json#/g01_addition",
    g01Assets.length,
    33,
    "PKG-G01-V3.0",
    "V3.0",
    "Restore the 33 formal G01 entries and keep their specialized ID namespaces.",
  );
  const missingProvenance = catalog.assets.filter(
    (asset) =>
      !asset.source_package || !asset.source_entry || !asset.source_sha256,
  );
  add(
    missingProvenance.length === 0,
    "CAT-ASSET-PROVENANCE",
    "data/source/catalogs/asset-catalog-488.json#/assets",
    missingProvenance.map((asset) => asset.catalog_id),
    [],
    source,
    version,
    "Restore package, source entry, and SHA provenance from the importer output.",
  );
  const runtimeReady = catalog.assets.filter((asset) => asset.runtime_asset !== false);
  add(
    runtimeReady.length === 0,
    "CAT-ASSET-MATURITY-SEPARATION",
    "data/source/catalogs/asset-catalog-488.json#/runtime_asset",
    runtimeReady.map((asset) => asset.catalog_id),
    [],
    "docs/baseline/05_ASSET_MATURITY.md",
    "confirmed",
    "Do not promote design/production masters to runtime-ready status.",
  );
  return { issues, ruleCount };
}

export function validateStory(snapshot) {
  const issues = [];
  let ruleCount = 0;
  const add = (condition, ...args) => {
    ruleCount += 1;
    if (!condition) issues.push(issue(...args));
  };
  const source = "docs/baseline/06_G01_G02_BOUNDARY.md";
  const g01Index = snapshot.dataIndex.find((row) => row.chapter === "G01");
  const g01Story = snapshot.storyIndex.find((row) => row.chapter === "G01");
  const g01Scenes = snapshot.chapters.G01.modules["场景流程"];
  add(g01Scenes.length === 8, "STORY-G01-SCENES", "data/source/g01/json/G01_MasterData.json#/modules/场景流程", g01Scenes.length, 8, source, "V2.2/V3.0", "Restore the eight-scene G01 formal data.");
  add(snapshot.dataIndex.length === 13 && snapshot.storyIndex.length === 13, "STORY-CHAPTER-INDEX", "data/source/index.json", { data: snapshot.dataIndex.length, story: snapshot.storyIndex.length }, { data: 13, story: 13 }, source, "confirmed", "Restore complete G01-G13 indexes.");
  add(g01Index?.g01_chapter_complete === true && g01Story?.g01_chapter_complete === true, "STORY-G01-COMPLETE", "G01 index flags", { data: g01Index?.g01_chapter_complete, story: g01Story?.g01_chapter_complete }, { data: true, story: true }, source, "V3.0", "Restore the confirmed G01 completion flags.");
  add(g01Index?.g01_handoff_to_g02 === true && g01Story?.g01_handoff_to_g02 === true, "STORY-G01-HANDOFF", "G01 index flags", { data: g01Index?.g01_handoff_to_g02, story: g01Story?.g01_handoff_to_g02 }, { data: true, story: true }, source, "V2.2/V3.0", "Restore the explicit G01-to-G02 handoff.");
  add(g01Index?.world_star_core_count === 0 && g01Story?.world_star_core_count === 0, "STORY-G01-STAR-CORE-ZERO", "G01 index flags", { data: g01Index?.world_star_core_count, story: g01Story?.world_star_core_count }, { data: 0, story: 0 }, source, "confirmed", "G01 is a prologue; restore world_star_core_count to zero.");
  const g01Text = JSON.stringify(snapshot.chapters.G01);
  add(!/(获得|取得|拾取|新增).{0,8}星核/.test(g01Text), "STORY-G01-NO-STAR-CORE-AWARD", "data/source/g01/json/G01_MasterData.json", "star-core award match", "none", source, "confirmed", "Remove any G01 star-core award and retain the prologue boundary.");

  const boundary = snapshot.g02Boundary;
  const opening = snapshot.policy.story.g02_effective_opening;
  add(boundary.includes("G02不再重复这些内容") && boundary.includes("旧屏幕谷外缘交接"), "STORY-G02-V2.2-AUTHORITY", "docs/baseline/source_text/g01/G02_OPENING_BOUNDARY_V2.2.md", { noRepeat: boundary.includes("G02不再重复这些内容"), opening: boundary.includes("旧屏幕谷外缘交接") }, { noRepeat: true, opening: true }, source, "V2.2", "Restore the exact V2.2 boundary extraction from PKG-G01-V3.0.");
  add(opening === "旧屏幕谷外缘交接", "STORY-G02-EFFECTIVE-OPENING", "config/baseline-policy.json#/story/g02_effective_opening", opening, "旧屏幕谷外缘交接", source, "V2.2", "Set the effective G02 execution boundary to the V2.2 opening; do not edit the historical V2.1 source row.");
  const prohibited = ["星宇首次登场", "七码恢复", "基础HOPA教学", "垃圾雨完整航线"];
  add(!prohibited.some((term) => opening.includes(term)), "STORY-G02-NO-REPEATED-PROLOGUE", "config/baseline-policy.json#/story/g02_effective_opening", prohibited.filter((term) => opening.includes(term)), [], source, "V2.2", "Remove repeated G01 onboarding from the effective G02 boundary.");
  add(g01Scenes.at(-1)?.["下一场景"] === "G02" && String(g01Scenes.at(-1)?.["核心目标"]).includes("旧屏幕谷外缘"), "STORY-G01-G02-TRACEABLE", "data/source/g01/json/G01_MasterData.json#/modules/场景流程/7", g01Scenes.at(-1), { next: "G02", handoff: "旧屏幕谷外缘" }, source, "V3.0", "Restore the final G01 scene handoff fields.");

  for (const [chapter, master] of Object.entries(snapshot.chapters)) {
    const scenes = master.modules["场景流程"];
    const sceneIds = new Set(scenes.map((row) => row["场景ID"]));
    add(scenes.every((row) => row["场景ID"] && row["下一场景"] && row["角色"] && row["核心目标"]), "STORY-SCENE-FIELDS", `${chapter}#/场景流程`, scenes.filter((row) => !row["场景ID"] || !row["下一场景"] || !row["角色"] || !row["核心目标"]).length, 0, `data/source/${chapter}`, "formal structured data", "Restore required scene, next-scene, role, and objective fields.");
    for (const moduleName of ["热点清单", "找物清单", "对话脚本", "场景状态机", "三级提示", "存档与恢复"]) {
      const bad = master.modules[moduleName].filter(
        (row) =>
          row["场景ID"] &&
          row["场景ID"] !== "任意安全场景" &&
          !sceneIds.has(row["场景ID"]),
      );
      add(bad.length === 0, "STORY-SCENE-REFERENCE", `${chapter}#/${moduleName}`, bad.map((row) => row["场景ID"]), [], `data/source/${chapter}`, "formal structured data", "Restore references to a scene declared in the same chapter.");
    }
  }

  return { issues, ruleCount };
}

function schemaTypeMatches(value, type) {
  if (Array.isArray(type)) return type.some((item) => schemaTypeMatches(value, item));
  if (type === "array") return Array.isArray(value);
  if (type === "object") return value !== null && typeof value === "object" && !Array.isArray(value);
  if (type === "integer") return Number.isInteger(value);
  if (type === "null") return value === null;
  return typeof value === type;
}

function validateAgainstSchema(value, schema, path, errors) {
  if (schema.type && !schemaTypeMatches(value, schema.type)) {
    errors.push(`${path}: type ${typeof value} is not ${JSON.stringify(schema.type)}`);
    return;
  }
  if (schema.type === "array") {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`${path}: ${value.length} items < ${schema.minItems}`);
    }
    if (schema.items) {
      value.forEach((item, index) =>
        validateAgainstSchema(item, schema.items, `${path}/${index}`, errors),
      );
    }
  }
  if (schema.type === "object") {
    for (const key of schema.required ?? []) {
      if (!(key in value) || value[key] === "") errors.push(`${path}: missing ${key}`);
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!(key in (schema.properties ?? {}))) errors.push(`${path}: unknown ${key}`);
      }
    }
    for (const [key, childSchema] of Object.entries(schema.properties ?? {})) {
      if (key in value) validateAgainstSchema(value[key], childSchema, `${path}/${key}`, errors);
    }
  }
  if (schema.pattern && typeof value === "string" && !new RegExp(schema.pattern).test(value)) {
    errors.push(`${path}: ${value} does not match ${schema.pattern}`);
  }
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${path}: ${value} is not in ${schema.enum.join(",")}`);
  }
}

export function validateSchemasAndHopa(snapshot) {
  const issues = [];
  let ruleCount = 0;
  const add = (condition, ...args) => {
    ruleCount += 1;
    if (!condition) issues.push(issue(...args));
  };
  const schemas = {};
  for (const [moduleName, filename] of Object.entries(MODULE_SCHEMAS)) {
    schemas[moduleName] = readJson(snapshot.root, `schemas/hopa/${filename}`);
  }
  const masterSchema = readJson(snapshot.root, "schemas/hopa/master-data.schema.json");
  for (const [chapter, master] of Object.entries(snapshot.chapters)) {
    const masterErrors = [];
    validateAgainstSchema(master, masterSchema, chapter, masterErrors);
    add(masterErrors.length === 0, "HOPA-SCHEMA-MASTERDATA", `${chapter}_MasterData.json`, masterErrors, [], "schemas/hopa/master-data.schema.json", "1.0", "Restore required MasterData fields and module references.");
    for (const [moduleName, schema] of Object.entries(schemas)) {
      const errors = [];
      validateAgainstSchema(master.modules[moduleName], schema, `${chapter}/${moduleName}`, errors);
      add(errors.length === 0, `HOPA-SCHEMA-${schema["x-rule-suffix"]}`, `${chapter}/${moduleName}`, errors, [], `schemas/hopa/${MODULE_SCHEMAS[moduleName]}`, "1.0", "Restore required fields and remove undeclared fields from the formal module.");
    }
    const states = master.modules["场景状态机"];
    add(states.every((row) => /^S[0-6]$/.test(row["状态码"])), "HOPA-STATE-S0-S6", `${chapter}/场景状态机`, [...new Set(states.map((row) => row["状态码"]).filter((value) => !/^S[0-6]$/.test(value)))], [], "docs/baseline/02_HOPA_ARCHITECTURE.md", "confirmed", "Use only the frozen S0-S6 scene-state vocabulary.");
    const saves = master.modules["存档与恢复"];
    add(saves.every((row) => String(row["恢复位置"] ?? "").trim().length > 0), "HOPA-DANGER-SAFE-RECOVERY", `${chapter}/存档与恢复`, saves.filter((row) => !String(row["恢复位置"] ?? "").trim()).map((row) => row["存档ID"]), [], "docs/baseline/02_HOPA_ARCHITECTURE.md", "confirmed", "Declare a non-empty safe recovery position for each save/recovery record.");
  }
  return { issues, ruleCount };
}

function walkFiles(root, base, extensions, output = []) {
  const target = join(root, base);
  if (!existsSync(target)) return output;
  for (const entry of readdirSync(target)) {
    const absolute = join(target, entry);
    const rel = relative(root, absolute).replaceAll("\\", "/");
    if (statSync(absolute).isDirectory()) walkFiles(root, rel, extensions, output);
    else if (extensions.some((extension) => rel.endsWith(extension))) output.push(rel);
  }
  return output;
}

export function validateForbiddenTerms(snapshot) {
  const issues = [];
  let ruleCount = 0;
  const add = (condition, ...args) => {
    ruleCount += 1;
    if (!condition) issues.push(issue(...args));
  };
  const runtimeTech = snapshot.dataIndex.map((row) => row.runtime_technology);
  add(runtimeTech.every((value) => value === "HTML5/PWA + Vite + TypeScript"), "TECH-RUNTIME-HTML5-PWA", "data/source/index.json#/runtime_technology", [...new Set(runtimeTech)], ["HTML5/PWA + Vite + TypeScript"], "docs/baseline/02_HOPA_ARCHITECTURE.md", "confirmed", "Restore HTML5/PWA + Vite + TypeScript as the only current runtime route.");
  add(Boolean(snapshot.packageJson.devDependencies?.vite && snapshot.packageJson.devDependencies?.typescript && snapshot.packageJson.dependencies?.["vite-plugin-pwa"]), "TECH-PACKAGE-STACK", "package.json", { vite: snapshot.packageJson.devDependencies?.vite, typescript: snapshot.packageJson.devDependencies?.typescript, pwa: snapshot.packageJson.dependencies?.["vite-plugin-pwa"] }, "all present", "docs/baseline/02_HOPA_ARCHITECTURE.md", "confirmed", "Restore the frozen Vite, TypeScript, and PWA dependencies.");
  const runtimeFiles = walkFiles(snapshot.root, "src", [".ts", ".tsx", ".js", ".jsx"]);
  const files = runtimeFiles.map((path) => ({
    path,
    content: readFileSync(join(snapshot.root, path), "utf8"),
  })).concat(snapshot.syntheticCurrentExecutionFiles);
  const forbidden = snapshot.policy.forbidden.current_execution_patterns.map((value) => new RegExp(value, "i"));
  const matches = [];
  for (const file of files) {
    for (const pattern of forbidden) {
      if (pattern.test(file.content)) matches.push({ path: file.path, pattern: pattern.source });
    }
  }
  add(matches.length === 0, "TECH-FORBIDDEN-CURRENT-EXECUTION", "src/**", matches, [], "docs/baseline/03_GLOBAL_FROZEN_RULES.md", "confirmed", "Remove current implementation of prohibited combat, RPG, enemy-AI, Boss, or free real-time 3D routes; historical references belong only in isolated provenance.");
  const currentNames = snapshot.characters.map((row) => row.character_name);
  add(!currentNames.includes("小砾"), "TECH-LEGACY-PROTAGONIST-NAME", "data/source/catalogs/characters-71.json#/character_name", currentNames.filter((name) => name === "小砾"), [], "docs/baseline/00_SOURCE_OF_TRUTH.md", "confirmed", "Restore 星宇 as the current protagonist; keep the old name only in legacy/provenance records.");
  return { issues, ruleCount };
}

export function validateSourceLayer(snapshot) {
  const issues = [];
  let ruleCount = 0;
  const add = (condition, ...args) => {
    ruleCount += 1;
    if (!condition) issues.push(issue(...args));
  };
  const manifest = snapshot.sourceManifest;
  add(manifest.missing_required.length === 0 && snapshot.missingSources.missing_count === 0 && snapshot.missingSources.items.length === 0, "SOURCE-MISSING-ZERO", "source_packages/manifests", { missing_required: manifest.missing_required.length, missing_count: snapshot.missingSources.missing_count, items: snapshot.missingSources.items.length }, { missing_required: 0, missing_count: 0, items: 0 }, "Issue #6 P0-A", "accepted main", "Import the required formal package through the deterministic importer.");
  const mismatched = manifest.imported.filter((row) => row.expected_sha256 !== row.observed_sha256 || row.expected_bytes !== row.observed_bytes);
  add(mismatched.length === 0, "SOURCE-MANIFEST-SHA-SIZE", "source_packages/manifests/source-packages.json#/imported", mismatched.map((row) => row.package_id), [], "Issue #6 P0-A", "accepted main", "Restore the verified source object; do not edit expected or observed hashes.");
  const duplicateNames = manifest.imported.filter((row, index, all) => all.findIndex((item) => item.filename.toLowerCase() === row.filename.toLowerCase()) !== index);
  const duplicateShas = manifest.imported.filter((row, index, all) => all.findIndex((item) => item.observed_sha256 === row.observed_sha256) !== index);
  add(duplicateNames.length === 0 && duplicateShas.length === 0, "SOURCE-NO-DUPLICATES", "source_packages/manifests/source-packages.json#/imported", { names: duplicateNames.map((row) => row.filename), sha: duplicateShas.map((row) => row.package_id) }, { names: [], sha: [] }, "Issue #6 P0-A", "accepted main", "Resolve duplicate package identity without replacing source bytes.");
  const missingPaths = manifest.imported.filter((row) => !existsSync(join(snapshot.root, row.repository_path)));
  add(missingPaths.length === 0, "SOURCE-REPOSITORY-PATHS", "source_packages/manifests/source-packages.json#/repository_path", missingPaths.map((row) => row.package_id), [], "Issue #6 P0-A", "accepted main", "Restore the LFS-tracked source object at its manifested repository path.");
  const badProvenance = snapshot.extractedFiles.files.filter((row) => !row.source_package || !row.source_entry || !row.source_entry_sha256 || !row.output_path);
  add(badProvenance.length === 0 && snapshot.extractedFiles.count === snapshot.extractedFiles.files.length, "SOURCE-EXTRACTION-PROVENANCE", "source_packages/manifests/extracted-files.json", { missing: badProvenance.length, declared: snapshot.extractedFiles.count, actual: snapshot.extractedFiles.files.length }, { missing: 0, declared: snapshot.extractedFiles.files.length, actual: snapshot.extractedFiles.files.length }, "Issue #6 P0-A", "accepted main", "Regenerate the extraction manifest with full provenance.");
  const strict = validateStrictSource(snapshot);
  return { issues: issues.concat(strict.issues), ruleCount: ruleCount + strict.ruleCount };
}

export function runAll(snapshot) {
  const sections = [
    validateSourceLayer(snapshot),
    validateCatalogs(snapshot),
    validateStory(snapshot),
    validateStarCoreContracts(snapshot),
    validateSchemasAndHopa(snapshot),
    validateStrictHopa(snapshot),
    validateForbiddenTerms(snapshot),
    validateExpandedForbidden(snapshot),
  ];
  return {
    issues: sections.flatMap((section) => section.issues),
    ruleCount: sections.reduce((sum, section) => sum + section.ruleCount, 0),
  };
}
