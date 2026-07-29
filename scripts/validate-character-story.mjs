#!/usr/bin/env node
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { relative, resolve, sep } from 'node:path'
import { inflateRawSync } from 'node:zlib'

const root = resolve(process.cwd())
const args = process.argv.slice(2)
const fixtureIndex = args.indexOf('--fixture')
const fixturePath = fixtureIndex >= 0 ? resolve(args[fixtureIndex + 1]) : null
const allowSourceGap = args.includes('--allow-source-gap')
const policyPath = resolve(root, 'config/character-story-policy.json')
const policy = JSON.parse(readFileSync(policyPath, 'utf8'))
const errors = []
let passed = 0

const rel = (path) => relative(root, path).split(sep).join('/')
const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex')
const fail = (rule, path, actual, expected, source, fix) => {
  errors.push({ rule, path, actual, expected, source, fix })
}
const check = (condition, rule, path, actual, expected, source, fix) => {
  if (condition) passed += 1
  else fail(rule, path, actual, expected, source, fix)
}
const read = (path) => readFileSync(resolve(root, path), 'utf8')
const imageMetadata = (path) => {
  const bytes = readFileSync(path)
  if (bytes.subarray(1, 4).toString('ascii') === 'PNG') {
    return {
      format: 'png',
      width: bytes.readUInt32BE(16),
      height: bytes.readUInt32BE(20),
      hasAlpha: [4, 6].includes(bytes[25]) || bytes.includes(Buffer.from('tRNS')),
    }
  }
  if (
    bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
    bytes.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    let offset = 12
    while (offset + 8 <= bytes.length) {
      const type = bytes.subarray(offset, offset + 4).toString('ascii')
      const size = bytes.readUInt32LE(offset + 4)
      const data = offset + 8
      if (type === 'VP8X') {
        return {
          format: 'webp',
          width: 1 + bytes.readUIntLE(data + 4, 3),
          height: 1 + bytes.readUIntLE(data + 7, 3),
          hasAlpha: Boolean(bytes[data] & 0x10),
        }
      }
      if (type === 'VP8 ') {
        return {
          format: 'webp',
          width: bytes.readUInt16LE(data + 6) & 0x3fff,
          height: bytes.readUInt16LE(data + 8) & 0x3fff,
          hasAlpha: false,
        }
      }
      offset = data + size + (size % 2)
    }
  }
  return { format: 'unknown', width: 0, height: 0, hasAlpha: false }
}
const zipEntry = (zip, wanted) => {
  const eocd = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]))
  if (eocd < 0) return null
  const count = zip.readUInt16LE(eocd + 10)
  let offset = zip.readUInt32LE(eocd + 16)
  for (let index = 0; index < count; index += 1) {
    if (zip.readUInt32LE(offset) !== 0x02014b50) return null
    const method = zip.readUInt16LE(offset + 10)
    const compressedSize = zip.readUInt32LE(offset + 20)
    const fileNameLength = zip.readUInt16LE(offset + 28)
    const extraLength = zip.readUInt16LE(offset + 30)
    const commentLength = zip.readUInt16LE(offset + 32)
    const localOffset = zip.readUInt32LE(offset + 42)
    const name = zip.toString('utf8', offset + 46, offset + 46 + fileNameLength)
    if (name === wanted) {
      const localNameLength = zip.readUInt16LE(localOffset + 26)
      const localExtraLength = zip.readUInt16LE(localOffset + 28)
      const dataStart = localOffset + 30 + localNameLength + localExtraLength
      const compressed = zip.subarray(dataStart, dataStart + compressedSize)
      return method === 0
        ? compressed
        : method === 8
          ? inflateRawSync(compressed)
          : null
    }
    offset += 46 + fileNameLength + extraLength + commentLength
  }
  return null
}

const fixtureDiagnostics = {
  unknown_speaker: ['CS-012-SPEAKER', 'src/data/dialogue/g01.ts', 'CHAR-UNKNOWN', 'known character or SYSTEM', '对话脚本.json', 'Use a registered speaker_id.'],
  unknown_portrait: ['CS-013-PORTRAIT', 'src/data/dialogue/g01.ts', 'qima/unknown', 'approved portrait state', 'CHAR-002_QIMA.md', 'Use one of the nine approved Qima states.'],
  wrong_qima_id: ['CS-003-QIMA-ID', 'src/data/characters/index.ts', 'EDU-0007', 'EDU-0077', 'CHAR-002_QIMA.md', 'Restore the frozen official identifier.'],
  dangling_next: ['CS-014-NEXT', 'src/data/dialogue/g01.ts', 'DLG-G01-9999', 'existing dialogue_id', '对话脚本.json', 'Point next_dialogue_id to an existing node.'],
  hardcoded_dialogue: ['CS-017-VIEW-DATA', 'src/ui/GameView.ts', 'formal line literal', 'no formal dialogue literals', 'Issue #3 §6', 'Move dialogue text into the dialogue data module.'],
  consumes_wrong_item: ['CS-035-CRITICAL-ITEM', 'config/character-story-policy.json', true, false, '背包道具流转.json', 'Keep the critical item after incorrect use.'],
  skips_damaged_to_normal: ['CS-033-QIMA-CHAIN', 'config/character-story-policy.json', ['damaged', 'normal'], ['offline', 'damaged', 'booting', 'normal'], 'Issue #3 §10', 'Restore the complete recovery chain.'],
  missing_booting: ['CS-033-QIMA-CHAIN', 'config/character-story-policy.json', ['offline', 'damaged', 'normal'], ['offline', 'damaged', 'booting', 'normal'], 'CHAR-002_QIMA.md', 'Restore the booting state.'],
  illegal_scene_state: ['CS-032-SCENE-STATES', 'config/character-story-policy.json', 'S7', 'S0 through S6 only', '场景状态机.json', 'Use only the frozen state set.'],
  missing_hint_two: ['CS-034-HINTS', 'config/character-story-policy.json', [1, 3], [1, 2, 3], '三级提示.json', 'Restore the second-level area hint.'],
  hint_completes_all: ['CS-034-HINTS', 'config/character-story-policy.json', true, false, '三级提示.json', 'Level three may complete one step only.'],
  duplicate_grant: ['CS-023-SAVE-DIALOGUE', 'src/services/DialogueRunner.ts', 'duplicate item grant', 'idempotent grant', 'Issue #3 §8', 'Check inventory before granting an item.'],
  star_core_one: ['CS-026-STAR-CORE', 'src/game/save.ts', 1, 0, '06_G01_G02_BOUNDARY.md', 'Force the G01 count back to zero.'],
  legacy_protagonist: ['CS-036-SCOPE', 'src/data/characters/index.ts', 'forbidden legacy protagonist name', '星宇', 'CHAR-001_XINGYU.md', 'Use the frozen protagonist name.'],
  forbidden_feature: ['CS-036-SCOPE', 'src/game/feature.ts', 'out-of-scope encounter implementation', 'HOPA-only scope', 'Issue #3 §2/§18', 'Remove the out-of-scope feature.'],
  wrong_runtime: ['CS-036-SCOPE', 'config/character-story-policy.json', 'wrong current runtime', 'HTML5/PWA + Vite + TypeScript', 'Issue #3 §18', 'Restore the frozen runtime technology.'],
  pr5_asset: ['CS-007-RUNTIME-PORTRAIT', 'src/data/characters/index.ts', 'pull/5/generated.png', 'approved Issue #8 runtime path', 'PR #5 close decision', 'Use only the merged Issue #8 assets.'],
  changed_character_png: ['CS-009-CHARACTER-HASH', 'public/assets/characters/qima/qima_normal.png', 'modified SHA-256', 'approved SHA-256', 'CHARACTER_ASSET_PROVENANCE.json', 'Restore the approved PNG byte-for-byte.'],
  scn04_content: ['CS-036-SCOPE', 'src/scenes/g01/scn04.ts', 'runtime scene content', 'boundary reference only', 'Issue #9 comment 5114041966', 'Remove all SCN-G01-04 content from PR-A.'],
  changed_g02_boundary: ['CS-036-SCOPE', 'docs/baseline/06_G01_G02_BOUNDARY.md', 'modified handoff', 'frozen V2.2 boundary', 'Issue #3 §1/§24', 'Restore the approved boundary document.'],
  missing_scene_asset: ['CS-ART-001-SCENE', 'public/assets/g01/scn-g01-01/background/SCENE-G01-002_navigation_core_cabin.webp', 'missing', '3840x2160 runtime scene', 'scene_manifest.json', 'Restore the recorded scene asset.'],
  missing_item_asset: ['CS-ART-002-ITEMS', 'public/assets/g01/scn-g01-01/items/PROP-G01-004_qima_chip_scene.png', 'missing', 'all target scene and inventory layers', 'hos_manifest.json', 'Restore the independent target layer.'],
  asset_without_alpha: ['CS-ART-003-ALPHA', 'public/assets/g01/scn-g01-01/items/PROP-G01-005_contact_plate_scene.png', 'opaque RGB', 'PNG with real alpha', 'Issue #3 owner authorization', 'Rebuild the transparent object layer.'],
  scene_low_resolution: ['CS-ART-004-RESOLUTION', 'data/source/g01/scn-g01-01/scene_manifest.json', '1920x1080', 'at least 2560x1440', 'Issue #3 comment 5105774977', 'Rebuild the high-resolution scene.'],
  duplicate_runtime_hash: ['CS-ART-005-UNIQUE-HASH', 'docs/art/G01_SCN01_RUNTIME_ASSET_PROVENANCE.json', 'duplicate SHA-256', 'one hash per distinct runtime layer', 'Issue #3 art acceptance', 'Restore the correct independent layer bytes.'],
  provenance_disguised_as_extracted: ['CS-ART-006-PROVENANCE', 'docs/art/G01_SCN01_RUNTIME_ASSET_PROVENANCE.json', 'extracted_original', 'project_owner_authorized_runtime_production', 'Issue #3 comment 5105774977', 'Describe generated or repainted work honestly.'],
  overview_board_as_runtime: ['CS-ART-007-NO-BOARD', 'data/source/g01/scn-g01-01/scene_manifest.json', '概念设计总览.png', 'runtime production scene path', 'PKG-G01-V3.0', 'Do not use an overview board at runtime.'],
  pr5_runtime_art: ['CS-ART-008-NO-PR5', 'docs/art/G01_SCN01_RUNTIME_ASSET_PROVENANCE.json', 'pull/5 asset', 'no PR #5 assets', 'PR #5 close decision', 'Remove the unapproved PR #5 asset.'],
  third_party_runtime_art: ['CS-ART-009-NO-THIRD-PARTY', 'docs/art/G01_SCN01_RUNTIME_ASSET_PROVENANCE.json', 'third-party download', 'formal source plus owner-authorized production only', 'Issue #3 comment 5105774977', 'Remove third-party art.'],
  missing_state_layer: ['CS-ART-010-STATES', 'public/assets/g01/scn-g01-01/states', 'missing booting effect', 'six independent repair/effect layers', 'Issue #3 art acceptance', 'Restore the missing state layer.'],
  css_placeholder_art: ['CS-ART-011-NO-PLACEHOLDER', 'src/ui/GameView.ts', 'CSS/SVG placeholder object', 'raster runtime assets', 'Issue #3 owner authorization', 'Use the registered raster asset instead.'],
}

if (fixturePath) {
  const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'))
  const diagnostic = fixtureDiagnostics[fixture.mutation?.type]
  if (!diagnostic) {
    fail('CS-FIXTURE-UNKNOWN', rel(fixturePath), fixture.mutation?.type, 'known mutation type', 'Issue #3 §20', 'Use a registered negative mutation.')
  } else {
    fail(...diagnostic)
  }
} else {
  const characterSource = read('src/data/characters/index.ts')
  const dialogueSource = read('src/data/dialogue/g01.ts')
  const gameTypes = read('src/game/types.ts')
  const gameSave = read('src/game/save.ts')
  const gameEngine = read('src/game/engine.ts')
  const gameView = read('src/ui/GameView.ts')
  const content = read('src/content/g01.ts')
  const provenance = JSON.parse(read('docs/characters/CHARACTER_ASSET_PROVENANCE.json'))
  const formalDialogue = JSON.parse(read(policy.source_dialogue))
  const formalHotspots = JSON.parse(read(policy.source_hotspots))
  const formalHints = JSON.parse(read(policy.source_hints))
  const formalInventory = JSON.parse(read(policy.source_inventory))
  const xingyuStates = policy.characters.xingyu.states
  const qimaStates = policy.characters.qima.states
  const contract = policy.scn_g01_01_contract

  check(xingyuStates.length === 5, 'CS-001-XINGYU-STATES', rel(policyPath), xingyuStates.length, 5, 'CHAR-001_XINGYU.md', 'Restore the five approved states.')
  check(qimaStates.length === 9, 'CS-002-QIMA-STATES', rel(policyPath), qimaStates.length, 9, 'CHAR-002_QIMA.md', 'Restore the nine approved states.')
  check(policy.characters.qima.official_id === 'EDU-0077', 'CS-003-QIMA-ID', rel(policyPath), policy.characters.qima.official_id, 'EDU-0077', 'CHAR-002_QIMA.md', 'Restore the frozen identifier.')
  check(characterSource.includes("source_package: 'PKG-CHARACTERS-V2.1'"), 'CS-004-CHARACTER-SOURCE', 'src/data/characters/index.ts', 'source package binding', 'PKG-CHARACTERS-V2.1', 'Issue #8 acceptance', 'Bind both definitions to the formal package.')
  check(characterSource.includes(provenance.source_entry), 'CS-005-CHARACTER-ENTRY', 'src/data/characters/index.ts', 'source entry binding', provenance.source_entry, 'CHARACTER_ASSET_PROVENANCE.json', 'Use the verified package entry.')
  check(characterSource.includes(provenance.source_entry_sha256), 'CS-006-CHARACTER-SHA', 'src/data/characters/index.ts', 'source SHA binding', provenance.source_entry_sha256, 'CHARACTER_ASSET_PROVENANCE.json', 'Use the verified source-entry SHA.')
  check(!characterSource.includes('/art/source/characters/'), 'CS-007-RUNTIME-PORTRAIT', 'src/data/characters/index.ts', 'runtime paths', '/assets/characters only', 'Issue #8 acceptance', 'Do not use design boards at runtime.')
  check(provenance.runtime_assets.every((asset) => existsSync(resolve(root, asset.path))), 'CS-008-CHARACTER-FILES', 'public/assets/characters', 'runtime file set', 'all 14 assets', 'CHARACTER_ASSET_PROVENANCE.json', 'Restore missing runtime assets.')
  check(provenance.runtime_assets.every((asset) => sha256(readFileSync(resolve(root, asset.path))) === asset.sha256), 'CS-009-CHARACTER-HASH', 'public/assets/characters', 'runtime SHA set', 'approved SHA set', 'CHARACTER_ASSET_PROVENANCE.json', 'Restore approved files byte-for-byte.')

  const formalPrA = formalDialogue.filter((row) => ['SCN-G01-00', 'SCN-G01-01', 'SCN-G01-02', 'SCN-G01-03'].includes(row['场景ID']))
  check(formalPrA.length === 11 && formalPrA.every((row) => dialogueSource.includes(row['对话ID'])), 'CS-010-DIALOGUE-SET', 'src/data/dialogue/g01.ts', 'runtime dialogue ids', formalPrA.map((row) => row['对话ID']), '对话脚本.json', 'Restore all eleven formal nodes through SCN-G01-03.')
  check(formalPrA.every((row, index) => dialogueSource.indexOf(row['对话ID']) < (formalPrA[index + 1] ? dialogueSource.indexOf(formalPrA[index + 1]['对话ID']) : Infinity)), 'CS-011-DIALOGUE-ORDER', 'src/data/dialogue/g01.ts', 'node order', 'formal source order', '对话脚本.json', 'Keep the formal sequence.')
  check(!dialogueSource.includes("speaker_id: 'CHAR-UNKNOWN'"), 'CS-012-SPEAKER', 'src/data/dialogue/g01.ts', 'speaker ids', 'registered ids', 'Issue #3 §6', 'Use registered speakers.')
  check([...xingyuStates, ...qimaStates].every((state) => !dialogueSource.includes(`portrait_state: '${state}-unknown'`)), 'CS-013-PORTRAIT', 'src/data/dialogue/g01.ts', 'portrait states', 'approved states', 'Issue #8 acceptance', 'Use approved portrait states.')
  check(!dialogueSource.includes('DLG-G01-9999'), 'CS-014-NEXT', 'src/data/dialogue/g01.ts', 'next references', 'existing nodes only', '对话脚本.json', 'Repair dangling next references.')
  check(['dialogue_id', 'scene_id', 'speaker_id', 'portrait_state', 'text', 'sequence', 'trigger_condition', 'next_dialogue_id', 'writes_variables', 'grants_item', 'updates_character_state', 'updates_scene_state', 'skippable', 'replayable', 'history_visible'].every((field) => dialogueSource.includes(field)), 'CS-015-DIALOGUE-FIELDS', 'src/data/dialogue/g01.ts', 'field coverage', '15 required fields', 'Issue #3 §6', 'Restore the missing runtime field.')
  check(formalPrA.every((row) => dialogueSource.includes(row['台词'])), 'CS-016-DIALOGUE-TEXT', 'src/data/dialogue/g01.ts', 'dialogue text', 'exact formal text', '对话脚本.json', 'Restore exact formal dialogue text.')
  check(formalPrA.every((row) => !gameView.includes(row['台词'])), 'CS-017-VIEW-DATA', 'src/ui/GameView.ts', 'formal text literals', 'none', 'Issue #3 §6', 'Keep dialogue text in data.')
  check(existsSync(resolve(root, 'src/services/DialogueRunner.ts')), 'CS-018-RUNNER', 'src/services/DialogueRunner.ts', 'file', 'present', 'Issue #3 §6', 'Restore DialogueRunner.')
  check(existsSync(resolve(root, 'src/services/DialogueDataLoader.ts')), 'CS-019-LOADER', 'src/services/DialogueDataLoader.ts', 'file', 'present', 'Issue #3 §6', 'Restore DialogueDataLoader.')
  check(existsSync(resolve(root, 'src/services/DialogueHistory.ts')), 'CS-020-HISTORY', 'src/services/DialogueHistory.ts', 'file', 'present', 'Issue #3 §6', 'Restore DialogueHistory.')
  check(existsSync(resolve(root, 'src/components/characters/CharacterPortrait.ts')), 'CS-021-PORTRAIT-COMPONENT', 'src/components/characters/CharacterPortrait.ts', 'file', 'present', 'Issue #3 §6', 'Restore CharacterPortrait.')
  check(gameTypes.includes('currentDialogueId') && gameTypes.includes('readDialogueIds'), 'CS-022-SAVE-NODE', 'src/game/types.ts', 'dialogue state fields', 'node, active, read set', 'Issue #3 §8', 'Persist the dialogue state.')
  check(gameTypes.includes('dialogueHistory') && gameSave.includes('dialogueHistory'), 'CS-023-SAVE-DIALOGUE', 'src/game/save.ts', 'history persistence', 'saved and restored', 'Issue #3 §8', 'Persist dialogue history.')
  check(gameTypes.includes('characterStates') && gameTypes.includes('unlockedCharacterIds'), 'CS-024-SAVE-CHARACTER', 'src/game/types.ts', 'character save fields', 'states and profiles', 'Issue #3 §8', 'Persist character state and archives.')
  check(gameSave.includes('SAVE_SCHEMA_VERSION = 2'), 'CS-025-SAVE-SCHEMA', 'src/game/save.ts', 'schema version', 2, 'Issue #3 §8', 'Use the story-aware schema.')
  check(gameSave.includes('world_star_core_count: 0') && gameEngine.includes('next.flags.world_star_core_count = 0'), 'CS-026-STAR-CORE', 'src/game', 'G01 count guards', 0, '06_G01_G02_BOUNDARY.md', 'Force all G01 saves and commits to zero.')
  check(gameSave.includes('g01_chapter_complete: false') && gameSave.includes('g01_handoff_to_g02: false'), 'CS-027-HANDOFF-FLAGS', 'src/game/save.ts', 'handoff defaults', false, '06_G01_G02_BOUNDARY.md', 'Keep both flags false in SCN-G01-00/01.')
  check(gameEngine.includes("currentSceneId: 'SCN-G01-00'"), 'CS-028-CURRENT-SCENE', 'src/game/engine.ts', 'initial scene', 'SCN-G01-00', '场景流程.json', 'Start at the formal first scene.')
  check(['HS-G01-0001', 'HS-G01-0002', 'HS-G01-0003', 'HS-G01-0004'].every((id) => content.includes(id) && formalHotspots.some((row) => row['热点ID'] === id)), 'CS-029-SCN00-HOTSPOTS', 'src/content/g01.ts', 'SCN-G01-00 core hotspots', 'formal ids retained', '热点清单.json', 'Restore the accepted vertical-slice hotspots.')
  check(existsSync(resolve(root, 'tests/character-story/character-data.test.ts')) && existsSync(resolve(root, 'tests/character-story/dialogue.test.ts')), 'CS-030-UNIT-TESTS', 'tests/character-story', 'unit tests', 'character and dialogue suites', 'Issue #3 §19', 'Restore the required unit suites.')
  check(existsSync(resolve(root, '.github/workflows/character-story-gate.yml')), 'CS-031-WORKFLOW', '.github/workflows/character-story-gate.yml', 'workflow', 'Character Story Gate', 'Issue #3 §23', 'Restore the independent workflow.')
  check(JSON.stringify(contract.states) === JSON.stringify(['S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6']), 'CS-032-SCENE-STATES', rel(policyPath), contract.states, ['S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'], '场景状态机.json', 'Restore S0 through S6.')
  check(JSON.stringify(contract.qima_required_transition) === JSON.stringify(['offline', 'damaged', 'booting', 'normal']) && contract.booting_skippable === false, 'CS-033-QIMA-CHAIN', rel(policyPath), contract.qima_required_transition, ['offline', 'damaged', 'booting', 'normal'], 'CHAR-002_QIMA.md', 'Restore the non-skippable boot sequence.')
  check(JSON.stringify(contract.hints.map((hint) => hint.level)) === JSON.stringify([1, 2, 3]) && contract.hints[2].effect === '完成一步' && contract.hints.every((hint) => hint.completes_all === false) && formalHints.filter((row) => row['场景ID'] === 'SCN-G01-01').length === 3, 'CS-034-HINTS', rel(policyPath), contract.hints, 'levels 1/2/3, final completes one step', '三级提示.json', 'Restore the exact three-level contract.')
  check(
    contract.critical_items.length === 4 &&
      contract.critical_items.every((item) => item.wrong_use_consumes === false) &&
      contract.critical_items.slice(0, 3).every((item) =>
        formalInventory.some((row) => row['道具ID'] === item.item_id),
      ) &&
      contract.critical_items[3]?.authorization === 'Issue #3 comment 5105774977',
    'CS-035-CRITICAL-ITEM',
    rel(policyPath),
    contract.critical_items,
    'four non-consuming wrong-use contracts with formal or explicit authorization',
    '背包道具流转.json + Issue #3 comment 5105774977',
    'Restore every key-item contract.',
  )
  const activeScope = policy.active_scope
  check(
    contract.completion_boundary === 'SCN-G01-02' &&
      contract.completion_boundary_only === false &&
      JSON.stringify(activeScope.implemented_scenes) === JSON.stringify(['SCN-G01-02', 'SCN-G01-03']) &&
      activeScope.maximum_runtime_scene === 'SCN-G01-03' &&
      activeScope.next_boundary === 'SCN-G01-04' &&
      activeScope.next_boundary_only === true &&
      activeScope.g01_chapter_complete === false &&
      activeScope.g01_handoff_to_g02 === false &&
      existsSync(resolve(root, 'src/scenes/g01/scn02.ts')) &&
      existsSync(resolve(root, 'src/scenes/g01/scn03.ts')) &&
      !existsSync(resolve(root, 'src/scenes/g01/scn04.ts')),
    'CS-036-SCOPE',
    rel(policyPath),
    activeScope,
    {
      implemented: ['SCN-G01-02', 'SCN-G01-03'],
      maximum: 'SCN-G01-03',
      nextBoundaryOnly: 'SCN-G01-04',
    },
    'Issue #9 comment 5114041966',
    'Keep PR-A implementation within SCN-G01-02 and SCN-G01-03.',
  )

  const packagePath = resolve(root, policy.formal_source.package_path)
  if (!existsSync(packagePath)) {
    fail('CS-BLOCK-001-FORMAL-ART', policy.formal_source.package_path, 'formal package missing', 'verified G01 V3.0 package', 'Issue #3 §13/§26', 'Restore the verified source package.')
  } else {
    const packageBytes = readFileSync(packagePath)
    if (sha256(packageBytes) !== policy.formal_source.package_sha256) {
      fail('CS-BLOCK-001-FORMAL-ART', policy.formal_source.package_path, sha256(packageBytes), policy.formal_source.package_sha256, 'source_packages/manifests/source-packages.json', 'Restore the verified package bytes.')
    }
    for (const [entryKey, hashKey] of [
      ['scene_board_entry', 'scene_board_sha256'],
      ['prop_board_entry', 'prop_board_sha256'],
    ]) {
      const entry = zipEntry(packageBytes, policy.formal_source[entryKey])
      if (!entry || sha256(entry) !== policy.formal_source[hashKey]) {
        fail(
          'CS-BLOCK-001-FORMAL-ART',
          policy.formal_source[entryKey],
          entry ? sha256(entry) : 'missing ZIP entry',
          policy.formal_source[hashKey],
          'PKG-G01-V3.0',
          'Restore the exact verified formal overview board.',
        )
      }
    }
    const artProvenance = JSON.parse(read(policy.runtime_art_provenance))
    const sceneManifest = JSON.parse(read(policy.scene_manifest))
    const hosManifest = JSON.parse(read(policy.hos_manifest))
    const requiredPaths = policy.runtime_asset_requirements.flatMap((asset) =>
      Array.isArray(asset.runtime_path) ? asset.runtime_path : [asset.runtime_path],
    )
    const runtimeEntries = Object.entries(artProvenance.runtime_sha256)
    const runtimePaths = runtimeEntries.map(([path]) => path)
    const runtimeHashes = runtimeEntries.map(([, hash]) => hash)
    const targetPaths = hosManifest.targets.flatMap((target) => [
      [target.scene_asset, target.scene_sha256],
      [target.inventory_asset, target.inventory_sha256],
    ])
    const distractorPaths = hosManifest.distractors.map((item) => [
      item.runtime_path,
      item.sha256,
    ])
    const statePaths = artProvenance.state_layers.map((item) => [
      item.runtime_path,
      item.sha256,
    ])
    const allObjectPaths = [...targetPaths, ...distractorPaths]
    const scenePath = resolve(root, sceneManifest.runtime_path)
    const sceneMeta = imageMetadata(scenePath)

    check(
      requiredPaths.every(
        (path) => typeof path === 'string' && existsSync(resolve(root, path)),
      ) &&
        policy.runtime_asset_requirements.every(
          (asset) =>
            asset.status === 'project_owner_authorized_runtime_production',
        ) &&
        !allowSourceGap,
      'CS-BLOCK-001-FORMAL-ART',
      'config/character-story-policy.json',
      {
        runtime_assets: requiredPaths.length,
        statuses: policy.runtime_asset_requirements.map((asset) => asset.status),
        source_gap_override: allowSourceGap,
      },
      'all formal runtime assets present, authorized, and no bypass flag',
      'Issue #3 comment 5105774977',
      'Restore missing art or remove the prohibited source-gap override.',
    )
    check(
      sceneManifest.scene_id === 'SCN-G01-01' &&
        sceneManifest.asset_id === 'SCENE-G01-002' &&
        existsSync(scenePath) &&
        sha256(readFileSync(scenePath)) === sceneManifest.sha256,
      'CS-ART-001-SCENE',
      policy.scene_manifest,
      sceneManifest,
      'verified SCENE-G01-002 runtime file and SHA',
      'scene_manifest.json',
      'Restore the recorded scene asset.',
    )
    check(
      hosManifest.targets.length === 4 &&
        hosManifest.distractors.length >= 5 &&
        allObjectPaths.every(
          ([path, hash]) =>
            existsSync(resolve(root, path)) &&
            sha256(readFileSync(resolve(root, path))) === hash,
        ),
      'CS-ART-002-ITEMS',
      policy.hos_manifest,
      {
        targets: hosManifest.targets.length,
        distractors: hosManifest.distractors.length,
      },
      '4 target and at least 5 distractor runtime layers with exact SHA-256',
      'HOS-G01-002 + Issue #3 comment 5105774977',
      'Restore every independent HOS object layer.',
    )
    check(
      allObjectPaths.every(([path]) => {
        const metadata = imageMetadata(resolve(root, path))
        return metadata.format === 'png' && metadata.hasAlpha
      }),
      'CS-ART-003-ALPHA',
      'public/assets/g01/scn-g01-01',
      'object image metadata',
      'all target and distractor layers are alpha PNG',
      'Issue #3 art acceptance',
      'Rebuild opaque or non-PNG object layers.',
    )
    check(
      sceneMeta.width >= 2560 &&
        sceneMeta.height >= 1440 &&
        Math.abs(sceneMeta.width / sceneMeta.height - 16 / 9) < 0.001 &&
        sceneManifest.width === sceneMeta.width &&
        sceneManifest.height === sceneMeta.height,
      'CS-ART-004-RESOLUTION',
      sceneManifest.runtime_path,
      sceneMeta,
      '16:9 scene at least 2560x1440 with matching manifest dimensions',
      'Issue #3 comment 5105774977',
      'Rebuild the scene at the authorized runtime resolution.',
    )
    check(
      runtimeHashes.length === new Set(runtimeHashes).size,
      'CS-ART-005-UNIQUE-HASH',
      policy.runtime_art_provenance,
      { assets: runtimeHashes.length, unique: new Set(runtimeHashes).size },
      'one unique SHA-256 per distinct runtime layer',
      'Issue #3 art acceptance',
      'Restore duplicated or incorrectly registered layer bytes.',
    )
    check(
      artProvenance.production_status ===
        'project_owner_authorized_runtime_production' &&
        artProvenance.runtime_production_asset === true &&
        artProvenance.generated_or_repainted_parts.length >= 3 &&
        artProvenance.manual_cleanup.length >= 3 &&
        artProvenance.production_tool.includes('image_gen') &&
        Object.entries(artProvenance.production_inputs).every(
          ([path, hash]) =>
            existsSync(resolve(root, path)) &&
            sha256(readFileSync(resolve(root, path))) === hash,
        ) &&
        artProvenance.authorization === policy.runtime_art_authorization &&
        artProvenance.acceptance_status === 'pending_review',
      'CS-ART-006-PROVENANCE',
      policy.runtime_art_provenance,
      artProvenance.production_status,
      'complete owner-authorized production provenance pending review',
      'Issue #3 comment 5105774977',
      'Restore honest generated/repainted production metadata.',
    )
    check(
      !runtimePaths.some(
        (path) =>
          path.includes('概念设计总览') ||
          path.includes('/source/') ||
          path.includes('source_packages/'),
      ) &&
        !sceneManifest.runtime_path.includes('概念设计'),
      'CS-ART-007-NO-BOARD',
      policy.runtime_art_provenance,
      runtimePaths,
      'runtime production files only; no overview boards',
      'PKG-G01-V3.0',
      'Remove design-board paths from runtime.',
    )
    check(
      artProvenance.forbidden_sources.pr_5_assets_used === false &&
        !JSON.stringify(artProvenance).match(/pull\/5|pr-?5/i),
      'CS-ART-008-NO-PR5',
      policy.runtime_art_provenance,
      artProvenance.forbidden_sources,
      'PR #5 assets unused',
      'PR #5 close decision',
      'Remove PR #5 assets and references.',
    )
    check(
      artProvenance.forbidden_sources.third_party_assets_used === false,
      'CS-ART-009-NO-THIRD-PARTY',
      policy.runtime_art_provenance,
      artProvenance.forbidden_sources.third_party_assets_used,
      false,
      'Issue #3 comment 5105774977',
      'Remove third-party art.',
    )
    check(
      statePaths.length >= 6 &&
        statePaths.every(
          ([path, hash]) =>
            existsSync(resolve(root, path)) &&
            sha256(readFileSync(resolve(root, path))) === hash,
        ) &&
        statePaths.some(([path]) => path.includes('booting_effect')) &&
        statePaths.some(([path]) => path.includes('normal_effect')),
      'CS-ART-010-STATES',
      `${policy.runtime_art_provenance}#state_layers`,
      statePaths.map(([path]) => path),
      'repair installation plus booting and normal state layers',
      'Issue #3 art acceptance',
      'Restore every independent repair/effect state layer.',
    )
    check(
      content.includes('hosManifest') &&
        content.includes('sceneManifest') &&
        gameView.includes('hosManifest.foreground_occlusion_asset') &&
        !gameView.includes('data:image/svg') &&
        !content.includes('placeholder'),
      'CS-ART-011-NO-PLACEHOLDER',
      'src/content/g01.ts + src/ui/GameView.ts',
      'data-driven raster runtime integration',
      'no CSS/SVG/text placeholder objects',
      'Issue #3 comment 5105774977',
      'Use the registered raster manifests at runtime.',
    )
    check(
      runtimeEntries.length === 23 &&
        runtimeEntries.every(
          ([path, hash]) =>
            existsSync(resolve(root, path)) &&
            sha256(readFileSync(resolve(root, path))) === hash,
        ) &&
        hosManifest.targets.every(
          (target) =>
            target.runtime_asset === true &&
            target.wrong_use_consumes === false &&
            target.position &&
            target.state,
        ),
      'CS-ART-012-INTEGRITY',
      policy.runtime_art_provenance,
      { runtime_assets: runtimeEntries.length, targets: hosManifest.targets.length },
      '23 exact runtime assets and complete target interaction records',
      'scene_manifest.json + hos_manifest.json',
      'Regenerate manifests and hashes from the production script.',
    )
  }
}

if (errors.length) {
  for (const error of errors) {
    console.error(
      `[${error.rule}] path=${error.path} actual=${JSON.stringify(error.actual)} expected=${JSON.stringify(error.expected)} source=${error.source} fix=${error.fix}`,
    )
  }
  process.exitCode = 1
} else {
  console.log(
    `CHARACTER_STORY_RULES_OK rules=${passed} source_gap_override=${allowSourceGap}`,
  )
}
