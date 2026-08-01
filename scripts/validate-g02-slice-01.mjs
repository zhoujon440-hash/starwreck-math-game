#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { extname, resolve } from 'node:path'
import process from 'node:process'

const root = resolve(import.meta.dirname, '..')
const read = (path) => readFileSync(resolve(root, path), 'utf8')
const json = (path) => JSON.parse(read(path))
const bytes = (path) => readFileSync(resolve(root, path))
const hashBuffer = (value) => createHash('sha256').update(value).digest('hex')
const hash = (path) => hashBuffer(bytes(path))
const failures = []
let ruleCount = 0
const check = (condition, id, message) => {
  ruleCount += 1
  if (!condition) failures.push(`${id}: ${message}`)
}

const contract = structuredClone(json('data/source/g02/slice-01/runtime-contract.json'))
const art = structuredClone(json('data/source/g02/slice-01/runtime-art-manifest.json'))
const provenance = structuredClone(
  json('docs/art/G02_SLICE_01_RUNTIME_ASSET_PROVENANCE.json'),
)
const mutation = process.argv.find((arg) => arg.startsWith('--mutation='))?.split('=')[1]
let injectedUiText = ''

if (mutation) {
  const actions = {
    'scope-add-scn03': () => contract.runtime_scope.push('SCN-G02-03A'),
    'boundary-interactive': () => (contract.read_only_boundary.interactive = true),
    'star-core-one': () => contract.allowed_completed_formal_variables.push('world_star_core_count'),
    'chapter-complete': () => contract.allowed_completed_formal_variables.push('g02_chapter_complete'),
    'ability-early': () => contract.allowed_completed_formal_variables.push('g02_magnetic_glove_owned'),
    'adapter-fake-official': () => (contract.runtime_adapters[0].official_id = 'HS-G02-0099'),
    'hint-missing-level': () => contract.hint_contracts[0].levels.splice(1, 1),
    'hint-wrong-semantics': () => (contract.hint_contracts[1].levels[2].semantics = 'direction'),
    'hint-wrong-formal-text': () => (contract.hint_contracts[2].levels[0].text = '检查任意区域。'),
    'hint-completes-whole-puzzle': () =>
      (contract.hint_contracts[0].levels[2].effect = 'complete_puzzle'),
    'pulse-text-answer-buttons': () =>
      (contract.mechanism_contracts[0].answer_text_buttons = true),
    'resource-text-answer-buttons': () =>
      (contract.mechanism_contracts[1].interaction = 'text_answer_buttons'),
    'formal-ui-developer-copy': () => (injectedUiText = '垂直切片已完成'),
    'wrong-use-consumes': () => (contract.critical_item_contracts[0].wrong_use_consumes = true),
    'duplicate-grant': () => (contract.critical_item_contracts[1].duplicate_grant_forbidden = false),
    'danger-no-safe-node': () => (contract.danger_contracts[0].safe_recovery_node = ''),
    'danger-drops-evidence': () => (contract.danger_contracts[1].retain_evidence = false),
    'danger-drops-progress': () =>
      (contract.danger_contracts[2].retain_completed_correct_steps = false),
    'danger-creates-evidence': () => (contract.danger_contracts[0].soft_failure_creates_evidence = true),
    'save-drops-g01': () => (contract.save_contract.preserves_g01_completion = false),
    'unauthorized-art': () => (art.authorization = 'unrecorded_generation'),
    'runtime-sha-missing': () => (art.runtime_assets[0].sha256 = ''),
    'direct-board-runtime': () => (art.forbidden_inputs.design_board_used_directly_at_runtime = true),
  }
  if (!actions[mutation]) failures.push(`G02-FIXTURE-001: unknown mutation ${mutation}`)
  else actions[mutation]()
}

const expectedScope = [
  'G02-BOUNDARY',
  'SCN-G02-00',
  'SCN-G02-01',
  'SCN-G02-02',
  'RUNTIME-G02-ENERGY-SEARCH-BOUNDARY',
]
const expectedFormalVars = [
  'g02_intro_scan_done',
  'g02_almao_rescued',
  'g02_resource_labels',
  'g02_archive_restored',
]
check(
  JSON.stringify(contract.runtime_scope) === JSON.stringify(expectedScope),
  'G02-SCOPE-001',
  'runtime scope must stop at the read-only energy-search boundary',
)
check(
  JSON.stringify(contract.allowed_completed_formal_variables) ===
    JSON.stringify(expectedFormalVars),
  'G02-SCOPE-002',
  'only the four frozen vertical-slice variables may complete',
)
check(contract.base_sha === '648ad396ea02f5d519f8ab9699c63486ba405720', 'G02-SCOPE-003', 'base SHA changed')
check(contract.read_only_boundary.interactive === false, 'G02-SCOPE-004', 'SCN03 boundary became interactive')
check(contract.read_only_boundary.grants_items === false, 'G02-SCOPE-005', 'SCN03 boundary grants an item')
check(contract.read_only_boundary.writes_formal_variables === false, 'G02-SCOPE-006', 'SCN03 boundary writes variables')

const stateIds = ['S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6']
for (const scene of contract.scenes) {
  check(
    JSON.stringify(scene.states) === JSON.stringify(stateIds),
    'G02-STATE-001',
    `${scene.scene_id} must define S0-S6 exactly once`,
  )
  check(Boolean(scene.safe_node), 'G02-STATE-002', `${scene.scene_id} safe node missing`)
  check(
    scene.formal_variables.every((key) => expectedFormalVars.includes(key)),
    'G02-STATE-003',
    `${scene.scene_id} writes an out-of-scope formal variable`,
  )
}
for (const adapter of contract.runtime_adapters) {
  check(adapter.runtime_id.startsWith('RUNTIME-'), 'G02-ID-001', `${adapter.runtime_id} lacks runtime namespace`)
  check(adapter.official_id === null, 'G02-ID-002', `${adapter.runtime_id} invents an official ID`)
  check(Boolean(adapter.formal_parent), 'G02-ID-003', `${adapter.runtime_id} lacks a formal parent`)
  check(Boolean(adapter.reason), 'G02-ID-004', `${adapter.runtime_id} lacks an adaptation reason`)
}

for (const hint of contract.hint_contracts) {
  check(
    JSON.stringify(hint.levels.map((entry) => entry.level)) === '[1,2,3]',
    'G02-HINT-001',
    `${hint.scene_id}/${hint.task_id} levels are incomplete or duplicated`,
  )
  check(
    JSON.stringify(hint.levels.map((entry) => entry.semantics)) ===
      '["direction","area","complete_one_step"]',
    'G02-HINT-002',
    `${hint.scene_id}/${hint.task_id} semantics are not direction/area/action`,
  )
  check(
    hint.level_three_changes_exactly_one_legal_step === true,
    'G02-HINT-003',
    `${hint.scene_id}/${hint.task_id} level three does not complete one step`,
  )
  check(
    hint.levels.every((entry) => Boolean(entry.hint_id && entry.text && entry.effect)),
    'G02-HINT-004',
    `${hint.scene_id}/${hint.task_id} lacks data-driven id/text/effect`,
  )
  check(
    hint.levels[2]?.effect !== 'complete_puzzle',
    'G02-HINT-005',
    `${hint.scene_id}/${hint.task_id} level three completes the whole puzzle`,
  )
}
const formalScn02Hints = json('data/source/g02-g13/G02/json/三级提示.json').filter(
  (entry) => entry['场景ID'] === 'SCN-G02-02' && entry['机关/任务'] === '电视墙修复',
)
const scn02HintContract = contract.hint_contracts.find(
  (entry) => entry.scene_id === 'SCN-G02-02',
)
check(formalScn02Hints.length === 3, 'G02-HINT-006', 'formal SCN02 hint rows missing')
for (const [index, formalHint] of formalScn02Hints.entries()) {
  const runtimeHint = scn02HintContract?.levels[index]
  check(runtimeHint?.hint_id === formalHint['提示ID'], 'G02-HINT-007', `${formalHint['提示ID']} id mismatch`)
  check(runtimeHint?.text === formalHint['提示文本'], 'G02-HINT-008', `${formalHint['提示ID']} text mismatch`)
}
for (const mechanism of contract.mechanism_contracts) {
  check(mechanism.answer_text_buttons === false, 'G02-MECH-001', `${mechanism.mechanism_id} exposes answer buttons`)
  check(mechanism.wrong_action_preserves_progress === true, 'G02-MECH-002', `${mechanism.mechanism_id} drops progress on wrong action`)
  check(mechanism.playwright_real_pointer === true, 'G02-MECH-003', `${mechanism.mechanism_id} lacks real pointer proof`)
}
check(
  contract.mechanism_contracts[0]?.interaction === 'waveform_controls',
  'G02-MECH-004',
  'pulse scan is not a visual waveform-control mechanism',
)
check(
  contract.mechanism_contracts[1]?.interaction === 'drag_physical_labels_to_slots',
  'G02-MECH-005',
  'resource classification is not a physical drag/slot mechanism',
)
for (const item of contract.critical_item_contracts) {
  check(item.wrong_use_consumes === false, 'G02-ITEM-001', `${item.scene_id}/${item.item_id} is consumed by wrong use`)
  check(item.wrong_use_changes_progress === false, 'G02-ITEM-002', `${item.scene_id}/${item.item_id} changes progress on wrong use`)
  check(item.duplicate_grant_forbidden === true, 'G02-ITEM-003', `${item.scene_id}/${item.item_id} can be granted twice`)
}
for (const danger of contract.danger_contracts) {
  check(Boolean(danger.safe_recovery_node), 'G02-DANGER-001', `${danger.scene_id}/${danger.danger_id} safe node missing`)
  for (const field of [
    'retain_key_items',
    'retain_hos_progress',
    'retain_puzzle_progress',
    'retain_evidence',
    'retain_completed_correct_steps',
    'duplicate_grants_forbidden',
    'whole_scene_reset_forbidden',
    'retry_available',
  ]) {
    check(danger[field] === true, 'G02-DANGER-002', `${danger.scene_id}/${danger.danger_id}.${field} must be true`)
  }
  check(danger.soft_failure_creates_evidence === false, 'G02-DANGER-003', `${danger.scene_id}/${danger.danger_id} creates evidence`)
}
for (const [key, value] of Object.entries(contract.save_contract)) {
  if (key === 'cross_chapter_migration') {
    check(value === 'schema_v2_in_place', 'G02-SAVE-001', 'cross-chapter migration must remain schema v2 in-place')
  } else {
    check(value === true, 'G02-SAVE-002', `save contract ${key} must be true`)
  }
}

const packageManifest = json('source_packages/manifests/source-packages.json')
for (const source of art.formal_sources) {
  const imported = packageManifest.imported.find(
    (entry) => entry.package_id === source.package_id,
  )
  check(Boolean(imported), 'G02-SOURCE-001', `${source.package_id} missing from formal package manifest`)
  check(imported?.repository_path === source.source_package_path, 'G02-SOURCE-002', `${source.package_id} path mismatch`)
  check(imported?.observed_sha256 === source.package_sha256, 'G02-SOURCE-003', `${source.package_id} manifest SHA mismatch`)
  check(existsSync(resolve(root, source.source_package_path)), 'G02-SOURCE-004', `${source.source_package_path} missing`)
  if (existsSync(resolve(root, source.source_package_path))) {
    check(hash(source.source_package_path) === source.package_sha256, 'G02-SOURCE-005', `${source.package_id} file SHA mismatch`)
  }
  check(/^[a-f0-9]{64}$/.test(source.entry_sha256), 'G02-SOURCE-006', `${source.package_id} source-entry SHA invalid`)
}

const formalDir = 'data/source/g02-g13/G02/json'
const formalFiles = [
  'G02_MasterData.json',
  '场景流程.json',
  '场景状态机.json',
  '热点清单.json',
  '找物清单.json',
  '背包道具流转.json',
  '对话脚本.json',
  '三级提示.json',
  '存档与恢复.json',
  '程序变量.json',
  '资产映射.json',
]
const formalText = formalFiles.map((name) => read(`${formalDir}/${name}`)).join('\n')
for (const id of [
  'SCN-G02-00',
  'SCN-G02-01',
  'SCN-G02-02',
  'HS-G02-0001',
  'HS-G02-0011',
  'HOS-G02-001',
  'ITM-G02-002',
  'ITM-G02-006',
  'EVD-G02-001',
  'EVD-G02-005',
  'DANGER-001',
  'DANGER-002',
  'DANGER-004',
  'MECH-002',
  'AUTO-G02-001',
  'AUTO-G02-003',
]) {
  check(formalText.includes(id), 'G02-SOURCE-007', `${id} absent from formal G02 V2.1 data`)
}

const formalDialogue = json(`${formalDir}/对话脚本.json`).filter(
  (entry) => contract.dialogue_ids.includes(entry['对话ID']),
)
const runtimeDialogueCode = read('src/data/dialogue/g02.ts')
check(formalDialogue.length === 9, 'G02-DIALOGUE-001', 'formal DLG-G02-0001—0009 set incomplete')
for (const entry of formalDialogue) {
  const id = entry['对话ID']
  const start = runtimeDialogueCode.indexOf(`    dialogue_id: '${id}'`)
  const end = runtimeDialogueCode.indexOf('\n  {', start + 1)
  const block = runtimeDialogueCode.slice(start, end === -1 ? undefined : end)
  check(start >= 0, 'G02-DIALOGUE-002', `${id} runtime node missing`)
  check(block.includes(`scene_id: '${entry['场景ID']}'`), 'G02-DIALOGUE-003', `${id} scene mismatch`)
  check(block.includes(`text: '${entry['台词']}'`), 'G02-DIALOGUE-004', `${id} text differs from formal source`)
  check(block.includes(`trigger_condition: '${entry['触发条件']}'`), 'G02-DIALOGUE-005', `${id} trigger differs from formal source`)
  check(
    !/dialogue_id:\s*'DLG-G02-00(?:1[0-9]|[2-9][0-9])'/.test(block),
    'G02-DIALOGUE-006',
    `${id} chains outside slice`,
  )
}

const imageInfo = (path) => {
  const data = bytes(path)
  const extension = extname(path).toLowerCase()
  if (extension === '.png') {
    return {
      width: data.readUInt32BE(16),
      height: data.readUInt32BE(20),
      hasAlpha: [4, 6].includes(data[25]),
    }
  }
  if (extension === '.webp') {
    const chunk = data.toString('ascii', 12, 16)
    if (chunk === 'VP8X') {
      return {
        width: 1 + data.readUIntLE(24, 3),
        height: 1 + data.readUIntLE(27, 3),
        hasAlpha: Boolean(data[20] & 0x10),
      }
    }
    const marker = data.indexOf(Buffer.from([0x9d, 0x01, 0x2a]))
    return {
      width: data.readUInt16LE(marker + 3) & 0x3fff,
      height: data.readUInt16LE(marker + 5) & 0x3fff,
      hasAlpha: false,
    }
  }
  return { width: 0, height: 0, hasAlpha: false }
}

check(art.authorization === 'project_owner_authorized_runtime_production', 'G02-ART-001', 'runtime art authorization invalid')
check(provenance.authorization === art.authorization, 'G02-ART-002', 'provenance authorization mismatch')
check(provenance.runtime_manifest === 'data/source/g02/slice-01/runtime-art-manifest.json', 'G02-ART-003', 'provenance manifest path invalid')
check(art.runtime_assets.length === 35, 'G02-ART-004', 'runtime asset set must contain 35 files')
check(new Set(art.runtime_assets.map((asset) => asset.runtime_path)).size === art.runtime_assets.length, 'G02-ART-005', 'duplicate runtime path')
check(new Set(art.runtime_assets.map((asset) => asset.sha256)).size === art.runtime_assets.length, 'G02-ART-006', 'duplicate runtime asset SHA')
for (const asset of art.runtime_assets) {
  check(asset.runtime_asset === true, 'G02-ART-007', `${asset.runtime_path} is not marked runtime`)
  check(asset.source === art.authorization, 'G02-ART-008', `${asset.runtime_path} source authorization mismatch`)
  check(existsSync(resolve(root, asset.runtime_path)), 'G02-ART-009', `${asset.runtime_path} missing`)
  check(!['.svg', '.html'].includes(extname(asset.runtime_path).toLowerCase()), 'G02-ART-010', `${asset.runtime_path} placeholder format forbidden`)
  if (existsSync(resolve(root, asset.runtime_path))) {
    check(hash(asset.runtime_path) === asset.sha256, 'G02-ART-011', `${asset.runtime_path} SHA mismatch`)
    const actual = imageInfo(asset.runtime_path)
    check(actual.width === asset.width && actual.height === asset.height, 'G02-ART-012', `${asset.runtime_path} dimensions mismatch`)
    if (['scene_item', 'inventory_item', 'character_state', 'scene_state_layer'].includes(asset.category)) {
      check(actual.hasAlpha === true, 'G02-ART-013', `${asset.runtime_path} needs real alpha`)
    }
    if (asset.category === 'scene_background' || asset.category === 'hos_background') {
      check(actual.width === 2560 && actual.height === 1440, 'G02-ART-014', `${asset.runtime_path} must be 2560x1440`)
    }
  }
}
for (const input of art.generated_inputs) {
  check(existsSync(resolve(root, input.path)), 'G02-ART-015', `${input.path} generated source missing`)
  if (existsSync(resolve(root, input.path))) {
    check(hash(input.path) === input.sha256, 'G02-ART-016', `${input.path} generated source SHA mismatch`)
  }
}
for (const [key, value] of Object.entries(art.forbidden_inputs)) {
  check(value === false, 'G02-ART-017', `forbidden runtime-art input enabled: ${key}`)
}
check(art.hos.hos_id === 'HOS-G02-001', 'G02-HOS-001', 'formal HOS ID changed')
check(art.hos.target_item_ids.length === 6, 'G02-HOS-002', 'HOS target count must be six independent layers')
check(art.hos.distractor_ids.length >= 5, 'G02-HOS-003', 'HOS needs at least five distractors')
check(art.hos.pickup_layers_independently_hide === true, 'G02-HOS-004', 'HOS pickup layers do not independently hide')

const sceneCode = ['scn00', 'scn01', 'scn02']
  .map((name) => read(`src/scenes/g02/${name}.ts`))
  .join('\n')
const engineCode = read('src/game/engine.ts')
const saveCode = read('src/game/save.ts')
const uiCode = `${read('src/ui/GameView.ts')}\n${injectedUiText}`
const contentCode = read('src/content/g02.ts')
const configCode = read('src/config.ts')
const hintCode = read('src/data/hints/g02.ts')
for (const scene of contract.scenes) {
  check(sceneCode.includes(`id: '${scene.scene_id}'`), 'G02-RUNTIME-001', `${scene.scene_id} module missing`)
  for (const id of scene.hotspots ?? []) {
    check(sceneCode.includes(`id: '${id}'`), 'G02-RUNTIME-002', `${scene.scene_id}/${id} hotspot missing`)
  }
}
check(contentCode.includes("id: 'RUNTIME-G02-ENERGY-SEARCH-BOUNDARY'"), 'G02-RUNTIME-003', 'read-only boundary missing')
check(contentCode.includes('hotspots: []') && contentCode.includes('transitions: []'), 'G02-RUNTIME-004', 'boundary is not read-only')
check(engineCode.includes('triggerG02SoftFailure') && engineCode.includes('resumeG02AfterSoftFailure'), 'G02-RUNTIME-005', 'G02 safe recovery implementation missing')
check(engineCode.includes('completeHintStep') && uiCode.includes('completeHintStep'), 'G02-RUNTIME-006', 'behavioral level-three hint implementation missing')
check(saveCode.includes("restoredSceneId.startsWith('SCN-G02-')"), 'G02-RUNTIME-007', 'cross-chapter save restoration missing')
check(!/SCN-G02-03[A-D]/.test(sceneCode + runtimeDialogueCode + engineCode), 'G02-SCOPE-007', 'SCN03+ implementation detected')
check(!/DLG-G02-00(?:1[0-9]|[2-9][0-9])/.test(runtimeDialogueCode), 'G02-SCOPE-008', 'post-slice dialogue implementation detected')
for (const locked of contract.locked_variables) {
  check(engineCode.includes(`'${locked}'`) && engineCode.includes('session.flags[key] = false'), 'G02-LOCK-001', `${locked} is not force-locked`)
}
check(engineCode.includes('session.flags.world_star_core_count = 0'), 'G02-LOCK-002', 'world star-core invariant missing')
check(uiCode.includes('第二章 · 锈环星旧屏幕谷'), 'G02-UI-001', 'G02 player-facing chapter label missing')
check(!/项目负责人|验收|交付边界/.test(uiCode), 'G02-UI-002', 'formal UI contains developer text')
check(
  configCode.includes('import.meta.env.DEV && debugRequested'),
  'G02-UI-003',
  'DEBUG_UI must remain disabled in production',
)
const formalUiCode = [uiCode, contentCode, sceneCode, engineCode].join('\n')
for (const term of contract.formal_ui_contract.forbidden_terms) {
  check(!formalUiCode.includes(term), 'G02-UI-004', `formal UI contains forbidden delivery term: ${term}`)
}
for (const text of ['四组能量信号', '安全区', '等待路线确认']) {
  check(formalUiCode.includes(text), 'G02-UI-005', `world-internal boundary copy missing: ${text}`)
}
const hintMethod = engineCode.slice(
  engineCode.indexOf('completeHintStep('),
  engineCode.indexOf('setG02PulseControl('),
)
check(
  hintMethod.includes("sceneId.startsWith('SCN-G02-')") &&
    hintMethod.includes('#advanceG02HintStep(hint)'),
  'G02-HINT-009',
  'G02 level-three hint is not routed through the one-step adapter',
)
check(
  !hintMethod.includes('RUNTIME-PUZ-G02-PULSE-SCAN') &&
    !hintMethod.includes('RUNTIME-PUZ-G02-RESOURCE-CLASSIFICATION'),
  'G02-HINT-010',
  'completeHintStep still directly references a whole G02 puzzle',
)
for (const formalHint of formalScn02Hints) {
  check(hintCode.includes(formalHint['提示ID']), 'G02-HINT-011', `${formalHint['提示ID']} runtime data missing`)
  check(hintCode.includes(formalHint['提示文本']), 'G02-HINT-012', `${formalHint['提示ID']} runtime text missing`)
}
check(
  uiCode.includes('pulse-waveform') &&
    uiCode.includes('g02-pulse-adjust') &&
    uiCode.includes('g02-pulse-sample') &&
    !uiCode.includes('g02-pulse-step'),
  'G02-MECH-006',
  'pulse scan still uses text-answer steps instead of waveform controls',
)
check(
  uiCode.includes('data-mechanism-item') &&
    uiCode.includes('data-resource-slot') &&
    uiCode.includes('g02-resource-submit') &&
    !uiCode.includes('g02-resource-step'),
  'G02-MECH-007',
  'resource classification still uses text-answer steps instead of physical slots',
)

const packageConfig = json('package.json')
const e2eCode = read('tests-e2e/g02-slice-01.spec.ts')
const playwrightConfig = read('playwright.config.ts')
const pwaCode = read('tests-pwa/g02-slice-pwa.spec.ts')
const gateWorkflow = read('.github/workflows/g02-vertical-slice-gate.yml')
const deployWorkflow = read('.github/workflows/deploy-g02-slice.yml')
const releaseScript = read('scripts/package-g02-slice-01.mjs')
const requiredHandoffDocs = [
  'README_G02_SLICE.md',
  'docs/story-runtime/G02_VERTICAL_SLICE_00_02.md',
  'docs/review/G02_VERTICAL_SLICE_VISUAL_ACCEPTANCE.md',
  'docs/art/G02_SLICE_01_RUNTIME_ASSET_PROVENANCE.json',
  'docs/art/G02_SLICE_01_RUNTIME_ASSET_SHA256.txt',
]
for (const path of requiredHandoffDocs) {
  check(existsSync(resolve(root, path)), 'G02-HANDOFF-001', `${path} missing`)
}
check(
  packageConfig.g02SliceVersion === 'G02-SLICE-0.1.0',
  'G02-HANDOFF-002',
  'G02 slice version missing',
)
check(
  packageConfig.scripts['validate:g02-slice-01'] ===
    'node scripts/validate-g02-slice-01.mjs',
  'G02-HANDOFF-003',
  'G02 validator command missing',
)
check(
  packageConfig.scripts['test:g02-slice-01']?.includes(
    'tests/g02-slice-01/runtime.test.ts',
  ) &&
    packageConfig.scripts['test:g02-slice-01']?.includes(
      'tests/g02-slice-01/g02-slice-negative.test.mjs',
    ),
  'G02-HANDOFF-004',
  'G02 positive/negative test command incomplete',
)
check(
  packageConfig.scripts['package:g02-slice-01'] ===
    'node scripts/package-g02-slice-01.mjs',
  'G02-HANDOFF-005',
  'G02 production package command missing',
)
for (const resolution of ['1366x768', '1920x1080']) {
  check(
    playwrightConfig.includes(`name: '${resolution}'`),
    'G02-E2E-001',
    `${resolution} project evidence missing`,
  )
}
for (const evidence of [
  'soft-failure',
  'after-refresh',
  'wrong-use-not-consumed',
  'dialogue-history',
  'character-profile',
  'read-only-scn03-boundary',
  'hint-direction',
  'hint-area',
  'hint-one-control-only',
  'hint-one-label-only',
  'formal-hint-one-key-only',
  'pulse-wrong-retained',
  'resource-wrong-retained',
  'pulse-partial-calibration',
  'resource-partial',
]) {
  check(e2eCode.includes(evidence), 'G02-E2E-002', `${evidence} evidence capture missing`)
}
check(
  e2eCode.includes('.dragTo(') &&
    e2eCode.includes('data-mechanism-item') &&
    e2eCode.includes('data-resource-slot'),
  'G02-E2E-005',
  'non-text mechanisms lack real pointer/drag Playwright proof',
)
check(
  e2eCode.includes("expect(consoleErrors).toEqual([])"),
  'G02-E2E-003',
  'browser console zero-error assertion missing',
)
check(
  e2eCode.includes('world_star_core_count: 0') &&
    e2eCode.includes('g02_chapter_complete: false') &&
    e2eCode.includes('expect(finalSave.flags).toMatchObject'),
  'G02-E2E-004',
  'final frozen-variable assertions missing',
)
check(
  pwaCode.includes('navigator.serviceWorker.ready') &&
    pwaCode.includes('context.setOffline(true)') &&
    pwaCode.includes('SCENE-G02-001_old-screen-valley-pulse.webp'),
  'G02-PWA-001',
  'G02 offline cache/restore proof incomplete',
)
check(
  gateWorkflow.startsWith('name: G02 Vertical Slice Gate'),
  'G02-CI-001',
  'independent G02 Vertical Slice Gate missing',
)
for (const command of [
  'npm run validate:g02-slice-01',
  'npm run test:g02-slice-01',
  'npm run test:e2e',
  'npm run test:pwa',
  'npm run package:g02-slice-01',
]) {
  check(gateWorkflow.includes(command), 'G02-CI-002', `${command} absent from G02 gate`)
}
check(
  gateWorkflow.includes('g02-slice-01-visual-acceptance-') &&
    gateWorkflow.includes('starwreck-g02-slice-0.1.0-'),
  'G02-CI-003',
  'visual or production ZIP artifact upload missing',
)
check(
  deployWorkflow.startsWith('name: Deploy G02 Vertical Slice') &&
    deployWorkflow.includes('actions/deploy-pages@v4') &&
    deployWorkflow.includes('GITHUB_PAGES: "true"'),
  'G02-DEPLOY-001',
  'GitHub Pages deployment workflow incomplete',
)
check(
  releaseScript.includes('starwreck-g02-slice-0.1.0.zip') &&
    releaseScript.includes('delete env.FAL_KEY') &&
    releaseScript.includes('README_G02_SLICE.md'),
  'G02-RELEASE-001',
  'production ZIP script incomplete or inherits FAL credentials',
)

for (const failure of failures) console.error(failure)
if (failures.length) process.exit(1)
console.log(
  `G02_SLICE_01_VALIDATION_OK rules=${ruleCount} assets=${art.runtime_assets.length} formal_dialogues=${formalDialogue.length} critical_items=${contract.critical_item_contracts.length} negative_mutations=23`,
)
