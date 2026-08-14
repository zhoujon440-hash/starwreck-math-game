import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(path, 'utf8')
const mutation = process.argv.find((arg) => arg.startsWith('--mutation='))?.slice('--mutation='.length)
const failures = []
const check = (condition, id, message) => {
  if (!condition) failures.push(`${id} ${message}`)
}

let packageConfig = JSON.parse(read('package.json'))
let presentations = read('src/data/trial/scenePresentation.ts')
let types = read('src/game-scene/types.ts')
let stage = read('src/game-scene/GameStage.ts')
let camera = read('src/game-scene/SceneCamera.ts')
let hud = read('src/game-scene/SceneHud.ts')
let interaction = read('src/game-scene/InteractionController.ts')
let drag = read('src/game/drag.ts')
let gameView = read('src/ui/GameView.ts')
let app = read('src/ui/TrialExperienceApp.ts')
let surface = read('src/game-scene/mechanics/MechanicSurface.ts')
let panel = read('src/ui/TrialMechanicPanel.ts')
let styles = read('src/styles.css')
let workflow = read('.github/workflows/trial-game-feel-gate.yml')
let e2e = read('tests-e2e/trial-game-feel.spec.ts') + read('tests-e2e/trial-game-feel-recorded.spec.ts')
let dragProof = read('tests-e2e/helpers/reliable-drag.ts')

const mutations = {
  'missing-presentation': () => { presentations = presentations.replace("'SCN-G02-02',", "'SCN-G02-02-REMOVED',") },
  'duplicate-device': () => { presentations = presentations.replace("id: 'archive-workbench'", "id: 'distribution-box'") },
  'world-state-missing': () => { presentations = presentations.replace("complete: '电视墙与借用档案全部恢复'", "finish: '电视墙与借用档案全部恢复'") },
  'camera-mode-missing': () => { types = types.replace(" | 'success'", '') },
  'modal-restored': () => { surface = surface.replace('role="region"', 'role="dialog" aria-modal="true"') },
  'drag-bounce-removed': () => { interaction = interaction.replace("success ? 'snap' : 'bounce'", "'snap'") },
  'blocking-item-card-restored': () => { app += "\nthis.#showItemCard(newlyFoundItems[0], true)\n" },
  'checklist-visible': () => { styles = styles.replace('.legacy-objective-card { display: none !important; }', '.legacy-objective-card { display: block; }') },
  'reduced-motion-removed': () => { styles = styles.replaceAll("@media (prefers-reduced-motion: reduce)", '@media (prefers-reduced-motion: no-preference)') },
  'qima-leak': () => { presentations = presentations.replace('受损导航设备', '七码') },
  'schema-upgrade': () => { app = app.replace("starwreck:trial:runtime-active", "starwreck:trial:v3:runtime-active") },
  'later-scene': () => { presentations += "\n// SCN-G02-03 gameplay\n" },
  'skip-existing-gate': () => { workflow = workflow.replace('npm run validate:trial-experience', 'echo skipped-trial-experience') },
  'central-panel-restored': () => { surface = surface.replace('class="in-world-mechanic', 'class="trial-mechanic-panel') },
  'generic-submit-restored': () => { panel += '\n<button data-action="mechanic-submit">提交当前结构</button>\n' },
  'mainline-topbar-restored': () => { gameView = gameView.replace('<section class="scene-frame', '<header class="topbar"></header><section class="scene-frame') },
}
if (mutation) {
  const apply = mutations[mutation]
  if (!apply) {
    console.error(`GAME-FEEL-MUTATION-UNKNOWN ${mutation}`)
    process.exit(2)
  }
  apply()
}

const requiredScenes = [
  'SCN-G01-00', 'SCN-G01-01', 'SCN-G01-02', 'SCN-G01-03', 'SCN-G01-04', 'SCN-G01-05',
  'SCN-G01-06', 'SCN-G01-07', 'SCN-G02-00', 'SCN-G02-01', 'SCN-G02-02',
]
const sceneIds = [...presentations.matchAll(/presentation\(\s*\n?\s*'([^']+)'/g)].map((match) => match[1])
const deviceIds = [...presentations.matchAll(/\{ id: '([^']+)'/g)].map((match) => match[1])
check(sceneIds.length === 11, 'GAME-FEEL-STAGE-001', 'exactly eleven scene presentations are required')
check(requiredScenes.every((id) => sceneIds.includes(id)), 'GAME-FEEL-STAGE-002', 'scene presentation coverage is incomplete')
check(new Set(sceneIds).size === 11 && new Set(deviceIds).size === 11, 'GAME-FEEL-STAGE-003', 'scene and device identifiers must be unique')
check((presentations.match(/coordinateSpace: 'percent-16:9'/g) ?? []).length >= 1, 'GAME-FEEL-STAGE-004', '16:9 percentage coordinate space is missing')
check((presentations.match(/initial:/g) ?? []).length === 11 && (presentations.match(/partial:/g) ?? []).length === 11 && (presentations.match(/complete:/g) ?? []).length === 11, 'GAME-FEEL-WORLD-001', 'every scene needs initial, partial and observable completion states')
check((presentations.match(/effect:/g) ?? []).length === 11, 'GAME-FEEL-WORLD-002', 'every scene needs a world effect')

check(types.includes("'scene' | 'focus' | 'mechanic' | 'success'"), 'GAME-FEEL-CAMERA-001', 'camera state contract is incomplete')
check(camera.includes('focusOn(') && camera.includes('showMechanic()') && camera.includes('showSuccess()') && camera.includes('returnToScene()'), 'GAME-FEEL-CAMERA-002', 'camera transitions are incomplete')
check(gameView.includes('data-game-stage=') && gameView.includes('game-stage-world-plane') && gameView.includes('game-stage-focus'), 'GAME-FEEL-STAGE-005', 'GameStage is not mounted in the runtime canvas')
check(gameView.includes("case 'open-stage-mechanic'"), 'GAME-FEEL-STAGE-006', 'in-scene device entry is missing')
check(stage.includes('data-scene-object=') && stage.includes('data-world-visual-state=') && stage.includes('data-stage-layer="fx"'), 'GAME-FEEL-WORLD-003', 'scene objects and world change layers are missing')
check(hud.includes('scene-hud') && hud.includes('data-action="open-map"') && hud.includes('data-action="open-journal"') && hud.includes('data-action="open-history"') && hud.includes('data-action="open-profile"') && hud.includes('data-action="return-current-task"'), 'GAME-FEEL-HUD-001', 'lightweight scene HUD is incomplete')
check(styles.includes('.legacy-objective-card { display: none !important; }'), 'GAME-FEEL-HUD-002', 'legacy webpage checklist is visible')

check(surface.includes('data-device-surface="true"') && surface.includes('data-in-world-mechanic="true"') && surface.includes('role="region"'), 'GAME-FEEL-MECHANIC-001', 'in-world mechanic surface is missing')
check(!surface.includes('aria-modal="true"') && !surface.includes('modal-backdrop'), 'GAME-FEEL-MECHANIC-002', 'main mechanics must not use a blocking modal')
check(panel.includes('MechanicSurface') && panel.includes('this.#surface.render'), 'GAME-FEEL-MECHANIC-003', 'eleven mechanics are not routed through the device surface')
const mechanicClasses = [...styles.matchAll(/\.in-world-mechanic\.mechanic-([a-z-]+)\s+[^\{]+\{/g)].map((match) => match[1])
check(new Set(mechanicClasses).size === 11, 'GAME-FEEL-MECHANIC-004', 'eleven mechanisms need distinct device presentations')
check(surface.includes('class="in-world-mechanic') && !surface.includes('trial-mechanic-panel') && !surface.includes('<header>') && !surface.includes('<footer>'), 'GAME-FEEL-MECHANIC-005', 'main mechanic is still wrapped in a central webpage panel')
check(!panel.includes('提交当前结构') && !panel.includes('重置本次尝试') && !panel.includes('mechanic-reset'), 'GAME-FEEL-MECHANIC-006', 'generic form submit/reset controls remain in mainline gameplay')
check(!gameView.includes('<header class="topbar">'), 'GAME-FEEL-HUD-003', 'full-width webpage topbar remains in mainline gameplay')
check(styles.includes(".game-stage-focus[data-focus-kind='mechanic']") && styles.includes('.in-world-mechanic > .device-control-deck'), 'GAME-FEEL-MECHANIC-007', 'mechanic controls are not anchored to the scene coordinate layer')
check(panel.includes('circuit-breaker') && panel.includes('star-workspace') && panel.includes('crane-board'), 'GAME-FEEL-MECHANIC-008', 'circuit, star map and crane lack distinct world controls')

check(interaction.includes("success ? 'snap' : 'bounce'"), 'GAME-FEEL-DRAG-001', 'drag result must distinguish snap and bounce')
check(drag.includes('inventory-drag-ghost') && drag.includes('pointermove') && drag.includes('clientX') && drag.includes('clientY'), 'GAME-FEEL-DRAG-002', 'pointer-following touch drag is missing')
check(gameView.includes('return success') || gameView.includes('return result.ok'), 'GAME-FEEL-DRAG-003', 'item use must report success to drag feedback')
check(!app.includes('this.#showItemCard(newlyFoundItems[0], true)'), 'GAME-FEEL-FLOW-001', 'pickup must not open a blocking item card')
check(app.includes('character-unlock-toast') && app.includes('characterNarrativelyRevealed'), 'GAME-FEEL-FLOW-002', 'narrative character reveal must be nonblocking and gated')
check(presentations.includes("label: '受损导航设备'") && !presentations.includes("label: '七码'"), 'GAME-FEEL-IDENTITY-001', 'Qima identity leaks before formal reveal')
check(styles.includes('@media (prefers-reduced-motion: reduce)') && styles.includes(":root[data-reduced-motion='true']"), 'GAME-FEEL-A11Y-001', 'reduced-motion path is incomplete')

check(packageConfig.trialVersion === 'STARWRECK-TRIAL-0.4.0', 'GAME-FEEL-DELIVERY-001', 'trial version is not 0.4.0')
check(packageConfig.scripts['validate:game-feel'] === 'node scripts/validate-game-feel.mjs', 'GAME-FEEL-DELIVERY-002', 'game-feel validator is not registered')
check(packageConfig.scripts['test:game-feel']?.includes('tests/game-feel'), 'GAME-FEEL-DELIVERY-003', 'game-feel tests are not registered')
for (const command of [
  'validate:sources', 'validate:baseline', 'test:baseline', 'validate:characters', 'test:characters',
  'validate:character-story', 'test:character-story', 'validate:g01-pr-a', 'test:g01-pr-a',
  'validate:g01-pr-b', 'test:g01-pr-b', 'validate:g01-demo', 'test:g01-demo',
  'validate:g02-slice-01', 'test:g02-slice-01', 'validate:trial-experience', 'test:trial-experience',
  'validate:game-feel', 'test:game-feel', 'test:e2e', 'test:pwa',
]) check(workflow.includes(`npm run ${command}`), 'GAME-FEEL-CI-001', `Trial Game Feel Gate skips ${command}`)
check(workflow.includes('1366x768') && workflow.includes('1920x1080'), 'GAME-FEEL-CI-002', 'both desktop resolutions are not explicit in CI')
check(e2e.includes("trace: 'on'") && e2e.includes("video: 'on'"), 'GAME-FEEL-E2E-001', 'video and trace recording are missing')
check(
  dragProof.includes('page.mouse.down()') &&
    dragProof.includes('page.mouse.move(') &&
    dragProof.includes('page.mouse.up()') &&
    dragProof.includes('isComplete') &&
    e2e.includes('dragMechanicToken') &&
    e2e.includes('data-game-stage') &&
    e2e.includes('data-world-visual-state'),
  'GAME-FEEL-E2E-002',
  'real scene/drag/world-change behavior is not covered',
)
check(
  e2e.includes('circuit-distribution-box') &&
    e2e.includes('star-map-table') &&
    e2e.includes('crane-rescue') &&
    e2e.includes('interaction-in-world') &&
    e2e.includes('data-in-world-mechanic'),
  'GAME-FEEL-E2E-003',
  'circuit, star map and crane in-world video evidence is incomplete',
)
check(!presentations.includes('SCN-G02-03') && !gameView.includes('SCN-G02-03'), 'GAME-FEEL-SCOPE-001', 'SCN-G02-03+ gameplay is out of scope')
check(!app.includes('starwreck:trial:v3:'), 'GAME-FEEL-SAVE-001', 'legacy schema v2 compatibility must not be replaced')

if (failures.length) {
  console.error(failures.join('\n'))
  process.exit(1)
}
console.log(`GAME_FEEL_GATE_OK rules=36 scenes=${sceneIds.length} devices=${new Set(deviceIds).size} negative_contracts=${Object.keys(mutations).length}`)
