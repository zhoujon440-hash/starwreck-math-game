#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { extname, resolve } from 'node:path'
import process from 'node:process'

const root = resolve(import.meta.dirname, '..')
const read = (path) => readFileSync(resolve(root, path), 'utf8')
const json = (path) => JSON.parse(read(path))
const hash = (path) => createHash('sha256').update(readFileSync(resolve(root, path))).digest('hex')
const fail = (id, message) => {
  console.error(`${id}: ${message}`)
  process.exitCode = 1
}
const check = (condition, id, message) => condition || fail(id, message)

const contract = structuredClone(json('data/source/g01/pr-b/runtime-contract.json'))
const art = structuredClone(json('data/source/g01/pr-b/runtime-art-manifest.json'))
const provenance = structuredClone(json('docs/art/G01_PR_B_RUNTIME_ASSET_PROVENANCE.json'))
const mutation = process.argv.find((arg) => arg.startsWith('--mutation='))?.split('=')[1]
if (mutation) {
  const actions = {
    'star-core-one': () => (contract.frozen_invariants.world_star_core_count = 1),
    'chapter-complete': () => (contract.frozen_invariants.g01_chapter_complete = true),
    'handoff-g02': () => (contract.frozen_invariants.g01_handoff_to_g02 = true),
    'ability-unlocked': () => (contract.frozen_invariants.ability_analysis = true),
    'hint-missing-level': () => contract.hint_contracts[0].levels.splice(1, 1),
    'danger-drops-evidence': () => (contract.danger_contracts[0].retain_evidence = false),
    'danger-drops-progress': () => (contract.danger_contracts[1].retain_completed_correct_steps = false),
    'wrong-use-consumes': () => (contract.critical_item_contracts[0].wrong_use_consumes = true),
    'missing-safe-node': () => (contract.danger_contracts[1].safe_recovery_node = ''),
    'invented-official-id': () => (contract.runtime_adapters[0].official_id = 'ITM-G01-010-A'),
    'scn06-implemented': () => (contract.frozen_invariants.scn_g01_06_runtime_implemented = true),
    'unauthorized-art': () => (art.source = 'unrecorded_generation'),
  }
  if (!actions[mutation]) fail('PRB-FIXTURE-001', `unknown mutation ${mutation}`)
  else actions[mutation]()
}

check(contract.scope.join(',') === 'SCN-G01-04,SCN-G01-05', 'PRB-SCOPE-001', 'scope must be SCN04/05 only')
for (const [key, expected] of Object.entries({
  world_star_core_count: 0,
  g01_chapter_complete: false,
  g01_handoff_to_g02: false,
  ability_qima_search: false,
  ability_analysis: false,
  ability_pathfinding: false,
  ability_teleport: false,
  ability_shrink: false,
  ability_clone: false,
  scn_g01_06_runtime_implemented: false,
  g02_gameplay_implemented: false,
})) check(contract.frozen_invariants[key] === expected, 'PRB-INV-001', `${key} invariant violated`)

for (const adapter of contract.runtime_adapters) {
  check(adapter.official_id === null, 'PRB-DATA-001', `${adapter.catalog_id} must not invent an official ID`)
  check(adapter.catalog_id.startsWith('RUNTIME-'), 'PRB-DATA-002', `${adapter.catalog_id} needs runtime namespace`)
}
for (const item of contract.critical_item_contracts) {
  check(item.wrong_use_consumes === false, 'PRB-ITEM-001', `${item.scene_id}/${item.item_id} consumes`)
  check(item.wrong_use_changes_progress === false, 'PRB-ITEM-002', `${item.scene_id}/${item.item_id} changes progress`)
}
for (const hint of contract.hint_contracts) {
  check(JSON.stringify(hint.levels.map((x) => x.level)) === '[1,2,3]', 'PRB-HINT-001', `${hint.task_id} levels invalid`)
  check(JSON.stringify(hint.levels.map((x) => x.semantics)) === '["direction","area","complete_one_step"]', 'PRB-HINT-002', `${hint.task_id} semantics invalid`)
}
for (const danger of contract.danger_contracts) {
  check(Boolean(danger.safe_recovery_node), 'PRB-DANGER-001', `${danger.danger_id} safe node missing`)
  check(JSON.stringify(danger.failure_phases) === '["S1","S2","S3","S4"]', 'PRB-DANGER-002', `${danger.danger_id} phase matrix invalid`)
  for (const field of ['retain_key_items', 'retain_hos_progress', 'retain_puzzle_progress', 'retain_evidence', 'retain_completed_correct_steps', 'duplicate_grants_forbidden', 'whole_scene_reset_forbidden', 'retry_available']) {
    check(danger[field] === true, 'PRB-DANGER-003', `${danger.danger_id}.${field} must be true`)
  }
  check(danger.soft_failure_creates_evidence === false, 'PRB-DANGER-004', `${danger.danger_id} creates evidence`)
}

check(art.source === 'project_owner_authorized_runtime_production', 'PRB-ART-001', 'art source authorization invalid')
check(provenance.status === art.source, 'PRB-ART-002', 'provenance status mismatch')
check(art.scenes.length === 2, 'PRB-ART-003', 'two scene backgrounds required')
check(art.hos.hos_id === 'HOS-G01-004' && art.hos.targets.length === 4, 'PRB-DATA-003', 'HOS-G01-004 needs four targets')
for (const scene of art.scenes) {
  check(scene.width === 3840 && scene.height === 2160, 'PRB-ART-004', `${scene.asset_id} not 3840x2160`)
}
const assetRecords = [...art.scenes, ...art.items, ...art.distractors, ...art.state_layers]
for (const item of assetRecords) {
  check(item.runtime_asset === true, 'PRB-ART-005', `${item.asset_id} not runtime`)
  check(Boolean(item.sha256), 'PRB-ART-006', `${item.asset_id} missing SHA`)
  check(existsSync(resolve(root, item.runtime_path)), 'PRB-ART-007', `${item.runtime_path} missing`)
  if (existsSync(resolve(root, item.runtime_path))) check(hash(item.runtime_path) === item.sha256, 'PRB-ART-008', `${item.runtime_path} SHA mismatch`)
  check(extname(item.runtime_path).toLowerCase() !== '.svg', 'PRB-ART-009', `${item.runtime_path} SVG forbidden`)
}
for (const input of provenance.inputs) {
  check(existsSync(resolve(root, input.path)), 'PRB-ART-010', `${input.path} input missing`)
  if (existsSync(resolve(root, input.path))) check(hash(input.path) === input.sha256, 'PRB-ART-011', `${input.path} input SHA mismatch`)
}

const formalText = Object.values(contract.formal_sources).map((path) => read(path)).join('\n')
for (const id of ['HS-G01-0017', 'HS-G01-0018', 'HS-G01-0019', 'HS-G01-0020', 'HS-G01-0021', 'HS-G01-0022', 'HS-G01-0023', 'HS-G01-0024', 'HOS-G01-004', 'ITM-G01-010', 'ITM-G01-011', 'ITM-G01-012', 'TUT-MECH-002', 'TUT-MECH-003', 'DANGER-G01-003', 'DANGER-G01-004']) {
  check(formalText.includes(id), 'PRB-SOURCE-001', `${id} absent from formal data`)
}
const code = ['src/scenes/g01/scn04.ts', 'src/scenes/g01/scn05.ts', 'src/game/engine.ts', 'src/ui/GameView.ts'].map(read).join('\n')
check(!/enterScene\(['"]SCN-G01-06/.test(code), 'PRB-SCOPE-002', 'SCN-G01-06 runtime entry implemented')
check(!/g01_(?:chapter_complete|handoff_to_g02)\s*[:=]\s*true/.test(code), 'PRB-SCOPE-003', 'completion/handoff written true')
check(
  !provenance.inputs.some((input) => /(pull\/5|pr-?5|third.party)/i.test(input.path)),
  'PRB-ART-012',
  'forbidden art input detected',
)

if (!process.exitCode) console.log(`G01_PR_B_VALIDATION_OK rules=${46 + assetRecords.length} assets=${assetRecords.length} critical_items=${contract.critical_item_contracts.length} negative_mutations=12`)
