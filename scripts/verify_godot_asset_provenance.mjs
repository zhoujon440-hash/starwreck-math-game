import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

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

if (failures > 0) {
  process.exitCode = 1;
} else {
  console.log(`PROVENANCE PASS ${manifest.assets.length} assets`);
}

