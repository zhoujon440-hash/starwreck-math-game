import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync(new URL("../godot/data/asset_provenance.json", import.meta.url), "utf8"));
const sha256 = (path) => createHash("sha256").update(readFileSync(new URL(`../${path}`, import.meta.url))).digest("hex");
let failures = 0;

for (const entry of manifest.assets) {
  const sourceHash = sha256(entry.source);
  const targetHash = sha256(entry.target);
  if (sourceHash !== entry.sha256 || targetHash !== entry.sha256) {
    console.error(`PROVENANCE FAIL ${entry.source} -> ${entry.target}`);
    failures += 1;
  }
}

const originalAssetDirectory = new URL("../godot/assets/original/", import.meta.url);
for (const filename of readdirSync(originalAssetDirectory).filter((name) => name.endsWith(".provenance.json")).sort()) {
  const provenance = JSON.parse(readFileSync(new URL(filename, originalAssetDirectory), "utf8"));
  const assetHash = sha256(provenance.asset);
  if (assetHash !== provenance.sha256) {
    console.error(`ORIGINAL PROVENANCE FAIL ${provenance.asset}`);
    failures += 1;
  }
}

if (failures > 0) {
  process.exitCode = 1;
} else {
  const originalCount = readdirSync(originalAssetDirectory).filter((name) => name.endsWith(".provenance.json")).length;
  console.log(`PROVENANCE PASS ${manifest.assets.length} inherited + ${originalCount} original assets`);
}

