#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const read = (path) => readFileSync(resolve(root, path), 'utf8')
const json = (path) => JSON.parse(read(path))
const failures = []
let ruleCount = 0
const check = (condition, id, message) => {
  ruleCount += 1
  if (!condition) failures.push(`${id}: ${message}`)
}

let main = read('src/main.ts')
let title = read('src/ui/TitleScreen.ts')
let app = read('src/ui/TrialExperienceApp.ts')
let settings = read('src/ui/SettingsView.ts')
let story = read('src/data/trial/story.ts')
let characters = read('src/data/trial/characters.ts')
let items = read('src/data/trial/items.ts')
let meta = read('src/game/uiMetaSave.ts')
let save = read('src/game/save.ts')
let archive = read('src/ui/ArchiveView.ts')
let packageConfig = json('package.json')
const assetProvenance = json('docs/art/TRIAL_EXPERIENCE_ASSET_PROVENANCE.json')

const mutation = process.argv.find((arg) => arg.startsWith('--mutation='))?.split('=')[1]
if (mutation) {
  const actions = {
    'title-bypass': () => { main = main.replace('new TrialExperienceApp', 'new GameEngine') },
    'continue-always-enabled': () => { title = title.replace("session ? '' : 'disabled aria-disabled=\"true\"'", "''") },
    'fake-login': () => { title += '\nconst fakeAccount = "账号 密码 登录"' },
    'fake-audio': () => { settings += '\nconst fakeAudio = "音乐音量 音效滑块"' },
    'story-too-short': () => { story = story.replace("id: 'WORLD-PROLOGUE-ENTRY'", "removed: 'WORLD-PROLOGUE-ENTRY'") },
    'character-missing': () => { characters = characters.replace("id: 'CHAR-ZHENG'", "removed: 'CHAR-ZHENG'") },
    'item-missing': () => { items = items.replace("'ITM-G02-006':", "'REMOVED-ITM-G02-006':") },
    'item-field-missing': () => { items = items.replace("wrongUseHint: '镜面屏片", "removedWrongUseHint: '镜面屏片") },
    'ui-meta-pollutes-story': () => { meta += '\nconst pollutedStoryFlag = "g01_chapter_complete"' },
    'schema-downgrade': () => { save = save.replace('SAVE_SCHEMA_VERSION = 2', 'SAVE_SCHEMA_VERSION = 1') },
    'later-scene-entry': () => { app += '\nconst forbiddenScene = "SCN-G02-03A"' },
    'developer-copy': () => { title += '\nconst visibleCopy = "项目负责人验收切片 schema v2"' },
    'reset-single-confirm': () => { settings = settings.replace('reset-stage-two', 'reset-confirm') },
    'archive-missing-dialogue': () => { archive = archive.replace("['dialogue', '对话历史']", "['dialogue-removed', '对话历史']") },
    'version-wrong': () => { packageConfig.trialVersion = 'STARWRECK-TRIAL-0.1.0' },
  }
  if (!actions[mutation]) failures.push(`TRIAL-FIXTURE-001: unknown mutation ${mutation}`)
  else actions[mutation]()
}

check(main.includes('new TrialExperienceApp'), 'TRIAL-ENTRY-001', 'startup does not mount the title-first experience shell')
check(!main.includes('new GameEngine'), 'TRIAL-ENTRY-002', 'startup still instantiates the runtime before the title page')
for (const action of ['continue', 'new-game', 'chapters', 'archive', 'settings', 'credits']) {
  check(title.includes(`data-trial-action="${action}"`), 'TRIAL-ENTRY-003', `title action ${action} is missing`)
}
check(title.includes('disabled aria-disabled="true"'), 'TRIAL-ENTRY-004', 'continue is not disabled without a save')
check(title.includes('STARWRECK-TRIAL-0.2.0'), 'TRIAL-ENTRY-005', 'formal trial version is missing from title')
check(title.includes('pwaInstallAvailable') && title.includes('fullscreenAvailable'), 'TRIAL-ENTRY-006', 'capability-gated install/fullscreen actions are missing')
check(!/(账号|密码|短信|第三方登录|云账户)/.test(title), 'TRIAL-ENTRY-007', 'fake online account UI is present')

check((story.match(/\bid:\s*'WORLD-/g) ?? []).length === 6, 'TRIAL-STORY-001', 'story intro must contain exactly six sourced cards')
check(story.includes("id: 'G01'") && story.includes("id: 'G02'"), 'TRIAL-STORY-002', 'G01/G02 chapter guides are incomplete')
for (const source of [
  'docs/story/G01-G13/G01.md',
  'docs/story/G01-G13/G02.md',
  'docs/story-runtime/G01_CHARACTER_STORY_RUNTIME.md',
  'docs/story-runtime/G02_VERTICAL_SLICE_00_02.md',
]) {
  check(story.includes(source) && existsSync(resolve(root, source)), 'TRIAL-STORY-003', `formal copy source missing: ${source}`)
}
check(app.includes("data-trial-action=\"intro-skip\"") || read('src/ui/StoryIntro.ts').includes('data-trial-action="intro-skip"'), 'TRIAL-STORY-004', 'story intro cannot be skipped')
check(app.includes('#meta.introSeen = true'), 'TRIAL-STORY-005', 'intro seen state is not persisted')
check(app.includes("#showChapterGuide('G02', 'handoff')"), 'TRIAL-STORY-006', 'G01-to-G02 recap interception is missing')

for (const id of ['CHAR-XINGYU', 'CHAR-QIMA', 'CHAR-ALMAO', 'CHAR-ZHENG']) {
  check(characters.includes(`id: '${id}'`), 'TRIAL-CHAR-001', `${id} profile is missing`)
}
check(read('src/ui/CharacterIntroCard.ts').includes('is-nonblocking') && !read('src/ui/CharacterIntroCard.ts').includes('trial-modal-backdrop'), 'TRIAL-CHAR-004', 'first-encounter character card blocks the scene')
for (const field of ['identity:', 'relationship:', 'currentGoal:', 'traits:', 'portrait:', 'sourcePaths:']) {
  check((characters.match(new RegExp(field, 'g')) ?? []).length >= 4, 'TRIAL-CHAR-002', `character field ${field} is incomplete`)
}
check(!characters.includes('/pr5/'), 'TRIAL-CHAR-003', 'PR #5 character art is referenced')

const itemIds = [...items.matchAll(/^\s{2}'([^']+)'\s*:\s*\{/gm)].map((match) => match[1])
const expectedItemIds = [
  'ITM-G01-001', 'ITM-G01-002', 'ITM-G01-004', 'ITM-G01-005', 'ITM-G01-006',
  'RUNTIME-ITM-G01-FIXED-BUCKLE', 'RUNTIME-ITM-G01-MAINTENANCE-SHEET',
  'RUNTIME-ITM-G01-STAR-MAP-KEY', 'ITM-G01-007', 'ITM-G01-008', 'ITM-G01-009',
  'RUNTIME-ITM-G01-REPRESS-KEY', 'RUNTIME-ITM-G01-010-A', 'RUNTIME-ITM-G01-010-B',
  'RUNTIME-ITM-G01-010-C', 'ITM-G01-011', 'ITM-G01-012', 'ITM-G01-013',
  'RUNTIME-ITM-G02-MAGNETIC-GRAPNEL', 'ITM-G02-002', 'ITM-G02-003', 'ITM-G02-004',
  'RUNTIME-ITM-G02-005-A', 'RUNTIME-ITM-G02-005-B', 'ITM-G02-006',
]
check(itemIds.length === 25, 'TRIAL-ITEM-001', `expected 25 inventory item copy records, found ${itemIds.length}`)
check(new Set(itemIds).size === 25, 'TRIAL-ITEM-002', 'inventory item copy IDs are duplicated')
check(JSON.stringify(itemIds) === JSON.stringify(expectedItemIds), 'TRIAL-ITEM-006', 'inventory item copy set no longer matches the 25 formal items')
for (const field of ['type:', 'background:', 'observation:', 'defaultUsageStatus:', 'critical:', 'wrongUseHint:']) {
  check((items.match(new RegExp(field, 'g')) ?? []).length === 26, 'TRIAL-ITEM-003', `item field ${field} is incomplete or duplicated`)
}
check(items.includes('collectToInventory !== false'), 'TRIAL-ITEM-004', 'coverage is not derived from all inventory-capable formal items')
check(items.includes('Missing trial item copy'), 'TRIAL-ITEM-005', 'missing item copy does not fail closed')

check(meta.includes("UI_META_STORAGE_KEY = 'starwreck:ui-meta:v1'"), 'TRIAL-SAVE-001', 'separate UI metadata key is missing')
check(meta.includes('introSeen') && meta.includes('seenCharacterCards') && meta.includes('seenItemCards'), 'TRIAL-SAVE-002', 'UI seen metadata is incomplete')
check(meta.includes('settings') && meta.includes('resetProgress'), 'TRIAL-SAVE-003', 'persistent settings/reset behavior is missing')
check(!/(g01_chapter_complete|g01_handoff_to_g02|world_star_core_count)/.test(meta), 'TRIAL-SAVE-004', 'UI metadata pollutes formal story variables')
check(save.includes('SAVE_SCHEMA_VERSION = 2'), 'TRIAL-SAVE-005', 'schema v2 compatibility was changed')
check(app.includes('recoveredFromCorruption'), 'TRIAL-SAVE-006', 'corrupt storage safe recovery is not surfaced')
check(settings.includes('reset-stage-one') && settings.includes('reset-stage-two') && settings.includes('reset-confirm'), 'TRIAL-SAVE-007', 'reset does not require two confirmations')

for (const tab of ['world', 'chapters', 'characters', 'items', 'evidence', 'dialogue']) {
  check(archive.includes(`['${tab}',`), 'TRIAL-ARCHIVE-001', `archive tab ${tab} is missing`)
}
check(archive.includes('usedItemIds.includes'), 'TRIAL-ARCHIVE-002', 'used items do not remain available in archive')
check(archive.includes('dialogueHistory'), 'TRIAL-ARCHIVE-003', 'dialogue history is not connected to schema v2')
check(!/(音乐音量|音效滑块|音频音量)/.test(settings), 'TRIAL-SETTINGS-001', 'non-functional audio controls are present')
for (const setting of ['setting-font', 'setting-dialogue', 'setting-motion', 'fullscreen']) {
  check(settings.includes(`data-trial-action="${setting}"`), 'TRIAL-SETTINGS-002', `functional setting ${setting} is missing`)
}

const formalUi = [title, read('src/ui/StoryIntro.ts'), read('src/ui/CharacterIntroCard.ts'), read('src/ui/ItemDetailCard.ts'), settings]
const forbiddenCopy = /schema(?:\s+v?\d+)?|项目负责人|验收|交付边界|开发阶段|测试文字|垂直切片|门禁/i
check(formalUi.every((source) => !forbiddenCopy.test(source)), 'TRIAL-COPY-001', 'formal player UI exposes development copy')
check(!app.includes('SCN-G02-03A') && !app.includes('SCN-G02-03B') && !app.includes('SCN-G02-03C') && !app.includes('SCN-G02-03D'), 'TRIAL-SCOPE-001', 'later G02 scene entry was implemented')

check(assetProvenance.version === 'STARWRECK-TRIAL-0.2.0', 'TRIAL-ASSET-001', 'asset provenance version mismatch')
check(assetProvenance.new_runtime_asset_count === 0 && assetProvenance.new_runtime_assets.length === 0, 'TRIAL-ASSET-002', 'unreported new runtime assets are present')
check(assetProvenance.forbidden_sources.pr_5_assets_used === false, 'TRIAL-ASSET-003', 'PR #5 art is declared in use')
check(assetProvenance.forbidden_sources.third_party_network_assets_used === false, 'TRIAL-ASSET-004', 'third-party art is declared in use')
for (const asset of assetProvenance.reused_runtime_assets) {
  const path = resolve(root, asset.path)
  check(existsSync(path), 'TRIAL-ASSET-005', `reused runtime asset missing: ${asset.path}`)
  const actual = existsSync(path) ? createHash('sha256').update(readFileSync(path)).digest('hex') : ''
  check(actual === asset.sha256, 'TRIAL-ASSET-006', `reused runtime asset SHA mismatch: ${asset.path}`)
}

for (const path of [
  'docs/plan/TRIAL_EXPERIENCE_IMPLEMENTATION_PLAN.md',
  'docs/story-runtime/TRIAL_EXPERIENCE_COPY_MAPPING.md',
  'docs/review/TRIAL_EXPERIENCE_VISUAL_ACCEPTANCE.md',
  'docs/art/TRIAL_EXPERIENCE_ASSET_PROVENANCE.json',
  'README_TRIAL.md',
  'scripts/package-trial-experience.mjs',
  'tests/trial-experience/runtime.test.ts',
  'tests/trial-experience/trial-experience-negative.test.mjs',
  'tests-e2e/trial-experience.spec.ts',
  '.github/workflows/trial-experience-gate.yml',
  '.github/workflows/deploy-trial-experience.yml',
]) {
  check(existsSync(resolve(root, path)), 'TRIAL-DELIVERY-001', `required delivery file missing: ${path}`)
}
check(packageConfig.trialVersion === 'STARWRECK-TRIAL-0.2.0', 'TRIAL-DELIVERY-002', 'trial version mismatch')
check(packageConfig.scripts['validate:trial-experience'] === 'node scripts/validate-trial-experience.mjs', 'TRIAL-DELIVERY-003', 'validator script is not registered')
check(packageConfig.scripts['test:trial-experience']?.includes('trial-experience-negative.test.mjs'), 'TRIAL-DELIVERY-004', 'negative test command is not registered')
check(packageConfig.scripts['package:trial-experience'] === 'node scripts/package-trial-experience.mjs', 'TRIAL-DELIVERY-005', 'production package command is not registered')

if (failures.length) {
  console.error(`TRIAL_EXPERIENCE_VALIDATION_FAILED (${failures.length}/${ruleCount})`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`TRIAL_EXPERIENCE_VALIDATION_OK rules=${ruleCount} items=25 characters=4 story_cards=6`)
