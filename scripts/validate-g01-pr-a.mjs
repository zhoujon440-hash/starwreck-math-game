#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { extname, join, relative, resolve } from 'node:path'
import process from 'node:process'

const root = resolve(import.meta.dirname, '..')
const readJson = (path) => JSON.parse(readFileSync(resolve(root, path), 'utf8'))
const clone = (value) => structuredClone(value)
const fail = (id, message) => {
  console.error(`${id}: ${message}`)
  process.exitCode = 1
}
const check = (condition, id, message) => {
  if (!condition) fail(id, message)
}
const sha256 = (path) =>
  createHash('sha256').update(readFileSync(resolve(root, path))).digest('hex')
const walk = (directory) =>
  readdirSync(resolve(root, directory), { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name).replaceAll('\\', '/')
    return entry.isDirectory() ? walk(path) : [path]
  })

const adapter = clone(readJson('data/source/g01/pr-a/runtime-adapter.json'))
const scn02 = clone(readJson('data/source/g01/pr-a/scn-g01-02-art-manifest.json'))
const scn03 = clone(readJson('data/source/g01/pr-a/scn-g01-03-art-manifest.json'))
const provenance = clone(readJson('docs/art/G01_PR_A_RUNTIME_ASSET_PROVENANCE.json'))
const fixtureArg = process.argv.find((argument) => argument.startsWith('--fixture='))
const fixture = fixtureArg
  ? readJson(fixtureArg.slice('--fixture='.length))
  : null

if (fixture) {
  switch (fixture.mutation) {
    case 'critical-item-consumes':
      adapter.critical_item_contracts[0].wrong_use_consumes = true
      break
    case 'danger-drops-progress':
      adapter.scenes[1].danger_contract.retain_completed_correct_steps = false
      break
    case 'star-core-one':
      adapter.frozen_invariants.world_star_core_count = 1
      break
    case 'chapter-complete':
      adapter.frozen_invariants.g01_chapter_complete = true
      break
    case 'scn04-implemented':
      adapter.frozen_invariants.scn_g01_04_runtime_implemented = true
      break
    case 'missing-sha':
      scn03.scene_asset.sha256 = ''
      break
    case 'unauthorized-source':
      provenance.production_status = 'unrecorded_generation'
      break
    case 'hint-missing-level':
      adapter.hint_contracts[0].levels.splice(1, 1)
      break
    default:
      fail('PRA-FIXTURE-UNKNOWN', `unknown mutation ${fixture.mutation}`)
  }
}

check(
  adapter.scope.join(',') === 'SCN-G01-02,SCN-G01-03',
  'PRA-SCOPE-001',
  'adapter scope must contain exactly SCN-G01-02 and SCN-G01-03',
)
check(
  adapter.frozen_invariants.world_star_core_count === 0,
  'PRA-INV-001',
  'world_star_core_count must remain 0',
)
check(
  adapter.frozen_invariants.g01_chapter_complete === false,
  'PRA-INV-002',
  'g01_chapter_complete must remain false',
)
check(
  adapter.frozen_invariants.g01_handoff_to_g02 === false,
  'PRA-INV-003',
  'g01_handoff_to_g02 must remain false',
)
check(
  adapter.frozen_invariants.scn_g01_04_runtime_implemented === false,
  'PRA-SCOPE-002',
  'SCN-G01-04 runtime implementation is forbidden in PR-A',
)
check(
  adapter.frozen_invariants.g02_gameplay_implemented === false,
  'PRA-SCOPE-003',
  'G02 gameplay is forbidden in PR-A',
)

for (const contract of adapter.critical_item_contracts) {
  check(
    contract.wrong_use_consumes === false,
    'PRA-ITEM-001',
    `${contract.scene_id}/${contract.item_id} consumes on wrong use`,
  )
  check(
    contract.wrong_use_changes_progress === false,
    'PRA-ITEM-002',
    `${contract.scene_id}/${contract.item_id} changes progress on wrong use`,
  )
}

const danger = adapter.scenes.find((scene) => scene.scene_id === 'SCN-G01-03')
  ?.danger_contract
check(Boolean(danger?.safe_recovery_node), 'PRA-DANGER-001', 'safe recovery node missing')
for (const field of [
  'retain_key_items',
  'retain_evidence',
  'retain_completed_correct_steps',
  'retain_confirmed_mechanism_progress',
  'duplicate_grants_forbidden',
  'whole_scene_reset_forbidden',
  'retry_available',
]) {
  check(
    danger?.[field] === true,
    'PRA-DANGER-002',
    `danger contract ${field} must be true`,
  )
}

for (const hint of adapter.hint_contracts) {
  check(hint.levels.length === 3, 'PRA-HINT-001', `${hint.task_id} must have 3 levels`)
  check(
    JSON.stringify(hint.levels.map((level) => level.level)) === '[1,2,3]',
    'PRA-HINT-002',
    `${hint.task_id} levels must be ordered 1/2/3`,
  )
  check(
    JSON.stringify(hint.levels.map((level) => level.semantics)) ===
      '["direction","area","complete_one_step"]',
    'PRA-HINT-003',
    `${hint.task_id} semantics must be direction/area/complete_one_step`,
  )
}

check(scn02.scene_id === 'SCN-G01-02', 'PRA-ART-001', 'SCN02 art manifest mismatch')
check(scn03.scene_id === 'SCN-G01-03', 'PRA-ART-002', 'SCN03 art manifest mismatch')
check(
  scn02.clue_search.official_hos_id === null,
  'PRA-DATA-001',
  'SCN02 must not invent a formal HOS ID',
)
check(
  scn03.hos.hos_id === 'HOS-G01-003',
  'PRA-DATA-002',
  'SCN03 must use formal HOS-G01-003',
)
check(
  scn03.hos.targets.length === 4 && scn03.hos.distractors.length >= 2,
  'PRA-DATA-003',
  'HOS-G01-003 needs four targets and formal distractors',
)
check(
  provenance.production_status === 'project_owner_authorized_runtime_production',
  'PRA-ART-003',
  'runtime production authorization is invalid',
)
check(
  Object.values(provenance.forbidden_sources).every((value) => value === false),
  'PRA-ART-004',
  'forbidden art source or method was used',
)

const runtimeEntries = Object.entries(provenance.runtime_sha256)
check(runtimeEntries.length >= 36, 'PRA-ART-005', 'expected at least 36 runtime assets')
const productionInputs = Object.entries(provenance.production_inputs)
check(
  productionInputs.length === 6,
  'PRA-ART-016',
  'expected all six checked-in runtime production inputs',
)
for (const [path, expectedSha] of productionInputs) {
  check(existsSync(resolve(root, path)), 'PRA-ART-017', `production input missing: ${path}`)
  if (existsSync(resolve(root, path))) {
    check(
      sha256(path) === expectedSha,
      'PRA-ART-018',
      `production input SHA mismatch: ${path}`,
    )
  }
}
for (const [path, expectedSha] of runtimeEntries) {
  check(existsSync(resolve(root, path)), 'PRA-ART-006', `runtime asset missing: ${path}`)
  if (existsSync(resolve(root, path))) {
    check(
      sha256(path) === expectedSha,
      'PRA-ART-007',
      `runtime asset SHA mismatch: ${path}`,
    )
  }
  check(
    !['.svg'].includes(extname(path).toLowerCase()),
    'PRA-ART-008',
    `vector placeholder is forbidden: ${path}`,
  )
}

for (const scene of [scn02.scene_asset, scn03.scene_asset]) {
  check(scene.runtime_asset === true, 'PRA-ART-009', `${scene.asset_id} is not runtime`)
  check(scene.width === 3840 && scene.height === 2160, 'PRA-ART-010', `${scene.asset_id} is not 3840x2160`)
  check(Boolean(scene.sha256), 'PRA-ART-011', `${scene.asset_id} SHA is missing`)
  if (existsSync(resolve(root, scene.runtime_path))) {
    check(
      sha256(scene.runtime_path) === scene.sha256 &&
        provenance.runtime_sha256[scene.runtime_path] === scene.sha256,
      'PRA-ART-019',
      `${scene.asset_id} manifest, provenance and file SHA disagree`,
    )
  }
}

for (const target of [
  ...scn02.clue_search.targets,
  ...scn03.hos.targets,
]) {
  check(target.source === 'project_owner_authorized_runtime_production', 'PRA-ART-012', `${target.asset_id} source invalid`)
  check(existsSync(resolve(root, target.scene_asset)), 'PRA-ART-013', `${target.asset_id} scene asset missing`)
  check(existsSync(resolve(root, target.inventory_asset)), 'PRA-ART-014', `${target.asset_id} inventory asset missing`)
  if (target.official_id === undefined) {
    fail('PRA-DATA-004', `${target.asset_id} must explicitly record official_id`)
  }
  if (
    existsSync(resolve(root, target.scene_asset)) &&
    existsSync(resolve(root, target.inventory_asset))
  ) {
    check(
      sha256(target.scene_asset) === target.scene_sha256 &&
        sha256(target.inventory_asset) === target.inventory_sha256,
      'PRA-ART-020',
      `${target.asset_id} scene/inventory SHA disagrees with manifest`,
    )
  }
}

for (const path of Object.values(adapter.formal_sources)) {
  check(existsSync(resolve(root, path)), 'PRA-SOURCE-001', `formal source missing: ${path}`)
}

const runtimeCode = [
  ...walk('src'),
  'data/source/g01/pr-a/runtime-adapter.json',
].map((path) => readFileSync(resolve(root, path), 'utf8')).join('\n')
check(
  !/g01_chapter_complete\s*[:=]\s*true/.test(runtimeCode),
  'PRA-SCOPE-004',
  'PR-A writes g01_chapter_complete=true',
)
check(
  !/g01_handoff_to_g02\s*[:=]\s*true/.test(runtimeCode),
  'PRA-SCOPE-005',
  'PR-A writes g01_handoff_to_g02=true',
)
check(
  !/SCN-G01-0[4-9]|SCN-G01-1[0-9]/.test(
    walk('src').map((path) => readFileSync(resolve(root, path), 'utf8')).join('\n'),
  ),
  'PRA-SCOPE-006',
  'runtime code contains SCN-G01-04 or later scene implementation',
)
check(
  !/(assets\/generated|pull\/5|PR\s*#?5)/i.test(JSON.stringify(provenance)),
  'PRA-ART-015',
  'PR #5 art reference detected',
)

if (!process.exitCode) {
  const rules =
    6 +
    adapter.critical_item_contracts.length * 2 +
    8 +
    adapter.hint_contracts.length * 3 +
    runtimeEntries.length +
    productionInputs.length +
    20
  console.log(
    `G01_PR_A_VALIDATION_OK rules=${rules} assets=${runtimeEntries.length} ` +
      `critical_items=${adapter.critical_item_contracts.length} hints=${adapter.hint_contracts.length}`,
  )
}
