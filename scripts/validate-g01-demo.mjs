#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { extname, resolve } from 'node:path'
import process from 'node:process'

const root = resolve(import.meta.dirname, '..')
const read = (path) => readFileSync(resolve(root, path), 'utf8')
const json = (path) => JSON.parse(read(path))
const hash = (path) =>
  createHash('sha256').update(readFileSync(resolve(root, path))).digest('hex')
const errors = []
let rules = 0
const check = (condition, id, message) => {
  rules += 1
  if (!condition) errors.push(`${id}: ${message}`)
}

const contract = structuredClone(
  json('data/source/g01/pr-c/runtime-contract.json'),
)
const art = structuredClone(
  json('data/source/g01/pr-c/runtime-art-manifest.json'),
)
const provenance = structuredClone(
  json('docs/art/G01_PR_C_RUNTIME_ASSET_PROVENANCE.json'),
)
const mutation = process.argv.find((arg) => arg.startsWith('--mutation='))?.split('=')[1]
if (mutation) {
  const actions = {
    'star-core-one': () =>
      (contract.completion_contract.writes.world_star_core_count = 1),
    'early-completion': () => (contract.completion_contract.write_state = 'S5'),
    'g02-gameplay': () =>
      (contract.completion_contract.g02_boundary_gameplay.hotspots = 1),
    'advanced-ability': () =>
      contract.ability_contract.must_remain_locked.pop(),
    'ability-order': () =>
      contract.ability_contract.ordered_unlocks.reverse(),
    'hint-missing-level': () =>
      contract.hint_contracts[0].levels.splice(1, 1),
    'hint-completes-all': () =>
      (contract.hint_contracts[1].levels[2].semantics = 'complete_all'),
    'danger-drops-item': () =>
      (contract.danger_contract.retain_key_items = false),
    'danger-drops-hos': () =>
      (contract.danger_contract.retain_hos_progress = false),
    'danger-drops-evidence': () =>
      (contract.danger_contract.retain_evidence = false),
    'danger-no-refresh-node': () =>
      (contract.danger_contract.refresh_stays_at_safe_node = false),
    'danger-creates-evidence': () =>
      (contract.danger_contract.soft_failure_creates_evidence = true),
    'invented-official-id': () =>
      (contract.runtime_adapters[0].official_id = 'HOS-G01-006'),
    'unauthorized-art': () => (art.source = 'unrecorded_generation'),
    'missing-runtime-asset': () =>
      (art.scenes[0].runtime_asset = false),
    'pr5-art': () =>
      provenance.source_files.push({
        path: 'pull/5/generated.png',
        sha256: '0'.repeat(64),
      }),
  }
  if (!actions[mutation]) errors.push(`DEMO-FIXTURE-001: unknown mutation ${mutation}`)
  else actions[mutation]()
}

check(
  JSON.stringify(contract.scope) ===
    '["SCN-G01-06","SCN-G01-07","G02-BOUNDARY"]',
  'DEMO-SCOPE-001',
  'scope must contain SCN06, SCN07 and read-only boundary only',
)
check(
  contract.version === 'G01-DEMO-0.1.0',
  'DEMO-VERSION-001',
  'demo version mismatch',
)

for (const scene of contract.scene_contracts) {
  check(
    JSON.stringify(scene.states) === '["S0","S1","S2","S3","S4","S5","S6"]',
    'DEMO-STATE-001',
    `${scene.scene_id} must use S0-S6`,
  )
  check(
    JSON.stringify(scene.persistent_states) === '["S0","S2","S5","S6"]',
    'DEMO-SAVE-001',
    `${scene.scene_id} persistent checkpoint set invalid`,
  )
  check(
    JSON.stringify(scene.temporary_states) === '["S1","S3","S4"]',
    'DEMO-SAVE-002',
    `${scene.scene_id} temporary state set invalid`,
  )
}

for (const adapter of contract.runtime_adapters) {
  check(
    adapter.official_id === null,
    'DEMO-ID-001',
    `${adapter.catalog_id} invents an official ID`,
  )
  check(
    adapter.catalog_id.startsWith('RUNTIME-') || adapter.catalog_id === 'G02-BOUNDARY',
    'DEMO-ID-002',
    `${adapter.catalog_id} runtime namespace invalid`,
  )
  check(Boolean(adapter.formal_parent_id), 'DEMO-ID-003', `${adapter.catalog_id} formal parent missing`)
}

for (const hint of contract.hint_contracts) {
  check(
    JSON.stringify(hint.levels.map((entry) => entry.level)) === '[1,2,3]',
    'DEMO-HINT-001',
    `${hint.task_id} levels invalid`,
  )
  check(
    JSON.stringify(hint.levels.map((entry) => entry.semantics)) ===
      '["direction","area","complete_one_step"]',
    'DEMO-HINT-002',
    `${hint.task_id} semantics invalid`,
  )
  check(
    JSON.stringify(hint.behavior_states) === '["S0","S1","S2","S3","S4","S5"]',
    'DEMO-HINT-003',
    `${hint.task_id} behavior coverage invalid`,
  )
}

const danger = contract.danger_contract
check(
  danger.safe_recovery_node === 'SCN-G01-07:orbit-safe-node',
  'DEMO-DANGER-001',
  'safe recovery node mismatch',
)
check(
  JSON.stringify(danger.failure_phases) === '["S1","S2","S3","S4"]',
  'DEMO-DANGER-002',
  'soft-failure phase matrix invalid',
)
for (const field of [
  'retain_key_items',
  'retain_hos_progress',
  'retain_puzzle_progress',
  'retain_evidence',
  'retain_completed_correct_steps',
  'duplicate_grants_forbidden',
  'whole_scene_reset_forbidden',
  'retry_available',
  'refresh_stays_at_safe_node',
]) {
  check(danger[field] === true, 'DEMO-DANGER-003', `${field} must be true`)
}
check(
  danger.soft_failure_creates_evidence === false,
  'DEMO-DANGER-004',
  'soft failure cannot create evidence',
)

check(
  JSON.stringify(contract.ability_contract.ordered_unlocks) ===
    '["ability_qima_search","ability_analysis","ability_pathfinding"]',
  'DEMO-ABILITY-001',
  'basic ability order invalid',
)
check(
  JSON.stringify(contract.ability_contract.must_remain_locked) ===
    '["ability_teleport","ability_shrink","ability_clone"]',
  'DEMO-ABILITY-002',
  'advanced abilities must remain locked',
)

const completion = contract.completion_contract
check(
  completion.write_scene === 'SCN-G01-07' && completion.write_state === 'S6',
  'DEMO-COMPLETE-001',
  'completion may only be written after SCN07 S6',
)
check(
  completion.writes.g01_chapter_complete === true &&
    completion.writes.g01_handoff_to_g02 === true &&
    completion.writes.world_star_core_count === 0,
  'DEMO-COMPLETE-002',
  'final variables invalid',
)
check(
  Object.values(completion.g02_boundary_gameplay).every((count) => count === 0),
  'DEMO-BOUNDARY-001',
  'G02 boundary contains gameplay',
)

const allAssets = [
  ...art.scenes,
  ...art.closeups,
  ...art.items,
  ...art.hos_targets,
  ...art.distractors,
  ...art.state_layers,
]
check(
  art.source === 'project_owner_authorized_runtime_production',
  'DEMO-ART-001',
  'runtime art authorization invalid',
)
check(
  provenance.source_label === art.source,
  'DEMO-ART-002',
  'provenance status mismatch',
)
check(art.scenes.length === 2, 'DEMO-ART-003', 'two backgrounds required')
check(art.hos.targets.length === 4, 'DEMO-HOS-001', 'SCN06 HOS needs four targets')
check(art.hos.distractors.length >= 3, 'DEMO-HOS-002', 'SCN06 HOS distractors missing')
for (const scene of art.scenes) {
  check(
    scene.width === 3840 && scene.height === 2160,
    'DEMO-ART-004',
    `${scene.asset_id} must be 3840x2160`,
  )
}
for (const asset of allAssets) {
  check(asset.runtime_asset === true, 'DEMO-ART-005', `${asset.asset_id} not marked runtime`)
  check(/^[a-f0-9]{64}$/.test(asset.sha256), 'DEMO-ART-006', `${asset.asset_id} SHA missing`)
  check(existsSync(resolve(root, asset.runtime_path)), 'DEMO-ART-007', `${asset.runtime_path} missing`)
  if (existsSync(resolve(root, asset.runtime_path))) {
    check(hash(asset.runtime_path) === asset.sha256, 'DEMO-ART-008', `${asset.runtime_path} SHA mismatch`)
  }
  check(extname(asset.runtime_path).toLowerCase() !== '.svg', 'DEMO-ART-009', `${asset.runtime_path} SVG forbidden`)
  check(asset.source === art.source, 'DEMO-ART-010', `${asset.asset_id} source mismatch`)
}
for (const input of provenance.source_files) {
  check(
    !/(pull\/5|pr-?5|third.party)/i.test(input.path),
    'DEMO-ART-011',
    `${input.path} forbidden source`,
  )
  check(existsSync(resolve(root, input.path)), 'DEMO-ART-012', `${input.path} input missing`)
  if (existsSync(resolve(root, input.path))) {
    check(hash(input.path) === input.sha256, 'DEMO-ART-013', `${input.path} input SHA mismatch`)
  }
}

const formalText = Object.values(contract.formal_sources)
  .map((path) => read(path))
  .join('\n')
for (const id of [
  'SCN-G01-06',
  'SCN-G01-07',
  'HS-G01-0025',
  'HS-G01-0026',
  'HS-G01-0027',
  'HS-G01-0028',
  'HS-G01-0029',
  'HS-G01-0030',
  'HS-G01-0031',
  'ITM-G01-013',
  'ITM-G01-014',
  'DLG-G01-0017',
  'DLG-G01-0024',
  'DANGER-G01-004',
]) {
  check(formalText.includes(id), 'DEMO-SOURCE-001', `${id} missing from formal source data`)
}

const scn06 = read('src/scenes/g01/scn06.ts')
const scn07 = read('src/scenes/g01/scn07.ts')
const engine = read('src/game/engine.ts')
const view = read('src/ui/GameView.ts')
const runtime = [scn06, scn07, engine, view].join('\n')
for (const id of [
  'RUNTIME-HOS-G01-06-SIGNAL-TRACE',
  'RUNTIME-PUZ-G01-SIGNAL-ALIGNMENT',
  'RUNTIME-PUZ-G01-LANDING-TRIANGULATION',
  'RUNTIME-PUZ-G01-IMPACT-DAMPING',
  'SCN-G01-07:orbit-safe-node',
  'completeG01Handoff',
]) {
  check(runtime.includes(id), 'DEMO-RUNTIME-001', `${id} runtime implementation missing`)
}
check(
  engine.includes("session.currentSceneId === 'G02-BOUNDARY'") &&
    engine.includes('session.flags.g01_scn07_complete === true'),
  'DEMO-COMPLETE-003',
  'final flag guard missing',
)
check(
  scn07.includes('hotspots: []') &&
    scn07.includes('items: []') &&
    scn07.includes('transitions: []'),
  'DEMO-BOUNDARY-002',
  'read-only boundary definition invalid',
)
check(
  !/(战斗|血量|伤害|攻击|敌人AI|Boss战|技能树|自由实时3D)/.test(
    [scn06, scn07].join('\n'),
  ),
  'DEMO-SCOPE-002',
  'forbidden gameplay implementation found',
)
check(
  contract.pwa_contract.manifest &&
    contract.pwa_contract.service_worker &&
    contract.pwa_contract.installable &&
    contract.pwa_contract.first_load_then_offline,
  'DEMO-PWA-001',
  'PWA contract incomplete',
)
check(
  existsSync(resolve(root, 'vite.config.ts')) &&
    read('vite.config.ts').includes('VitePWA') &&
    read('vite.config.ts').includes("GITHUB_PAGES === 'true'") &&
    !read('vite.config.ts').includes("includeAssets: ['assets/**/*']"),
  'DEMO-PWA-002',
  'PWA production base or non-duplicated precache configuration missing',
)
for (const path of [
  'playwright.pwa.config.ts',
  'tests-pwa/g01-demo-pwa.spec.ts',
  'scripts/serve-g01-demo-preview.mjs',
  'scripts/package-g01-demo.mjs',
]) {
  check(existsSync(resolve(root, path)), 'DEMO-PWA-003', `${path} missing`)
}
const pwaTest = read('tests-pwa/g01-demo-pwa.spec.ts')
for (const evidence of [
  'navigator.serviceWorker.ready',
  'context.setOffline(true)',
  'manifest.webmanifest',
  '/starwreck-math-game/assets/g01/pr-c/',
]) {
  check(pwaTest.includes(evidence), 'DEMO-PWA-004', `${evidence} PWA assertion missing`)
}
check(
  existsSync(resolve(root, 'tests-e2e/g01-demo.spec.ts')) &&
    read('tests-e2e/g01-demo.spec.ts').includes('SCN00—SCN07'),
  'DEMO-E2E-001',
  'continuous demo traversal missing',
)
const e2e = read('tests-e2e/g01-demo.spec.ts')
for (const scene of ['00', '01', '02', '03', '04', '05', '06', '07']) {
  check(
    e2e.includes(`scn${scene}-02-middle`),
    'DEMO-E2E-002',
    `SCN${scene} middle-state visual evidence missing`,
  )
}
const demoWorkflow = read('.github/workflows/g01-demo-gate.yml')
for (const command of [
  'npm run validate:g01-demo',
  'npm run test:g01-demo',
  'npm run test:e2e',
  'npm run test:pwa',
  'npm run package:g01-demo',
]) {
  check(demoWorkflow.includes(command), 'DEMO-CI-001', `${command} gate step missing`)
}
const deployWorkflow = read('.github/workflows/deploy-g01-demo.yml')
check(
  deployWorkflow.includes('actions/deploy-pages@v4') &&
    deployWorkflow.includes('GITHUB_PAGES: "true"'),
  'DEMO-DEPLOY-001',
  'GitHub Pages production deployment missing',
)
for (const path of [
  'README_DEMO.md',
  'docs/story-runtime/G01_DEMO_SCENES_06_07.md',
  'docs/review/G01_DEMO_VISUAL_ACCEPTANCE.md',
]) {
  check(existsSync(resolve(root, path)), 'DEMO-DOC-001', `${path} missing`)
}

if (errors.length) {
  console.error(errors.join('\n'))
  process.exit(1)
}
console.log(
  `G01_DEMO_VALIDATION_OK rules=${rules} assets=${allAssets.length} negative_mutations=16`,
)
