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
    'hint-missing-behavior-state': () => contract.hint_contracts[0].behavior_states.splice(1, 1),
    'danger-drops-evidence': () => (contract.danger_contracts[0].retain_evidence = false),
    'danger-drops-progress': () => (contract.danger_contracts[1].retain_completed_correct_steps = false),
    'wrong-use-consumes': () => (contract.critical_item_contracts[0].wrong_use_consumes = true),
    'missing-safe-node': () => (contract.danger_contracts[1].safe_recovery_node = ''),
    'invented-official-id': () => (contract.runtime_adapters[0].official_id = 'ITM-G01-010-A'),
    'dialogue-chain': () => (contract.dialogue_contracts[0].next_dialogue_id = 'DLG-G01-0013'),
    'dialogue-wrong-trigger': () => (contract.dialogue_contracts[4].trigger = '进入驾驶舱'),
    'wrong-route-resets-progress': () => (contract.wrong_route_contract.retain_completed_correct_steps = false),
    'route-window-no-expiry': () => (contract.route_window_contract.automatic_expiry = false),
    'route-window-hidden-only': () => (contract.route_window_contract.hidden_test_hotspot_is_production_trigger = true),
    'checkpoint-wrong-state': () => contract.checkpoint_contracts[0].persistent_states.push('S4'),
    'scn06-implemented': () => (contract.frozen_invariants.scn_g01_06_runtime_implemented = true),
    'unauthorized-art': () => (art.source = 'unrecorded_generation'),
  }
  if (!actions[mutation]) fail('PRB-FIXTURE-001', `unknown mutation ${mutation}`)
  else actions[mutation]()
}

check(contract.scope.join(',') === 'SCN-G01-04,SCN-G01-05', 'PRB-SCOPE-001', 'scope must be SCN04/05 only')
check(contract.schema_version === 2, 'PRB-DATA-003', 'runtime contract schema must be v2')
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
  const expectedStates = hint.task_id === 'HINT-G01-004'
    ? '["S1","S2","S3"]'
    : '["S0","S1","S2","S3","S4","S5"]'
  check(JSON.stringify(hint.behavior_states) === expectedStates, 'PRB-HINT-003', `${hint.task_id} behavior matrix invalid`)
}
for (const danger of contract.danger_contracts) {
  check(Boolean(danger.safe_recovery_node), 'PRB-DANGER-001', `${danger.danger_id} safe node missing`)
  check(JSON.stringify(danger.failure_phases) === '["S1","S2","S3","S4"]', 'PRB-DANGER-002', `${danger.danger_id} phase matrix invalid`)
  for (const field of ['retain_key_items', 'retain_hos_progress', 'retain_puzzle_progress', 'retain_evidence', 'retain_completed_correct_steps', 'duplicate_grants_forbidden', 'whole_scene_reset_forbidden', 'retry_available']) {
    check(danger[field] === true, 'PRB-DANGER-003', `${danger.danger_id}.${field} must be true`)
  }
  check(danger.soft_failure_creates_evidence === false, 'PRB-DANGER-004', `${danger.danger_id} creates evidence`)
}

const formalDialogue = json(contract.formal_sources.dialogue)
for (const dialogue of contract.dialogue_contracts) {
  const source = formalDialogue.find((entry) => entry['对话ID'] === dialogue.dialogue_id)
  check(Boolean(source), 'PRB-DIALOGUE-001', `${dialogue.dialogue_id} absent from formal dialogue`)
  check(source?.['场景ID'] === dialogue.scene_id, 'PRB-DIALOGUE-002', `${dialogue.dialogue_id} scene mismatch`)
  check(source?.['触发条件'] === dialogue.trigger, 'PRB-DIALOGUE-003', `${dialogue.dialogue_id} trigger mismatch`)
  check(source?.['跳过规则'] === '不可跳过首次' && dialogue.first_play_skippable === false, 'PRB-DIALOGUE-004', `${dialogue.dialogue_id} first play must be unskippable`)
  check(dialogue.next_dialogue_id === null, 'PRB-DIALOGUE-005', `${dialogue.dialogue_id} must not pre-chain`)
}

const expectedPersistent = '["S0","S2","S5","S6"]'
const expectedTemporary = '["S1","S3","S4"]'
for (const checkpoint of contract.checkpoint_contracts) {
  check(JSON.stringify(checkpoint.persistent_states) === expectedPersistent, 'PRB-SAVE-001', `${checkpoint.scene_id} persistent states invalid`)
  check(JSON.stringify(checkpoint.temporary_states) === expectedTemporary, 'PRB-SAVE-002', `${checkpoint.scene_id} temporary states invalid`)
}

const routeWindow = contract.route_window_contract
check(routeWindow.tutorial_id === 'TUT-MECH-003', 'PRB-ROUTE-001', 'route window tutorial mismatch')
check(routeWindow.duration_ms === 12000, 'PRB-ROUTE-002', 'route window duration mismatch')
for (const field of ['visible_countdown', 'automatic_expiry', 'refresh_restores_remaining_time', 'expired_refresh_enters_safe_node', 'preserves_bypass_installation', 'preserves_confirmed_route_nodes']) {
  check(routeWindow[field] === true, 'PRB-ROUTE-003', `route window ${field} must be true`)
}
check(routeWindow.hidden_test_hotspot_is_production_trigger === false, 'PRB-ROUTE-004', 'hidden test hotspot cannot drive production expiry')
check(routeWindow.safe_recovery_node === 'SCN-G01-05:route-safe-node' && routeWindow.expired_resume_state === 'S3', 'PRB-ROUTE-005', 'expired route must resume from S3 safe step')

const wrongRoute = contract.wrong_route_contract
check(wrongRoute.runtime_hotspot_ids.length === 2, 'PRB-ROUTE-006', 'two collision branches required')
check(wrongRoute.runtime_hotspot_ids.every((id) => contract.runtime_adapters.some((adapter) => adapter.catalog_id === id)), 'PRB-ROUTE-007', 'collision branches must be registered runtime adapters')
check(wrongRoute.stepback_scope === 'attempted_step_only', 'PRB-ROUTE-008', 'wrong route must step back only the attempted step')
for (const field of ['retain_confirmed_route_nodes', 'retain_key_items', 'retain_evidence', 'retain_completed_correct_steps', 'whole_scene_reset_forbidden']) {
  check(wrongRoute[field] === true, 'PRB-ROUTE-009', `wrong route ${field} must be true`)
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
const dialogueCode = read('src/data/dialogue/g01.ts')
for (const dialogue of contract.dialogue_contracts) {
  const start = dialogueCode.indexOf(`dialogue_id: '${dialogue.dialogue_id}'`)
  const end = dialogueCode.indexOf('\n  {', start + 1)
  const block = dialogueCode.slice(start, end === -1 ? undefined : end)
  check(start >= 0, 'PRB-DIALOGUE-006', `${dialogue.dialogue_id} runtime node missing`)
  check(block.includes(`trigger_condition: '${dialogue.trigger}'`), 'PRB-DIALOGUE-007', `${dialogue.dialogue_id} runtime trigger mismatch`)
  check(block.includes('next_dialogue_id: null'), 'PRB-DIALOGUE-008', `${dialogue.dialogue_id} runtime chain forbidden`)
  check(block.includes('skippable: false'), 'PRB-DIALOGUE-009', `${dialogue.dialogue_id} runtime first play must be unskippable`)
}

const scn04Code = read('src/scenes/g01/scn04.ts')
const scn05Code = read('src/scenes/g01/scn05.ts')
for (const [sceneId, sceneCode] of [['SCN-G01-04', scn04Code], ['SCN-G01-05', scn05Code]]) {
  const persistent = [...sceneCode.matchAll(/\b(S[0-6]):\s*\{[^\n]*safeCheckpoint:\s*true[^\n]*\}/g)].map((match) => match[1])
  check(JSON.stringify(persistent) === expectedPersistent, 'PRB-SAVE-003', `${sceneId} runtime checkpoint states invalid: ${persistent.join(',')}`)
}

const engineCode = read('src/game/engine.ts')
const uiCode = read('src/ui/GameView.ts')
const code = [scn04Code, scn05Code, engineCode, uiCode].join('\n')
for (const id of wrongRoute.runtime_hotspot_ids) {
  check(scn05Code.includes(id) && engineCode.includes(id), 'PRB-ROUTE-010', `${id} runtime implementation missing`)
}
for (const field of [routeWindow.start_field, routeWindow.deadline_field]) {
  check(engineCode.includes(field), 'PRB-ROUTE-011', `${field} persistence implementation missing`)
}
check(uiCode.includes('route-window-status') && uiCode.includes('expirePrBRouteWindow'), 'PRB-ROUTE-012', 'visible automatic route-window expiry missing')
check(!uiCode.includes("startTrigger('SCN-G01-05', '进入驾驶舱')"), 'PRB-DIALOGUE-010', 'DLG0015 must not trigger on scene entry')
check(engineCode.includes('completeHintStep') && uiCode.includes('completeHintStep'), 'PRB-HINT-004', 'level-three behavior implementation missing')
check(
  !/SCN-G01-0[67]|G02-BOUNDARY/.test([scn04Code, scn05Code].join('\n')),
  'PRB-SCOPE-002',
  'PR-B scene modules contain later-scene implementation',
)
check(
  !/g01_(?:chapter_complete|handoff_to_g02)\s*[:=]\s*true/.test(
    [scn04Code, scn05Code].join('\n'),
  ),
  'PRB-SCOPE-003',
  'PR-B scene modules write completion/handoff true',
)
check(
  !provenance.inputs.some((input) => /(pull\/5|pr-?5|third.party)/i.test(input.path)),
  'PRB-ART-012',
  'forbidden art input detected',
)

if (!process.exitCode) console.log(`G01_PR_B_VALIDATION_OK rules=${82 + assetRecords.length} assets=${assetRecords.length} critical_items=${contract.critical_item_contracts.length} negative_mutations=19`)
