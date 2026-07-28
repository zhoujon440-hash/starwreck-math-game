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

function unzipEntry(buffer, target) {
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
    if (filename === target) {
      const localNameLength = buffer.readUInt16LE(localOffset + 26);
      const localExtraLength = buffer.readUInt16LE(localOffset + 28);
      const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
      const compressed = buffer.subarray(dataOffset, dataOffset + compressedSize);
      if (method === 0) return compressed;
      if (method === 8) return inflateRawSync(compressed);
      throw new Error(`unsupported ZIP compression method ${method} for ${filename}`);
    }
    offset += 46 + filenameLength + extraLength + commentLength;
  }
  return null;
}

function decodeXml(value) {
  return String(value ?? "")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([a-f0-9]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  const source = text.replace(/^\uFEFF/, "");
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else value += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      row.push(value.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      value = "";
    } else value += char;
  }
  if (value || row.length) {
    row.push(value.replace(/\r$/, ""));
    rows.push(row);
  }
  const headers = rows.shift() ?? [];
  return rows
    .filter((values) => values.some((item) => item !== ""))
    .map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

function xlsxCellColumn(reference) {
  const letters = /^([A-Z]+)/.exec(reference)?.[1] ?? "A";
  let result = 0;
  for (const letter of letters) result = result * 26 + letter.charCodeAt(0) - 64;
  return result - 1;
}

function xlsxTables(buffer) {
  const entries = unzipEntries(buffer);
  const sharedXml = entries.get("xl/sharedStrings.xml")?.toString("utf8") ?? "";
  const sharedStrings = [...sharedXml.matchAll(/<(?:\w+:)?si\b[^>]*>([\s\S]*?)<\/(?:\w+:)?si>/g)].map((match) =>
    decodeXml([...match[1].matchAll(/<(?:\w+:)?t\b[^>]*>([\s\S]*?)<\/(?:\w+:)?t>/g)].map((part) => part[1]).join("")),
  );
  const tables = [];
  for (const [path, bytes] of entries) {
    if (!/^xl\/worksheets\/sheet\d+\.xml$/.test(path)) continue;
    const xml = bytes.toString("utf8");
    const rows = [];
    for (const rowMatch of xml.matchAll(/<(?:\w+:)?row\b[^>]*>([\s\S]*?)<\/(?:\w+:)?row>/g)) {
      const values = [];
      for (const cellMatch of rowMatch[1].matchAll(/<(?:\w+:)?c\b([^>]*)>([\s\S]*?)<\/(?:\w+:)?c>/g)) {
        const attrs = cellMatch[1];
        const body = cellMatch[2];
        const reference = /\br="([A-Z]+\d+)"/.exec(attrs)?.[1] ?? "A1";
        const type = /\bt="([^"]+)"/.exec(attrs)?.[1] ?? "";
        const raw =
          /<(?:\w+:)?v\b[^>]*>([\s\S]*?)<\/(?:\w+:)?v>/.exec(body)?.[1] ??
          [...body.matchAll(/<(?:\w+:)?t\b[^>]*>([\s\S]*?)<\/(?:\w+:)?t>/g)].map((part) => part[1]).join("");
        const value = type === "s" ? sharedStrings[Number(raw)] : decodeXml(raw);
        values[xlsxCellColumn(reference)] = value;
      }
      rows.push(values.map((value) => value ?? ""));
    }
    for (let headerIndex = 0; headerIndex < rows.length; headerIndex += 1) {
      const headers = rows[headerIndex];
      if (!headers.includes("资产ID")) continue;
      const idColumn = headers.indexOf("资产ID");
      const records = [];
      for (const values of rows.slice(headerIndex + 1)) {
        if (!/^[A-Z]+(?:-[A-Z0-9]+)*-\d{3}$/.test(values[idColumn] ?? "")) continue;
        records.push(
          Object.fromEntries(
            headers
              .map((header, index) => [header, values[index] ?? ""])
              .filter(([header]) => header),
          ),
        );
      }
      if (records.length) tables.push({ path, headers, rows: records });
    }
  }
  return tables;
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
  const sourceBytesFor = (reference) => {
    const pkg = packageById.get(reference.source_package);
    if (!pkg) throw new Error(`unknown source_package: ${reference.source_package}`);
    const packagePath = join(snapshot.root, pkg.repository_path);
    if (pkg.filename.toLowerCase().endsWith(".docx")) {
      if (reference.source_entry !== pkg.filename) {
        throw new Error(`DOCX source_entry mismatch: ${reference.source_entry}`);
      }
      return readFileSync(packagePath);
    }
    if (!archiveCache.has(pkg.package_id)) {
      archiveCache.set(pkg.package_id, unzipEntries(readFileSync(packagePath)));
    }
    const sourceBytes = archiveCache.get(pkg.package_id).get(reference.source_entry);
    if (!sourceBytes) {
      throw new Error(`source_entry missing in ZIP: ${reference.source_entry}`);
    }
    return sourceBytes;
  };
  const extractionProblems = [];
  for (const row of snapshot.extractedFiles.files) {
    try {
      if (row.extraction === "multi_source_derived_catalog") {
        if (
          !Array.isArray(row.derived_from) ||
          row.derived_from.length !== 8 ||
          row.generated_by !== "scripts/import_source_baseline.py#build_catalogs"
        ) {
          extractionProblems.push({
            output_path: row.output_path,
            problem: "invalid multi-source derived catalog declaration",
            value: { derived_from: row.derived_from, generated_by: row.generated_by },
          });
        }
      } else {
        if (!row.source_package || !row.source_entry || !row.source_entry_sha256) {
          extractionProblems.push({ output_path: row.output_path, problem: "missing direct-source provenance" });
        }
      }
      const references =
        row.extraction === "multi_source_derived_catalog" ? row.derived_from ?? [] : [row];
      for (const reference of references) {
        const innerSha = sha256Buffer(sourceBytesFor(reference));
        if (innerSha !== reference.source_entry_sha256) {
          extractionProblems.push({
            output_path: row.output_path,
            problem: "source_entry_sha256 mismatch",
            source_package: reference.source_package,
            source_entry: reference.source_entry,
            actual: reference.source_entry_sha256,
            expected: innerSha,
          });
        }
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

export function validateStrictCatalogSources(snapshot) {
  const issues = [];
  let ruleCount = 0;
  const add = (condition, ...args) => {
    ruleCount += 1;
    if (!condition) issues.push(makeIssue(...args));
  };
  const expectedPackages = snapshot.policy.catalog.domain_source_packages;
  const packageById = new Map(
    snapshot.sourceManifest.imported.map((row) => [row.package_id, row]),
  );
  const packageBufferCache = new Map();
  const entryCache = new Map();
  const entryBytes = (packageId, sourceEntry) => {
    const pkg = packageById.get(packageId);
    if (!pkg) return null;
    const cacheKey = `${packageId}\0${sourceEntry}`;
    if (!entryCache.has(cacheKey)) {
      if (!packageBufferCache.has(packageId)) {
        packageBufferCache.set(packageId, readFileSync(join(snapshot.root, pkg.repository_path)));
      }
      entryCache.set(cacheKey, unzipEntry(packageBufferCache.get(packageId), sourceEntry));
    }
    return entryCache.get(cacheKey) ?? null;
  };
  const formalRowsCache = new Map();
  const domainSpec = {
    character: {
      prefix: "CHAR-",
      expected: (row, asset) => ({
        formal_row_id: row["资产ID"],
        name: row["人物名称"],
        chapter: row["星球编号"],
        scope: row["星球编号"],
        type: row["类别"],
        official_id: row["人物名称"] === "七码" ? "EDU-0077" : null,
        maturity: "design_and_three_view_complete",
      }),
    },
    scene: {
      prefix: "SCN-",
      expected: (row) => ({
        catalog_id: row["资产ID"], official_id: row["资产ID"], formal_row_id: row["资产ID"],
        name: row["场景名称"], chapter: row["星球编号"], scope: row["星球/范围"],
        maturity: row["状态"], priority: row["优先级"], delivery_status: row["交付状态"],
      }),
    },
    prop: {
      prefix: "PROP-",
      expected: (row) => ({
        catalog_id: row["资产ID"], official_id: row["资产ID"], formal_row_id: row["资产ID"],
        name: row["道具名称"], chapter: row["星球编号"], scope: row["星球"],
        design_board: row["对应正式板"], maturity: row["状态"], verification_result: row["核查结论"],
      }),
    },
    mechanism: {
      prefix: "MECH-",
      expected: (row) => ({
        catalog_id: row["资产ID"], official_id: row["资产ID"], formal_row_id: row["资产ID"],
        name: row["机制名称"], mechanism_name: row["机制名称"],
        chapter: /^(G\d{2})\b/.exec(row["星球"])?.[1] ?? row["星球"],
        scope: row["星球"], maturity: row["状态"], freeze_version: row["冻结版本"],
      }),
    },
    ui: {
      prefix: "UI-",
      expected: (row) => ({
        catalog_id: row["资产ID"], official_id: row["资产ID"], formal_row_id: row["资产ID"],
        name: row["界面名称"], chapter: row["范围"], scope: row["星球"],
        type: row["类别"], category: row["类别"], batch: row["分批"],
        independent_board_status: row["独立设计板"], confirmation_status: row["确认状态"],
        maturity: row["确认状态"], freeze_version: row["冻结版本"],
      }),
    },
    fx: {
      prefix: "FX-",
      expected: (row) => ({
        catalog_id: row["资产ID"], official_id: row["资产ID"], formal_row_id: row["资产ID"],
        name: row["角色/装备"],
        chapter: /G\d{2}/.exec(row["范围"])?.[0] ?? "GLOBAL",
        scope: row["范围"], hopa_interaction: row["HOPA交互效果"],
        maturity: row["状态"], freeze_version: row["冻结版本"],
      }),
    },
    danger: {
      prefix: "DANGER-",
      expected: (row) => ({
        catalog_id: row["资产ID"], official_id: row["资产ID"], formal_row_id: row["资产ID"],
        name: row["危险名称"], chapter: row["星球"], scope: row["星球"], type: row["类型"],
        application_scene: row["应用场景"], batch: row["分批"],
        independent_board_status: row["独立设计板"], confirmation_status: row["确认状态"],
        maturity: row["确认状态"], freeze_version: row["冻结版本"],
      }),
    },
    g01_addition: {
      prefix: null,
      expected: (row) => ({
        catalog_id: row["资产ID"], official_id: row["资产ID"], formal_row_id: row["资产ID"],
        name: row["名称"], chapter: "G01", scope: "G01序章", type: row["类别"],
        delivery_form: row["交付形态"], freeze_requirement: row["冻结要求"], maturity: row["状态"],
      }),
    },
  };
  const formalReferenceFor = (asset) => ({
    packageId: asset.source_package,
    sourceEntry: asset.formal_row_entry ?? asset.source_entry,
  });
  const formalRowsFor = (asset) => {
    const reference = formalReferenceFor(asset);
    const cacheKey = `${asset.domain}\0${reference.packageId}\0${reference.sourceEntry}`;
    if (!formalRowsCache.has(cacheKey)) {
      const bytes = entryBytes(reference.packageId, reference.sourceEntry);
      if (!bytes) {
        formalRowsCache.set(cacheKey, []);
      } else {
        const lowerEntry = reference.sourceEntry.toLowerCase();
        const rows = lowerEntry.endsWith(".csv")
          ? parseCsv(bytes.toString("utf8"))
          : lowerEntry.endsWith(".xlsx")
            ? xlsxTables(bytes).flatMap((table) => table.rows)
            : [];
        const prefix = domainSpec[asset.domain]?.prefix;
        const filtered = prefix
          ? rows.filter((row) => String(row["资产ID"] ?? "").startsWith(prefix))
          : rows;
        const synthetic = (snapshot.syntheticFormalRows ?? [])
          .filter((item) => item.domain === asset.domain)
          .map((item) => item.row);
        formalRowsCache.set(cacheKey, filtered.concat(synthetic));
      }
    }
    return formalRowsCache.get(cacheKey);
  };
  const problems = [];
  const required = [
    "id",
    "catalog_id",
    "official_id",
    "domain",
    "name",
    "source_package",
    "source_entry",
    "source_sha256",
    "source_granularity",
    "design_master",
    "production_spec",
    "runtime_asset",
    "acceptance_asset",
  ];
  for (const asset of snapshot.catalog.assets) {
    const expectedPackage = expectedPackages[asset.domain];
    const missing = required.filter((field) => !(field in asset) || asset[field] === "");
    if (!("chapter" in asset) && !("scope" in asset)) missing.push("chapter_or_scope");
    let sourceEntrySha = null;
    let entryProblem = null;
    try {
      const bytes = entryBytes(asset.source_package, asset.source_entry);
      if (!bytes) entryProblem = "source_entry_not_found";
      else sourceEntrySha = sha256Buffer(bytes);
    } catch (error) {
      entryProblem = error.message;
    }
    const reasons = [];
    if (missing.length) reasons.push(`missing:${missing.join(",")}`);
    if (asset.id !== asset.catalog_id) reasons.push("id_catalog_id_mismatch");
    if (asset.source_package !== expectedPackage) reasons.push("wrong_domain_package");
    if (entryProblem) reasons.push(entryProblem);
    if (sourceEntrySha && sourceEntrySha !== asset.source_sha256) reasons.push("source_sha256_mismatch");
    if (asset.runtime_asset !== false || asset.acceptance_asset !== false) {
      reasons.push("design_master_promoted_to_runtime_or_acceptance");
    }
    if (reasons.length) {
      problems.push({
        catalog_id: asset.catalog_id,
        domain: asset.domain,
        reasons,
        actual_source: {
          package: asset.source_package ?? null,
          entry: asset.source_entry ?? null,
          sha256: asset.source_sha256 ?? null,
          runtime_asset: asset.runtime_asset ?? null,
          acceptance_asset: asset.acceptance_asset ?? null,
        },
        expected_formal_source: {
          package: expectedPackage ?? null,
          entry: "real entry in the corresponding formal package",
          sha256: sourceEntrySha ?? "SHA-256 of that real entry",
          runtime_asset: false,
          acceptance_asset: false,
        },
      });
    }
  }
  add(
    problems.length === 0,
    "CAT-ASSET-MULTI-SOURCE-PROVENANCE",
    "data/source/catalogs/asset-catalog-488.json#/assets",
    { problem_count: problems.length, assets: problems.slice(0, 50) },
    { problem_count: 0, assets: [] },
    "docs/baseline/08_CONFIRMED_BASELINE_V2.md",
    "formal V1.0/V2.0/V2.1/V3.0 packages",
    "Restore each listed catalog_id to its domain's formal package, real package entry, entry SHA, and non-runtime design-master status.",
  );
  const expectedPackageSet = [...new Set(Object.values(expectedPackages))].sort();
  const actualPackageSet = [...new Set(snapshot.catalog.assets.map((asset) => asset.source_package))].sort();
  const entrySet = new Set(snapshot.catalog.assets.map((asset) => asset.source_entry));
  const shaSet = new Set(snapshot.catalog.assets.map((asset) => asset.source_sha256));
  add(
    expectedPackageSet.length === 8 &&
      JSON.stringify(actualPackageSet) === JSON.stringify(expectedPackageSet) &&
      entrySet.size >= 8 &&
      shaSet.size >= 8 &&
      JSON.stringify([...snapshot.catalog.source_packages].sort()) ===
        JSON.stringify(expectedPackageSet),
    "CAT-ASSET-SOURCE-DIVERSITY",
    "data/source/catalogs/asset-catalog-488.json",
    {
      packages: actualPackageSet,
      declared_packages: snapshot.catalog.source_packages,
      unique_entries: entrySet.size,
      unique_shas: shaSet.size,
    },
    {
      packages: expectedPackageSet,
      declared_packages: expectedPackageSet,
      minimum_unique_entries: 8,
      minimum_unique_shas: 8,
    },
    "docs/baseline/08_CONFIRMED_BASELINE_V2.md",
    "488-asset multi-source baseline",
    "Restore the eight formal asset-source domains; do not collapse the catalog onto one package, entry, or SHA.",
  );
  const derivedOutputs = new Set([
    "data/source/catalogs/asset-catalog-488.csv",
    "data/source/catalogs/asset-catalog-488.json",
    "data/source/catalogs/master-workbook-counts.json",
  ]);
  const derivedProblems = snapshot.extractedFiles.files
    .filter((row) => derivedOutputs.has(row.output_path))
    .filter((row) => {
      const packages = (row.derived_from ?? []).map((ref) => ref.source_package).sort();
      return (
        row.extraction !== "multi_source_derived_catalog" ||
        row.generated_by !== "scripts/import_source_baseline.py#build_catalogs" ||
        row.mapping_version !== "formal-row-authority-v1" ||
        row.registry_reference_role !== "cross_check_only" ||
        !row.field_authority_map ||
        JSON.stringify(packages) !== JSON.stringify(expectedPackageSet)
      );
    });
  add(
    derivedProblems.length === 0 &&
      snapshot.catalog.generated_by === "scripts/import_source_baseline.py#build_catalogs" &&
      snapshot.catalog.mapping_version === "formal-row-authority-v1" &&
      snapshot.catalog.registry_reference_role === "cross_check_only" &&
      Object.keys(snapshot.catalog.field_authority_map ?? {}).length === 8 &&
      snapshot.policy.catalog.mapping_version === "formal-row-authority-v1" &&
      snapshot.policy.catalog.registry_reference_role === "cross_check_only" &&
      snapshot.policy.catalog.generated_by === "scripts/import_source_baseline.py#build_catalogs",
    "CAT-ASSET-DERIVED-CATALOG-PROVENANCE",
    "source_packages/manifests/extracted-files.json",
    derivedProblems,
    [],
    "scripts/import_source_baseline.py#build_catalogs",
    "deterministic multi-source derivation",
    "Declare all aggregate outputs with the exact eight formal inputs, explicit field authority map, mapping version, cross-check-only registry role, and generation script.",
  );

  const contentMismatches = [];
  const uniqueProblems = [];
  const assetsByDomain = new Map();
  for (const asset of snapshot.catalog.assets) {
    if (!assetsByDomain.has(asset.domain)) assetsByDomain.set(asset.domain, []);
    assetsByDomain.get(asset.domain).push(asset);
  }
  for (const [domain, domainAssets] of assetsByDomain) {
    const spec = domainSpec[domain];
    if (!spec) {
      uniqueProblems.push({ domain, problem: "unknown_domain", catalog_count: domainAssets.length });
      continue;
    }
    const sample = domainAssets[0];
    const rows = formalRowsFor(sample);
    const rowsById = new Map();
    for (const row of rows) {
      const rowId = row["资产ID"];
      if (!rowsById.has(rowId)) rowsById.set(rowId, []);
      rowsById.get(rowId).push(row);
    }
    const assetsByFormalId = new Map();
    for (const asset of domainAssets) {
      const locator = asset.formal_row_id;
      if (!assetsByFormalId.has(locator)) assetsByFormalId.set(locator, []);
      assetsByFormalId.get(locator).push(asset);
      const matchingRows = rowsById.get(locator) ?? [];
      if (matchingRows.length !== 1) continue;
      const expectedFields = spec.expected(matchingRows[0], asset);
      const authority = snapshot.catalog.field_authority_map?.[domain] ?? {};
      const authorityBytes = authority.source_package && authority.source_entry
        ? entryBytes(authority.source_package, authority.source_entry)
        : null;
      expectedFields.source_package = authority.source_package ?? expectedPackages[domain];
      if (domain === "character") {
        expectedFields.formal_row_entry = authority.source_entry;
        expectedFields.formal_row_sha256 = authorityBytes ? sha256Buffer(authorityBytes) : null;
      } else {
        expectedFields.source_entry = authority.source_entry;
        expectedFields.source_sha256 = authorityBytes ? sha256Buffer(authorityBytes) : null;
      }
      for (const [field, expectedValue] of Object.entries(expectedFields)) {
        if (asset[field] !== expectedValue) {
          contentMismatches.push({
            catalog_id: asset.catalog_id,
            formal_row_id: locator,
            field,
            actual: asset[field] ?? null,
            expected: expectedValue ?? null,
            source_package: asset.source_package,
            source_entry: asset.formal_row_entry ?? asset.source_entry,
            action: "Regenerate this field from the unique formal source row; registry fields are cross-check only.",
          });
        }
      }
    }
    for (const [formalId, matchingRows] of rowsById) {
      const matchingAssets = assetsByFormalId.get(formalId) ?? [];
      if (matchingRows.length !== 1 || matchingAssets.length !== 1) {
        uniqueProblems.push({
          catalog_id: matchingAssets[0]?.catalog_id ?? null,
          formal_row_id: formalId,
          domain,
          formal_row_count: matchingRows.length,
          catalog_row_count: matchingAssets.length,
          source_package: sample.source_package,
          source_entry: sample.formal_row_entry ?? sample.source_entry,
          action: "Keep exactly one formal row and exactly one catalog locator for this ID.",
        });
      }
    }
    for (const [formalId, matchingAssets] of assetsByFormalId) {
      if (!rowsById.has(formalId)) {
        uniqueProblems.push({
          catalog_id: matchingAssets[0]?.catalog_id ?? null,
          formal_row_id: formalId ?? null,
          domain,
          formal_row_count: 0,
          catalog_row_count: matchingAssets.length,
          source_package: sample.source_package,
          source_entry: sample.formal_row_entry ?? sample.source_entry,
          action: "Remove the unknown catalog row or restore its exact formal row locator.",
        });
      }
    }
  }
  add(
    contentMismatches.length === 0,
    "CAT-ASSET-FORMAL-ROW-CONTENT",
    "data/source/catalogs/asset-catalog-488.json#/assets",
    { mismatch_count: contentMismatches.length, mismatches: contentMismatches },
    { mismatch_count: 0, mismatches: [] },
    "eight formal art packages and their CSV/XLSX catalogs",
    "formal-row-authority-v1",
    "Regenerate every semantic field from its unique formal row using the explicit domain field map.",
  );
  add(
    uniqueProblems.length === 0 && snapshot.catalog.assets.length === 488,
    "CAT-ASSET-FORMAL-ROW-UNIQUE",
    "formal source rows <-> data/source/catalogs/asset-catalog-488.json",
    { asset_count: snapshot.catalog.assets.length, problem_count: uniqueProblems.length, problems: uniqueProblems },
    { asset_count: 488, problem_count: 0, problems: [] },
    "eight formal art packages and their CSV/XLSX catalogs",
    "formal-row-authority-v1",
    "Restore a one-to-one mapping between all 488 catalog entries and unique formal source rows.",
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
    "src", "public", "config", "schemas", "tests", "tasks",
    "docs/baseline", "docs/plan", "docs/project", "docs/implementation", "docs/chapters",
  ];
  const fixed = [
    "README.md", "AGENTS.md", "CODEX_START_HERE.md", "package.json",
    "vite.config.ts", "playwright.config.ts", "tsconfig.json", "tsconfig.app.json", "tsconfig.node.json",
  ];
  const allowedExtensions = /\.(?:ts|tsx|js|jsx|mjs|cjs|json|md)$/;
  const isExplicitlyIsolated = (path) =>
    path.startsWith("tests/fixtures/baseline-negative/") ||
    path.startsWith("docs/baseline/source_text/") ||
    path === "docs/review/BASELINE_CONFLICT_REPORT.md" ||
    path === "source_packages/manifests/substitution-map.json";
  const files = [...new Set(roots.flatMap((base) => walk(snapshot.root, base)).concat(fixed))]
    .filter((path) => existsSync(join(snapshot.root, path)))
    .filter((path) => allowedExtensions.test(path))
    .filter((path) => !isExplicitlyIsolated(path))
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
  return files.concat(
    snapshot.syntheticCurrentExecutionFiles.filter((file) => !isExplicitlyIsolated(file.path)),
  );
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
    ["combat-implementation", /(?:(?:实现|开发|新增|启用|配置|编写)[^.\n]{0,35})?(?:战斗|血量|伤害|攻击|敌人\s*AI|Boss\s*战|技能树|自由实时\s*3D|combat|hit\s*points?|damage|attack|enemy\s*AI|boss\s*battle|skill[ _-]?tree|free[ _-]?roam(?:ing)?\s*3D)[^.\n]{0,35}(?:实现|系统|逻辑|handler|class|function|component|enabled|true|current|runtime|模式|功能)/i],
  ];
  const legacyProhibitionPaths = new Set([
    "AGENTS.md",
    "docs/baseline/00_SOURCE_OF_TRUTH.md",
    "docs/baseline/01_VERSION_PRIORITY.md",
    "docs/baseline/03_GLOBAL_FROZEN_RULES.md",
    "docs/baseline/07_CODEX_PREDEVELOPMENT_GATE.md",
    "docs/baseline/characters/CHAR-001_XINGYU.md",
    "tasks/TASK-001_G01正式HOPA重构.md",
  ]);
  const isProhibition = (line) =>
    /禁止|不得|不做|不属于|不是当前|不代表当前|只允许|仅.{0,20}(?:历史|结构化|归档)|废弃表达|非战斗|没有传统|无战斗|未引用|验收不通过|验收禁区/.test(line);
  const isAllowedLegacyProhibition = (file, lines, lineIndex) => {
    if (!legacyProhibitionPaths.has(file.path)) return false;
    const line = lines[lineIndex];
    if (
      /(?:禁止|不得)[^。\n]{0,30}(?:旧名[^。\n]{0,10})?小砾/.test(line) ||
      /(?:旧名[^。\n]{0,10})?小砾[^。\n]{0,30}只允许[^。\n]{0,30}(?:legacy|历史归档)/i.test(line) ||
      /小砾[^。\n]{0,20}映射为/.test(line) ||
      /(?:没有|未引用)[^。\n]{0,20}小砾/.test(line)
    ) {
      return true;
    }
    if (file.path === "tasks/TASK-001_G01正式HOPA重构.md") {
      const context = lines.slice(Math.max(0, lineIndex - 8), lineIndex + 1).join("\n");
      return /验收禁区/.test(context) &&
        /(?:出现以下任意一项，验收不通过|出现任一情况即不通过)/.test(context);
    }
    return false;
  };
  const matches = [];
  for (const file of files) {
    const lines = file.content.split(/\r?\n/);
    for (const [lineIndex, line] of lines.entries()) {
      for (const [kind, pattern] of patterns) {
        if (kind === "legacy-name" && isAllowedLegacyProhibition(file, lines, lineIndex)) continue;
        if (kind !== "legacy-name" && isProhibition(line)) continue;
        if (pattern.test(line)) {
          matches.push({
            path: `${file.path}:${lineIndex + 1}`,
            kind,
            actual: line.trim(),
            expected: "historical/prohibitive context or no current implementation semantics",
            action: "Remove the current implementation/configuration, or move genuine history to an explicitly isolated provenance path.",
          });
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
    case "scene-source-character-package": {
      const scene = snapshot.catalog.assets.find((asset) => asset.domain === "scene");
      const character = snapshot.catalog.assets.find((asset) => asset.domain === "character");
      scene.source_package = character.source_package;
      scene.source_entry = character.source_entry;
      scene.source_sha256 = character.source_sha256;
      break;
    }
    case "fx-source-character-xlsx": {
      const fx = snapshot.catalog.assets.find((asset) => asset.domain === "fx");
      const character = snapshot.characters[0];
      fx.source_package = character.source_package;
      fx.source_entry = character.registry_source_entry;
      fx.source_sha256 = character.registry_source_sha256;
      break;
    }
    case "g01-danger-source-danger-package": {
      const g01Danger = snapshot.catalog.assets.find(
        (asset) => asset.domain === "g01_addition" && asset.type === "危险视觉",
      );
      const danger = snapshot.catalog.assets.find((asset) => asset.domain === "danger");
      g01Danger.source_package = danger.source_package;
      g01Danger.source_entry = danger.source_entry;
      g01Danger.source_sha256 = danger.source_sha256;
      break;
    }
    case "all-asset-source-shas-same": {
      const sharedSha = snapshot.catalog.assets[0].source_sha256;
      for (const asset of snapshot.catalog.assets) asset.source_sha256 = sharedSha;
      break;
    }
    case "asset-missing-source-entry":
      delete snapshot.catalog.assets.find((asset) => asset.domain === "prop").source_entry;
      break;
    case "current-task-requires-combat":
      snapshot.syntheticCurrentExecutionFiles.push({
        path: "tasks/current-combat.md",
        content: "本任务要求实现战斗系统、血量、攻击和敌人AI。",
      });
      break;
    case "v2.1-direct-current-import":
      snapshot.syntheticCurrentExecutionFiles.push({
        path: "docs/plan/current-import.md",
        content: "V2.1可直接导入当前引擎运行。",
      });
      break;
    case "formal-scn001-wrong-name":
      snapshot.catalog.assets.find((asset) => asset.catalog_id === "SCN-001").name = "旧登记表错误场景名";
      break;
    case "formal-scn001-registry-status":
      snapshot.catalog.assets.find((asset) => asset.catalog_id === "SCN-001").maturity = "概念草案";
      break;
    case "formal-mech001-id-as-name":
      snapshot.catalog.assets.find((asset) => asset.catalog_id === "MECH-001").name = "MECH-001";
      break;
    case "formal-mech001-registry-status":
      snapshot.catalog.assets.find((asset) => asset.catalog_id === "MECH-001").maturity = "规则已冻结/视觉未设计";
      break;
    case "formal-ui001-wrong-confirmation":
      snapshot.catalog.assets.find((asset) => asset.catalog_id === "UI-001").confirmation_status = "未设计";
      break;
    case "formal-prop001-wrong-name":
      snapshot.catalog.assets.find((asset) => asset.catalog_id === "PROP-001").name = "错误道具名称";
      break;
    case "formal-asset-wrong-scope":
      snapshot.catalog.assets.find((asset) => asset.catalog_id === "FX-001").scope = "错误范围";
      break;
    case "formal-field-from-registry":
      snapshot.catalog.assets.find((asset) => asset.catalog_id === "UI-001").maturity = "未设计";
      break;
    case "formal-row-duplicate-id":
      snapshot.syntheticFormalRows = [{
        domain: "scene",
        row: { "资产ID": "SCN-001" },
      }];
      break;
    case "formal-catalog-missing-item":
      snapshot.catalog.assets = snapshot.catalog.assets.filter((asset) => asset.catalog_id !== "PROP-046");
      break;
    case "formal-catalog-extra-unknown-id": {
      const source = snapshot.catalog.assets.find((asset) => asset.catalog_id === "SCN-001");
      snapshot.catalog.assets.push({
        ...source,
        id: "SCN-999",
        catalog_id: "SCN-999",
        official_id: "SCN-999",
        formal_row_id: "SCN-999",
      });
      break;
    }
    case "formal-source-entry-correct-name-mismatch":
      snapshot.catalog.assets.find((asset) => asset.catalog_id === "DANGER-001").name = "来源路径正确但名称错误";
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
