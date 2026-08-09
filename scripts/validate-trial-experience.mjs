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
let experiences = read('src/data/trial/sceneExperiences.ts')
let mechanics = read('src/game/minigames/trialMechanics.ts')
let mechanicPanel = read('src/ui/TrialMechanicPanel.ts')
let gameView = read('src/ui/GameView.ts')
let engine = read('src/game/engine.ts')
let gameTypes = read('src/game/types.ts')
let characterReveal = read('src/data/trial/characterReveal.ts')
let dialoguePresentation = read('src/data/dialogue/presentation.ts')
let storyIntro = read('src/ui/StoryIntro.ts')
let correctiveE2e = read('tests-e2e/trial-experience-corrective.spec.ts')
let trialWorkflow = read('.github/workflows/trial-experience-gate.yml')
let styles = read('src/styles.css')
let packageConfig = json('package.json')
const assetProvenance = json('docs/art/TRIAL_EXPERIENCE_ASSET_PROVENANCE.json')
const sourceMirror = json('source_packages/manifests/formal-source-mirror.json')

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
    'duplicate-mechanic': () => { experiences = experiences.replace("mechanicType: 'signal-memory'", "mechanicType: 'rotating-circuit'") },
    'missing-scene-story': () => { experiences = experiences.replace('nextReason:', 'removedNextReason:') },
    'revisit-regresses-mainline': () => { engine = engine.replace('if (enteredOrder > mainlineOrder) next.mainlineSceneId = sceneId', 'next.mainlineSceneId = sceneId') },
    'qima-card-early': () => { app += "\nconst earlyCard = ['CHAR-QIMA']" },
    'dark-shell': () => { styles = styles.replace('--light-panel: #ffffff', '--light-panel: #08111d') },
    'identity-markup-bypass': () => { dialoguePresentation = dialoguePresentation.replace("markup.replaceAll('七码', CONCEALED_QIMA_NAME)", 'markup') },
    'sequence-button-restored': () => { mechanics = mechanics.replace("targetPlacements: { pressure: 'timeline-1'", "sequence: ['pressure', 'patch', 'repress'], removedPlacements: { pressure: 'timeline-1'") },
    'lfs-checkout-restored': () => { trialWorkflow += '\n          lfs: true' },
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
check(title.includes('STARWRECK-TRIAL-0.3.0'), 'TRIAL-ENTRY-005', 'formal trial version is missing from title')
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

const sceneIds = [...experiences.matchAll(/sceneId:\s*'([^']+)'/g)].map((match) => match[1])
const mechanicTypes = [...experiences.matchAll(/mechanicType:\s*'([^']+)'/g)].map((match) => match[1])
check(sceneIds.length === 11 && new Set(sceneIds).size === 11, 'TRIAL-FLOW-001', 'the trial must contain exactly eleven unique player scenes')
check(mechanicTypes.length === 11 && new Set(mechanicTypes).size === 11, 'TRIAL-FLOW-002', 'each player scene must use a distinct mechanicType')
for (const field of ['entryReason:', 'openingEvent:', 'mainGoal:', 'stepByState:', 'searchGoal:', 'combineGoal:', 'characterFeedback:', 'completionResult:', 'nextReason:']) {
  check((experiences.match(new RegExp(field, 'g')) ?? []).length === 12, 'TRIAL-FLOW-003', `scene experience field ${field} is incomplete`)
}
check(mechanics.includes("'initial'" ) && mechanics.includes("'error'") && mechanics.includes("'partial'") && mechanics.includes("'complete'"), 'TRIAL-MECHANIC-001', 'four-state mechanic lifecycle is incomplete')
check(mechanicPanel.includes('data-mechanic-draggable') && mechanicPanel.includes('data-mechanic-range'), 'TRIAL-MECHANIC-002', 'real drag and pointer/range controls are missing')
check(!mechanicPanel.includes('data-answer='), 'TRIAL-MECHANIC-003', 'an exposed answer button is present')
check(gameView.includes('performTrialMechanic') && gameView.includes('data-action="open-map"'), 'TRIAL-MECHANIC-004', 'mechanics or scene map are not wired into the runtime')
check((mechanics.match(/sequence:/g) ?? []).length === 3, 'TRIAL-MECHANIC-005', 'button-sequence model leaked into a non-memory/non-path mechanic')
check(mechanics.includes("pressure: 'timeline-1'") && mechanicPanel.includes('task-timeline') && mechanicPanel.includes('data-mechanic-dropzone'), 'TRIAL-MECHANIC-006', 'task ordering is not a drag/reorder then submit interaction')
check(mechanicPanel.includes('data-playback-seen') && mechanicPanel.includes('mechanic-play'), 'TRIAL-MECHANIC-007', 'signal memory lacks a playback-before-reproduction phase')
check(mechanicPanel.includes('safe-pipe') && mechanicPanel.includes('dead-pipe') && mechanicPanel.includes('maze-node'), 'TRIAL-MECHANIC-008', 'airflow maze lacks spatial branches and a dead end')
check(mechanics.includes("'fragment-a': 'star-slot-a'") && mechanicPanel.includes('star-piece') && mechanicPanel.includes('mechanic-rotate'), 'TRIAL-MECHANIC-009', 'star map lacks independent drag, rotation and target slots')
check(mechanicPanel.includes('safe-edge') && mechanicPanel.includes('danger-edge') && mechanicPanel.includes('route-node'), 'TRIAL-MECHANIC-010', 'route planning lacks an edge graph and danger constraint')
check(mechanicPanel.includes('waveform-board') && mechanicPanel.includes('attitude-board') && mechanicPanel.includes('data-mechanic-range'), 'TRIAL-MECHANIC-011', 'continuous waveform or two-axis attitude inputs are missing')
check(mechanics.includes("'pulse-1': 3") && mechanicPanel.includes('pulse-wave-board') && !mechanics.includes("sequence: ['triple'"), 'TRIAL-MECHANIC-012', 'G02 pulse decoding is still a text sequence')
check(mechanics.includes("'weight-1': 'right-far'") && mechanicPanel.includes('crane-board'), 'TRIAL-MECHANIC-013', 'crane rescue lacks physical weight-to-hook placement')
check(mechanics.includes("'borrow-heater': 'heater-borrow'") && mechanicPanel.includes('archive-logic-board'), 'TRIAL-MECHANIC-014', 'borrow/use/return lacks object-to-record spatial matching')

check(gameTypes.includes('mainlineSceneId') && gameTypes.includes('unlockedSceneIds') && gameTypes.includes('completedSceneIds'), 'TRIAL-REVISIT-001', 'save model does not separate viewed scene from mainline')
check(engine.includes('visitScene(sceneId: string)') && engine.includes('returnToMainline()'), 'TRIAL-REVISIT-002', 'scene revisit navigation is incomplete')
check(engine.includes('if (enteredOrder > mainlineOrder) next.mainlineSceneId = sceneId'), 'TRIAL-REVISIT-003', 'revisit can regress or overwrite mainline progress')
check(engine.includes("return { ok: false, message: '这个场景尚未随剧情解锁。' }"), 'TRIAL-REVISIT-004', 'locked scene access does not fail closed')

check(story.includes('星宇与受损导航设备') && !story.includes("title: '星宇与七码'"), 'TRIAL-REVEAL-001', 'Qima identity is disclosed before the repair story')
check(characterReveal.includes('qima_identity_revealed') && app.includes('characterNarrativelyRevealed'), 'TRIAL-REVEAL-002', 'character cards are not gated by narrative reveal')
check(!app.includes("const earlyCard = ['CHAR-QIMA']"), 'TRIAL-REVEAL-003', 'Qima character card is forced before narrative reveal')
check(app.includes("this.#engine?.snapshot.dialogue.active === true"), 'TRIAL-REVEAL-004', 'character cards can interrupt their reveal dialogue')
check(dialoguePresentation.includes("导航核心？回答。"), 'TRIAL-REVEAL-005', 'pre-reveal dialogue still exposes Qima identity')
check(dialoguePresentation.includes("markup.replaceAll('七码', CONCEALED_QIMA_NAME)") && gameView.includes('presentIdentityMarkup(this.#session'), 'TRIAL-REVEAL-006', 'global visible/accessibility identity presentation gate is missing')
check(correctiveE2e.includes('expectNoQimaIdentityLeak') && correctiveE2e.includes('[aria-label*="七码"]') && correctiveE2e.includes('DLG-G01-0025'), 'TRIAL-REVEAL-007', 'fresh-save visible DOM and accessibility leakage E2E is missing')
check(story.includes("characterIds: ['CHAR-XINGYU']") && storyIntro.includes('card.characterIds.map(storyCharacterPortrait)'), 'TRIAL-REVEAL-008', 'pre-reveal story card still forces the Qima portrait')

check(styles.includes('--light-panel: #ffffff') && styles.includes('--light-canvas: #f3f5f7'), 'TRIAL-LIGHT-001', 'light UI palette is missing or darkened')
check(styles.includes('.trial-title-screen') && styles.includes('.topbar') && styles.includes('.trial-card') && styles.includes('.story-modal'), 'TRIAL-LIGHT-002', 'light shell does not cover all primary player surfaces')
check(styles.includes('.scene-treatment') && gameView.includes("style=\"background-image:url('${sceneArt}')\""), 'TRIAL-LIGHT-003', 'scene artwork is no longer preserved inside the light shell')

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

check(assetProvenance.version === 'STARWRECK-TRIAL-0.3.0', 'TRIAL-ASSET-001', 'asset provenance version mismatch')
check(assetProvenance.new_runtime_asset_count === 0 && assetProvenance.new_runtime_assets.length === 0, 'TRIAL-ASSET-002', 'unreported new runtime assets are present')
check(assetProvenance.forbidden_sources.pr_5_assets_used === false, 'TRIAL-ASSET-003', 'PR #5 art is declared in use')
check(assetProvenance.forbidden_sources.third_party_network_assets_used === false, 'TRIAL-ASSET-004', 'third-party art is declared in use')
for (const asset of assetProvenance.reused_runtime_assets) {
  const path = resolve(root, asset.path)
  check(existsSync(path), 'TRIAL-ASSET-005', `reused runtime asset missing: ${asset.path}`)
  const actual = existsSync(path) ? createHash('sha256').update(readFileSync(path)).digest('hex') : ''
  check(actual === asset.sha256, 'TRIAL-ASSET-006', `reused runtime asset SHA mismatch: ${asset.path}`)
}

check(sourceMirror.delivery === 'github_release_sha256_verified_tar', 'TRIAL-SOURCE-001', 'formal sources lack a sustainable non-LFS delivery contract')
check(sourceMirror.entries.length === 22 && new Set(sourceMirror.entries.map((entry) => entry.path)).size === 22, 'TRIAL-SOURCE-002', 'formal source mirror entry set is incomplete or duplicated')
check(/^[a-f0-9]{64}$/.test(sourceMirror.bundle_sha256) && sourceMirror.bundle_size > 300_000_000, 'TRIAL-SOURCE-003', 'formal source mirror bundle is not size/SHA pinned')
for (const workflowPath of [
  '.github/workflows/source-import-integrity.yml', '.github/workflows/baseline-gate.yml',
  '.github/workflows/character-assets-gate.yml', '.github/workflows/character-story-gate.yml',
  '.github/workflows/g01-pr-a-gate.yml', '.github/workflows/g01-pr-b-gate.yml',
  '.github/workflows/g01-demo-gate.yml', '.github/workflows/g02-vertical-slice-gate.yml',
  '.github/workflows/trial-experience-gate.yml',
]) {
  const workflow = workflowPath.endsWith('trial-experience-gate.yml') ? trialWorkflow : read(workflowPath)
  check(!/lfs:\s*true/.test(workflow) && workflow.includes('restore-formal-source-mirror.mjs'), 'TRIAL-SOURCE-004', `${workflowPath} still depends on LFS bandwidth or skips verified restoration`)
}
for (const workflowPath of ['.github/workflows/deploy-g01-demo.yml', '.github/workflows/deploy-g02-slice.yml', '.github/workflows/deploy-trial-experience.yml']) {
  check(!/lfs:\s*true/.test(read(workflowPath)), 'TRIAL-SOURCE-005', `${workflowPath} still blocks Pages on LFS bandwidth`)
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
check(packageConfig.trialVersion === 'STARWRECK-TRIAL-0.3.0', 'TRIAL-DELIVERY-002', 'trial version mismatch')
check(packageConfig.scripts['validate:trial-experience'] === 'node scripts/validate-trial-experience.mjs', 'TRIAL-DELIVERY-003', 'validator script is not registered')
check(packageConfig.scripts['test:trial-experience']?.includes('trial-experience-negative.test.mjs'), 'TRIAL-DELIVERY-004', 'negative test command is not registered')
check(packageConfig.scripts['package:trial-experience'] === 'node scripts/package-trial-experience.mjs', 'TRIAL-DELIVERY-005', 'production package command is not registered')

if (failures.length) {
  console.error(`TRIAL_EXPERIENCE_VALIDATION_FAILED (${failures.length}/${ruleCount})`)
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}

console.log(`TRIAL_EXPERIENCE_VALIDATION_OK rules=${ruleCount} items=25 characters=4 story_cards=6`)
