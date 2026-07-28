import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { inflateRawSync } from "node:zlib";
import { join, relative } from "node:path";

const sha256Buffer = (value) => createHash("sha256").update(value).digest("hex");
const normalizedSha256 = (value, mode) =>
  sha256Buffer(
    mode === "canonical_lf"
      ? Buffer.from(value.toString("utf8").replace(/\r\n?/g, "\n"), "utf8")
      : value,
  );

function makeIssue(ruleId, path, actual, expected, source, version, action) {
  return { ruleId, path, actual, expected, source, version, action };
}

function unzipEntries(buffer) {
  let eocd = -1;
  for (let offset = buffer.length - 22; offset >= Math.max(0, buffer.length - 65_557); offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) {
      eocd = offset;
      break;
    }
  }
  if (eocd < 0) throw new Error("ZIP end-of-central-directory record not found");
  const totalEntries = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);
  const entries = new Map();
  for (let index = 0; index < totalEntries; index += 1) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error(`invalid ZIP central-directory entry at ${offset}`);
    }
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const filenameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const filename = buffer.subarray(offset + 46, offset + 46 + filenameLength).toString("utf8");
    if (buffer.readUInt32LE(localOffset) !== 0x04034b50) {
      throw new Error(`invalid ZIP local entry for ${filename}`);
    }
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = buffer.subarray(dataOffset, dataOffset + compressedSize);
    let data;
    if (method === 0) data = compressed;
    else if (method === 8) data = inflateRawSync(compressed);
    else throw new Error(`unsupported ZIP compression method ${method} for ${filename}`);
    entries.set(filename, data);
    offset += 46 + filenameLength + extraLength + commentLength;
  }
  return entries;
}

function walk(root, base, output = []) {
  const absoluteBase = join(root, base);
  if (!existsSync(absoluteBase)) return output;
  for (const name of readdirSync(absoluteBase)) {
    const absolute = join(absoluteBase, name);
    const path = relative(root, absolute).replaceAll("\\", "/");
    if (statSync(absolute).isDirectory()) walk(root, path, output);
    else output.push(path);
  }
  return output;
}

function parseShaList(text) {
  const records = [];
  const invalid = [];
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    const match = /^([a-f0-9]{64})  (.+)$/.exec(line);
    if (!match) invalid.push({ line: index + 1, value: line });
    else records.push({ sha256: match[1], path: match[2] });
  }
  return { records, invalid };
}

export function validateStrictSource(snapshot) {
  const issues = [];
  let ruleCount = 0;
  const add = (condition, ...args) => {
    ruleCount += 1;
    if (!condition) issues.push(makeIssue(...args));
  };
  const source = "Issue #7 / PR #12 P0 review";
  const imported = snapshot.sourceManifest.imported;
  const packageById = new Map(imported.map((row) => [row.package_id, row]));
  const shaPath = join(snapshot.root, "source_packages/manifests/sha256sums.txt");
  const parsed = parseShaList(readFileSync(shaPath, "utf8"));
  const shaPaths = parsed.records.map((row) => row.path);
  const expected = imported.map((row) => ({
    path: row.repository_path.replace(/^source_packages\//, ""),
    sha256: row.observed_sha256,
  }));
  const expectedByPath = new Map(expected.map((row) => [row.path, row.sha256]));
  const actualByPath = new Map(parsed.records.map((row) => [row.path, row.sha256]));
  const duplicateShaPaths = shaPaths.filter((path, index) => shaPaths.indexOf(path) !== index);
  add(
    parsed.invalid.length === 0 && duplicateShaPaths.length === 0,
    "SOURCE-SHA-LIST-FORMAT-UNIQUE",
    "source_packages/manifests/sha256sums.txt",
    { invalid: parsed.invalid, duplicate_paths: [...new Set(duplicateShaPaths)] },
    { invalid: [], duplicate_paths: [] },
    source,
    "P0-1",
    "Regenerate the SHA list with one canonical path per formal source.",
  );
  const missingShaPaths = expected.filter((row) => !actualByPath.has(row.path));
  const extraShaPaths = parsed.records.filter((row) => !expectedByPath.has(row.path));
  const wrongSha = expected.filter(
    (row) => actualByPath.has(row.path) && actualByPath.get(row.path) !== row.sha256,
  );
  add(
    imported.length === 19 &&
      parsed.records.length === 19 &&
      missingShaPaths.length === 0 &&
      extraShaPaths.length === 0 &&
      wrongSha.length === 0,
    "SOURCE-SHA-LIST-EXACT-MATCH",
    "source_packages/manifests/sha256sums.txt + source-packages.json",
    {
      manifest_count: imported.length,
      sha_count: parsed.records.length,
      missing: missingShaPaths,
      extra: extraShaPaths,
      mismatched: wrongSha,
    },
    { manifest_count: 19, sha_count: 19, missing: [], extra: [], mismatched: [] },
    source,
    "P0-1",
    "Make the SHA list and the 19-source machine manifest exact set/path/hash mirrors.",
  );

  const archiveCache = new Map();
  const extractionProblems = [];
  for (const row of snapshot.extractedFiles.files) {
    const pkg = packageById.get(row.source_package);
    if (!pkg) {
      extractionProblems.push({ output_path: row.output_path, problem: "unknown source_package", value: row.source_package });
      continue;
    }
    const packagePath = join(snapshot.root, pkg.repository_path);
    try {
      let sourceBytes;
      if (pkg.filename.toLowerCase().endsWith(".docx")) {
        if (row.source_entry !== pkg.filename) {
          extractionProblems.push({ output_path: row.output_path, problem: "DOCX source_entry mismatch", value: row.source_entry });
          continue;
        }
        sourceBytes = readFileSync(packagePath);
      } else {
        if (!archiveCache.has(pkg.package_id)) {
          archiveCache.set(pkg.package_id, unzipEntries(readFileSync(packagePath)));
        }
        sourceBytes = archiveCache.get(pkg.package_id).get(row.source_entry);
        if (!sourceBytes) {
          extractionProblems.push({ output_path: row.output_path, problem: "source_entry missing in ZIP", value: row.source_entry });
          continue;
        }
      }
      const innerSha = sha256Buffer(sourceBytes);
      if (innerSha !== row.source_entry_sha256) {
        extractionProblems.push({ output_path: row.output_path, problem: "source_entry_sha256 mismatch", actual: row.source_entry_sha256, expected: innerSha });
      }
      const outputPath = join(snapshot.root, row.output_path);
      if (!existsSync(outputPath)) {
        extractionProblems.push({ output_path: row.output_path, problem: "output missing" });
        continue;
      }
      const actualOutputSha = normalizedSha256(readFileSync(outputPath), row.output_hash_mode);
      if (actualOutputSha !== row.output_sha256) {
        extractionProblems.push({ output_path: row.output_path, problem: "output_sha256 mismatch", actual: row.output_sha256, expected: actualOutputSha });
      }
    } catch (error) {
      extractionProblems.push({ output_path: row.output_path, problem: error.message });
    }
  }
  add(
    snapshot.extractedFiles.count === snapshot.extractedFiles.files.length &&
      extractionProblems.length === 0,
    "SOURCE-EXTRACTED-ENTRY-BYTE-INTEGRITY",
    "source_packages/manifests/extracted-files.json",
    { declared: snapshot.extractedFiles.count, actual: snapshot.extractedFiles.files.length, problems: extractionProblems },
    { declared: snapshot.extractedFiles.files.length, actual: snapshot.extractedFiles.files.length, problems: [] },
    source,
    "P0-1",
    "Reference a formal package entry and regenerate provenance/output hashes from the actual bytes.",
  );

  const allowedStatuses = new Set(["current_source_imported", "current_rule_confirmed"]);
  const sourceRules = snapshot.policy.source_integrity?.current_source_rules ?? {};
  const confirmedRules = new Set(snapshot.policy.source_integrity?.confirmed_rules ?? []);
  const history = new Set(snapshot.policy.source_integrity?.confirmed_history_records ?? []);
  const legacyText = JSON.stringify(snapshot.legacy);
  const substitutionProblems = [];
  const supersededTerms = [];
  for (const rule of snapshot.substitutions.rules) {
    if (!allowedStatuses.has(rule.status)) {
      substitutionProblems.push({ current: rule.current, problem: "status", value: rule.status });
    }
    if (rule.status === "current_source_imported") {
      const packageId = sourceRules[rule.current];
      if (!packageId || !packageById.has(packageId)) {
        substitutionProblems.push({ current: rule.current, problem: "current has no formal package", value: packageId ?? null });
      }
    } else if (!confirmedRules.has(rule.current)) {
      substitutionProblems.push({ current: rule.current, problem: "current rule is not explicitly confirmed" });
    }
    for (const superseded of rule.supersedes ?? []) {
      supersededTerms.push(superseded);
      if (!legacyText.includes(superseded) && !history.has(superseded)) {
        substitutionProblems.push({ current: rule.current, problem: "supersedes not locatable", value: superseded });
      }
    }
  }
  add(
    substitutionProblems.length === 0,
    "SOURCE-SUBSTITUTION-REFERENTIAL-INTEGRITY",
    "source_packages/manifests/substitution-map.json",
    substitutionProblems,
    [],
    "docs/baseline/01_VERSION_PRIORITY.md",
    "confirmed",
    "Map every current source/rule and every superseded record to explicit formal or historical provenance.",
  );
  const executionIndexText = JSON.stringify({
    dataIndex: snapshot.dataIndex,
    storyIndex: snapshot.storyIndex,
    characters: snapshot.characters,
    assets: snapshot.catalog.assets,
    runtime: snapshot.packageJson,
  });
  const leakedSuperseded = supersededTerms.filter((term) => executionIndexText.includes(term));
  add(
    leakedSuperseded.length === 0,
    "SOURCE-SUPERSEDED-ISOLATED",
    "current indexes/catalogs/runtime",
    leakedSuperseded,
    [],
    "docs/baseline/01_VERSION_PRIORITY.md",
    "confirmed",
    "Keep superseded identities out of current execution indexes, asset provenance, runtime configuration, and chapter entries.",
  );
  return { issues, ruleCount };
}

function hintRank(level) {
  return new Map([
    ["一级", 1], ["1级", 1], ["方向提示", 1],
    ["二级", 2], ["2级", 2], ["区域提示", 2],
    ["三级", 3], ["3级", 3], ["直接辅助", 3],
  ]).get(level);
}

function criticalItems(chapter, master, adapter) {
  const bag = master.modules["背包道具流转"];
  const hotspots = master.modules["热点清单"];
  const flows = master.modules["场景流程"];
  const hidden = master.modules["找物清单"];
  return bag.filter((item) => {
    const text = [item["类别"], item["消耗规则"], item["备注"]].join(" ");
    return /关键|不可丢弃|不可错误消耗|错误使用/.test(text) ||
      flows.some((row) => String(row["关键道具"]).includes(item["名称"])) ||
      hidden.some((row) => String(row["必找规则"]).includes("必找") && String(row["目标物品"]).includes(item["名称"]));
  }).map((item) => {
    const ids = String(item["使用热点"] ?? "").match(/HS-G\d{2}-\d+/g) ?? [];
    const useName = String(item["使用热点"] ?? "").split("/")[0];
    const hotspot = hotspots.find((row) => ids.includes(row["热点ID"])) ??
      hotspots.find((row) => useName && String(row["热点名称"]).includes(useName)) ??
      hotspots.find((row) => [row["热点名称"], row["成功结果"], row["错误反馈"]].some((value) => String(value).includes(item["名称"])));
    const acquire = String(item["取得位置"] ?? "");
    const hiddenRow = hidden.find((row) => String(row["目标物品"]).includes(item["名称"]) || acquire.includes(row["找物ID"]));
    const sceneId = hotspot?.["场景ID"] ??
      flows.find((row) => String(row["关键道具"]).includes(item["名称"]))?.["场景ID"] ??
      hiddenRow?.["场景ID"] ??
      acquire.match(/SCN-G\d{2}-\d{2}/)?.[0] ??
      null;
    const explicitFeedback = hotspot?.["错误反馈"];
    return {
      chapter,
      item_id: item["道具ID"],
      item_name: item["名称"],
      scene_id: sceneId,
      wrong_hotspot_or_feedback: explicitFeedback && explicitFeedback !== "无"
        ? explicitFeedback
        : adapter.fallback_wrong_use_feedback,
      item_retained: adapter.item_retained,
      correct_progress_unchanged: adapter.correct_progress_unchanged,
      consumed_on_wrong_use: adapter.consumed_on_wrong_use,
      adapter_source: adapter.source,
    };
  });
}

export function validateStrictHopa(snapshot) {
  const issues = [];
  let ruleCount = 0;
  const add = (condition, ...args) => {
    ruleCount += 1;
    if (!condition) issues.push(makeIssue(...args));
  };
  const source = "docs/baseline/02_HOPA_ARCHITECTURE.md";
  for (const [chapter, master] of Object.entries(snapshot.chapters)) {
    const groups = new Map();
    for (const row of master.modules["三级提示"]) {
      const key = `${row["场景ID"]}+${row["机关/任务"]}`;
      groups.set(key, [...(groups.get(key) ?? []), row]);
    }
    for (const [task, rows] of groups) {
      const ranks = rows.map((row) => hintRank(row["提示等级"]));
      const semantics = [
        ranks[0] === 1 &&
          /方向|不代替|先|观察|查看|检查|注意|确认|寻找|识别|判断|留意/.test(
            `${rows[0]?.["提示等级"]} ${rows[0]?.["提示文本"]} ${rows[0]?.["效果"]}`,
          ),
        ranks[1] === 2 &&
          /区域|范围|显示|高亮|缩小|局部|位置|目标/.test(
            `${rows[1]?.["提示等级"]} ${rows[1]?.["提示文本"]} ${rows[1]?.["效果"]}`,
          ),
        ranks[2] === 3 && String(rows[2]?.["效果"]).includes("完成一步"),
      ];
      add(
        rows.length === 3 && new Set(ranks).size === 3 && ranks.join(",") === "1,2,3" && semantics.every(Boolean),
        "HOPA-HINT-EXACT-THREE-ORDERED",
        `${chapter}/三级提示/${task}`,
        { count: rows.length, ranks, semantics },
        { count: 3, ranks: [1, 2, 3], semantics: [true, true, true] },
        source,
        "confirmed",
        "Provide exactly direction, area, and one-step assistance in that order, without gaps or duplicates.",
      );
    }
  }

  const criticalAdapter = snapshot.policy.hopa_contracts.critical_item_adapter;
  const criticalContracts = Object.entries(snapshot.chapters).flatMap(([chapter, master]) =>
    criticalItems(chapter, master, criticalAdapter));
  const criticalOverrides = snapshot.criticalItemContractOverrides ?? {};
  for (const base of criticalContracts) {
    const contract = { ...base, ...(criticalOverrides[base.item_id] ?? {}) };
    add(
      Boolean(contract.scene_id) &&
        Boolean(contract.wrong_hotspot_or_feedback) &&
        contract.item_retained === true &&
        contract.correct_progress_unchanged === true &&
        contract.consumed_on_wrong_use === false,
      "HOPA-CRITICAL-ITEM-WRONG-USE-CONTRACT",
      `${contract.chapter}/${contract.scene_id ?? "UNMAPPED"}/${contract.item_id}`,
      contract,
      {
        item_id: contract.item_id,
        scene_id: "mapped formal scene",
        wrong_hotspot_or_feedback: "non-empty",
        item_retained: true,
        correct_progress_unchanged: true,
        consumed_on_wrong_use: false,
      },
      criticalAdapter.source,
      "structured adapter over formal source",
      `Restore the per-item wrong-use contract for ${contract.item_id} in ${contract.scene_id ?? "an explicitly mapped scene"}.`,
    );
  }

  const planetMap = snapshot.policy.hopa_contracts.danger_failure_adapter.planet_chapters;
  const dangerAdapter = snapshot.policy.hopa_contracts.danger_failure_adapter;
  const dangerOverrides = snapshot.dangerContractOverrides ?? {};
  for (const asset of snapshot.catalog.assets.filter((row) => row.domain === "danger")) {
    const chapter = planetMap[asset.chapter];
    const save = snapshot.chapters[chapter]?.modules["存档与恢复"]?.[0];
    const base = {
      danger_id: asset.official_id,
      chapter,
      safe_recovery_node: save?.["恢复位置"] ?? null,
      preserve_key_items: dangerAdapter.preserve_key_items,
      preserve_evidence: dangerAdapter.preserve_evidence,
      preserve_completed_correct_steps: dangerAdapter.preserve_completed_correct_steps,
      preserve_mechanism_progress: dangerAdapter.preserve_mechanism_progress,
      retry_allowed: dangerAdapter.retry_allowed,
      adapter_source: dangerAdapter.source,
    };
    const contract = { ...base, ...(dangerOverrides[asset.official_id] ?? {}) };
    add(
      Boolean(contract.chapter) &&
        Boolean(String(contract.safe_recovery_node ?? "").trim()) &&
        contract.preserve_key_items === true &&
        contract.preserve_evidence === true &&
        contract.preserve_completed_correct_steps === true &&
        contract.preserve_mechanism_progress === true &&
        contract.retry_allowed === true,
      "HOPA-DANGER-SOFT-FAILURE-RECOVERY",
      `${contract.chapter ?? "UNMAPPED"}/${contract.danger_id}`,
      contract,
      {
        safe_recovery_node: "non-empty",
        preserve_key_items: true,
        preserve_evidence: true,
        preserve_completed_correct_steps: true,
        preserve_mechanism_progress: true,
        retry_allowed: true,
      },
      dangerAdapter.source,
      "structured adapter over formal source",
      `Restore the complete retry-safe recovery contract for ${contract.danger_id}.`,
    );
  }
  return { issues, ruleCount };
}

export function validateStarCoreContracts(snapshot) {
  const issues = [];
  let ruleCount = 0;
  const add = (condition, ...args) => {
    ruleCount += 1;
    if (!condition) issues.push(makeIssue(...args));
  };
  const contracts = snapshot.policy.story.star_core_contracts ?? [];
  const chapters = Array.from({ length: 12 }, (_, index) => `G${String(index + 2).padStart(2, "0")}`);
  add(
    contracts.length === 12 &&
      new Set(contracts.map((row) => row.chapter)).size === 12 &&
      chapters.every((chapter) => contracts.some((row) => row.chapter === chapter)),
    "STORY-STAR-CORE-CONTRACT-COVERAGE",
    "config/baseline-policy.json#/story/star_core_contracts",
    contracts.map((row) => row.chapter),
    chapters,
    "docs/plan/CODEX_MASTER_PLAN_V2.0.md",
    "V2.0",
    "Define exactly one traceable star-core state transition for G02 through G13.",
  );
  for (const contract of contracts) {
    const master = snapshot.chapters[contract.chapter];
    const variables = master?.modules["程序变量"] ?? [];
    const coreRows = variables.filter((row) => row["变量名"] === contract.star_core_variable);
    const completionRows = variables.filter((row) => row["变量名"] === contract.completion_variable);
    const story = snapshot.storyIndex.find((row) => row.chapter === contract.chapter);
    const expectedBase = contract.chapter === "G01"
      ? "data/source/g01"
      : `data/source/g02-g13/${contract.chapter}`;
    const programPath = `${expectedBase}/json/程序变量.json`;
    const masterPath = `${expectedBase}/json/${contract.chapter}_MasterData.json`;
    const core = coreRows[0];
    const actualBefore = Number(core?.["默认值"]);
    add(
      coreRows.length === 1 &&
        completionRows.length === 1 &&
        completionRows[0]["写入条件"] &&
        core?.["变量ID"] === contract.star_core_variable_id &&
        actualBefore === contract.before &&
        contract.after === contract.before + 1 &&
        contract.delta === 1 &&
        core?.["约束"] === "完成后+1" &&
        core?.["持久性"] === "跨章保存" &&
        story?.path === contract.formal_script_path &&
        contract.master_data_path === masterPath &&
        contract.program_variables_path === programPath &&
        existsSync(join(snapshot.root, contract.formal_script_path)) &&
        existsSync(join(snapshot.root, masterPath)) &&
        existsSync(join(snapshot.root, programPath)),
      "STORY-STAR-CORE-STATE-TRANSITION",
      `${contract.chapter}/${contract.star_core_variable_id ?? "MISSING"}`,
      {
        core_row_count: coreRows.length,
        completion_row_count: completionRows.length,
        actual_before: actualBefore,
        contract,
        source_story_path: story?.path,
      },
      {
        core_row_count: 1,
        completion_row_count: 1,
        before: contract.before,
        after: contract.before + 1,
        delta: 1,
        source_paths: "existing formal script, MasterData and program variables",
      },
      contract.formal_script_path,
      "V2.0/V2.1",
      `Restore ${contract.chapter}'s unique +1 star-core transition and its formal data trace.`,
    );
  }
  const ordered = [...contracts].sort((a, b) => a.chapter.localeCompare(b.chapter));
  add(
    ordered.every((row, index) => row.before === index && row.after === index + 1) &&
      ordered.at(-1)?.after === 12,
    "STORY-STAR-CORE-TWELVE-CUMULATIVE",
    "config/baseline-policy.json#/story/star_core_contracts",
    ordered.map(({ chapter, before, after }) => ({ chapter, before, after })),
    chapters.map((chapter, index) => ({ chapter, before: index, after: index + 1 })),
    "docs/plan/CODEX_MASTER_PLAN_V2.0.md",
    "V2.0",
    "Keep the twelve main-planet transitions unique, consecutive, and cumulative to twelve.",
  );
  return { issues, ruleCount };
}

function currentExecutionFiles(snapshot) {
  const roots = [
    "src", "config", "schemas", "tests", "tasks",
    "docs/baseline", "docs/plan", "docs/project", "docs/implementation", "docs/chapters",
  ];
  const fixed = [
    "README.md", "AGENTS.md", "CODEX_START_HERE.md", "package.json",
    "vite.config.ts", "playwright.config.ts", "tsconfig.json", "tsconfig.app.json", "tsconfig.node.json",
  ];
  const allowedExtensions = /\.(?:ts|tsx|js|jsx|mjs|cjs|json|md)$/;
  const files = [...new Set(roots.flatMap((base) => walk(snapshot.root, base)).concat(fixed))]
    .filter((path) => existsSync(join(snapshot.root, path)))
    .filter((path) => allowedExtensions.test(path))
    .filter((path) => !path.startsWith("tests/fixtures/baseline-negative/"))
    .filter((path) => !path.startsWith("docs/baseline/source_text/"))
    .filter((path) => !["docs/review/BASELINE_CONFLICT_REPORT.md", "docs/review/BASELINE_COMPLETENESS_REPORT.md"].includes(path))
    .map((path) => {
      let content = readFileSync(join(snapshot.root, path), "utf8");
      if (path === "config/baseline-policy.json") {
        const policy = JSON.parse(content);
        delete policy.forbidden;
        delete policy.source_integrity;
        content = JSON.stringify(policy);
      }
      return { path, content };
    });
  return files.concat(snapshot.syntheticCurrentExecutionFiles);
}

export function validateExpandedForbidden(snapshot) {
  const issues = [];
  let ruleCount = 0;
  const add = (condition, ...args) => {
    ruleCount += 1;
    if (!condition) issues.push(makeIssue(...args));
  };
  const files = currentExecutionFiles(snapshot);
  const patterns = [
    ["legacy-name", /小砾/],
    ["unity-current-runtime", /(?:当前运行时|当前引擎|runtime_technology|runtime|engine)\s*(?:为|是|=|:|：)\s*["']?Unity|Unity\s*(?:为|是)\s*(?:当前运行时|当前引擎)/i],
    ["v2.1-direct-import", /V2\.1[^.\n]{0,30}(?:直接|可直接)[^.\n]{0,20}(?:导入|运行)[^.\n]{0,20}(?:当前引擎|运行时|runtime|engine)/i],
    ["combat-implementation", /(?:战斗|血量|伤害|攻击|敌人\s*AI|Boss\s*战|技能树|自由实时\s*3D|combat|hit\s*points?|damage|attack|enemy\s*AI|boss\s*battle|skill[ _-]?tree|free[ _-]?roam(?:ing)?\s*3D)[^.\n]{0,35}(?:实现|系统|逻辑|handler|class|function|component|enabled|true|current|runtime)/i],
  ];
  const matches = [];
  for (const file of files) {
    for (const [lineIndex, line] of file.content.split(/\r?\n/).entries()) {
      const prohibition = /禁止|不得|不属于|不是当前|仅.{0,20}(?:历史|结构化)|非战斗|没有传统|无战斗/.test(line);
      for (const [kind, pattern] of patterns) {
        if (kind !== "legacy-name" && prohibition) continue;
        if (pattern.test(line)) {
          matches.push({ path: `${file.path}:${lineIndex + 1}`, kind, pattern: pattern.source });
        }
      }
    }
  }
  if (snapshot.policy.runtime_technology !== "HTML5/PWA + Vite + TypeScript") {
    matches.push({ path: "config/baseline-policy.json#/runtime_technology", kind: "runtime-config", value: snapshot.policy.runtime_technology });
  }
  add(
    matches.length === 0,
    "TECH-FORBIDDEN-CURRENT-EXECUTION",
    "src + config + schemas + current docs + tests + package/runtime config",
    matches,
    [],
    "docs/baseline/03_GLOBAL_FROZEN_RULES.md",
    "confirmed",
    "Remove old-name, Unity-current, direct-V2.1-import, and prohibited gameplay implementation semantics from current execution files.",
  );
  return { issues, ruleCount };
}

export function applyStrictFixture(snapshot, mutation) {
  const firstCriticalId = "ITM-G01-002";
  const firstDangerId = "DANGER-001";
  switch (mutation) {
    case "legacy-name-current-markdown":
      snapshot.syntheticCurrentExecutionFiles.push({ path: "docs/implementation/negative.md", content: "当前主角是小砾。" });
      break;
    case "unity-current-schema":
      snapshot.syntheticCurrentExecutionFiles.push({ path: "schemas/negative.schema.json", content: '{"description":"Unity 是当前运行时引擎"}' });
      break;
    case "boss-current-test":
      snapshot.syntheticCurrentExecutionFiles.push({ path: "tests/negative.test.ts", content: "export const Boss战实现 = { enabled: true };" });
      break;
    case "unity-current-config":
      snapshot.policy.runtime_technology = "Unity";
      break;
    case "hint-missing-second": {
      const rows = snapshot.chapters.G02.modules["三级提示"];
      const key = `${rows[0]["场景ID"]}/${rows[0]["机关/任务"]}`;
      snapshot.chapters.G02.modules["三级提示"] = rows.filter((row) =>
        `${row["场景ID"]}/${row["机关/任务"]}` !== key || hintRank(row["提示等级"]) !== 2);
      break;
    }
    case "hint-duplicate-first": {
      const rows = snapshot.chapters.G02.modules["三级提示"];
      rows[1]["提示等级"] = rows[0]["提示等级"];
      break;
    }
    case "hint-wrong-order": {
      const rows = snapshot.chapters.G02.modules["三级提示"];
      [rows[0], rows[1]] = [rows[1], rows[0]];
      break;
    }
    case "critical-item-consumed-on-error":
      snapshot.criticalItemContractOverrides = {
        [firstCriticalId]: { item_retained: false, consumed_on_wrong_use: true },
      };
      break;
    case "danger-missing-safe-node":
      snapshot.dangerContractOverrides = { [firstDangerId]: { safe_recovery_node: "" } };
      break;
    case "danger-drops-key-items":
      snapshot.dangerContractOverrides = { [firstDangerId]: { preserve_key_items: false } };
      break;
    case "danger-drops-evidence":
      snapshot.dangerContractOverrides = { [firstDangerId]: { preserve_evidence: false } };
      break;
    case "danger-drops-correct-steps":
      snapshot.dangerContractOverrides = { [firstDangerId]: { preserve_completed_correct_steps: false } };
      break;
    case "star-core-missing-chapter":
      snapshot.chapters.G07.modules["程序变量"] = snapshot.chapters.G07.modules["程序变量"].filter((row) => row["变量名"] !== "world_star_core_count");
      break;
    case "star-core-wrong-value":
      snapshot.chapters.G08.modules["程序变量"].find((row) => row["变量名"] === "world_star_core_count")["默认值"] = "99";
      break;
    case "star-core-duplicate":
      snapshot.chapters.G09.modules["程序变量"].push({
        ...snapshot.chapters.G09.modules["程序变量"].find((row) => row["变量名"] === "world_star_core_count"),
        "变量ID": "VAR-G09-DUPLICATE",
      });
      break;
    default:
      return false;
  }
  return true;
}
