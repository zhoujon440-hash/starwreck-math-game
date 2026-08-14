import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { G01 } from '../../src/content/g01'
import {
  assertScenePresentationCoverage,
  SCENE_PRESENTATIONS,
  sceneWorldVisualState,
} from '../../src/data/trial/scenePresentation'
import { GameEngine } from '../../src/game/engine'
import { MemorySaveRepository } from '../../src/game/save'
import { GameStage } from '../../src/game-scene/GameStage'
import { SceneCamera } from '../../src/game-scene/SceneCamera'
import { MechanicSurface } from '../../src/game-scene/mechanics/MechanicSurface'

describe('Trial Game Feel runtime', () => {
  it('maps all eleven playable scenes to unique in-world devices and visual outcomes', () => {
    expect(assertScenePresentationCoverage()).toBe(true)
    expect(SCENE_PRESENTATIONS).toHaveLength(11)
    expect(new Set(SCENE_PRESENTATIONS.map((entry) => entry.sceneId)).size).toBe(11)
    expect(new Set(SCENE_PRESENTATIONS.map((entry) => entry.device.id)).size).toBe(11)
    expect(new Set(SCENE_PRESENTATIONS.map((entry) => entry.world.effect)).size).toBe(11)
    for (const entry of SCENE_PRESENTATIONS) {
      expect(entry.coordinateSpace).toBe('percent-16:9')
      expect(entry.device.area.x).toBeGreaterThanOrEqual(0)
      expect(entry.device.area.y).toBeGreaterThanOrEqual(0)
      expect(entry.device.area.x + entry.device.area.width).toBeLessThanOrEqual(100)
      expect(entry.device.area.y + entry.device.area.height).toBeLessThanOrEqual(100)
      expect(entry.device.focus.scale).toBeGreaterThan(1)
      expect(entry.world.initial).not.toBe(entry.world.complete)
    }
  })

  it('moves the scene camera through focus, mechanic, success and back to the scene', () => {
    const camera = new SceneCamera()
    expect(camera.mode).toBe('scene')
    camera.focusOn('navigation-cradle', { x: 72, y: 48, scale: 1.72 })
    expect(camera.mode).toBe('focus')
    expect(camera.style()).toContain('--camera-scale:1.72')
    camera.showMechanic()
    expect(camera.mode).toBe('mechanic')
    camera.showSuccess()
    expect(camera.mode).toBe('success')
    camera.returnToScene()
    expect(camera.mode).toBe('scene')
    expect(camera.targetId).toBeNull()
  })

  it('derives initial, partial and complete world states from the persisted session', () => {
    const engine = new GameEngine(G01, new MemorySaveRepository())
    const entry = SCENE_PRESENTATIONS[0]
    expect(sceneWorldVisualState(engine.snapshot, entry)).toBe('initial')
    engine.updateStory((draft) => {
      draft.sceneState = 'S2'
      draft.sceneStates[entry.sceneId] = 'S2'
    })
    expect(sceneWorldVisualState(engine.snapshot, entry)).toBe('partial')
    engine.updateStory((draft) => {
      draft.sceneState = 'S6'
      draft.sceneStates[entry.sceneId] = 'S6'
      draft.completedSceneIds.push(entry.sceneId)
    })
    expect(sceneWorldVisualState(engine.snapshot, entry)).toBe('complete')
  })

  it('renders the device as a scene object with a direct mechanic entry and world FX', () => {
    const engine = new GameEngine(G01, new MemorySaveRepository())
    const entry = SCENE_PRESENTATIONS[0]
    const html = new GameStage().runtimeLayer(
      engine.snapshot,
      entry,
      'initial',
      new SceneCamera(),
      true,
      'RUNTIME-PUZ-G01-ROTATING-CIRCUIT',
    )
    expect(html).toContain('data-scene-object="distribution-box"')
    expect(html).toContain('data-action="open-stage-mechanic"')
    expect(html).toContain('data-stage-layer="fx"')
    expect(html).toContain('data-world-visual-state="initial"')
  })

  it('renders mechanism controls as an in-device region, not a blocking modal', () => {
    const html = new MechanicSurface().render({
      title: '设备校准', subtitle: '配电箱', mechanicType: 'rotating-circuit', mechanicId: 'MECH',
      status: 'partial', instruction: '转动接点', interaction: '<button>接点</button>',
      statusMarkup: '<p>一路接通</p>',
    })
    expect(html).toContain('data-device-surface="true"')
    expect(html).toContain('data-in-world-mechanic="true"')
    expect(html).not.toContain('trial-mechanic-panel')
    expect(html).toContain('role="region"')
    expect(html).not.toContain('aria-modal')
    expect(html).not.toContain('modal-backdrop')
  })

  it('keeps lightweight HUD, pointer-follow drag and reduced-motion contracts in production code', () => {
    const hud = readFileSync('src/game-scene/SceneHud.ts', 'utf8')
    const drag = readFileSync('src/game/drag.ts', 'utf8')
    const interaction = readFileSync('src/game-scene/InteractionController.ts', 'utf8')
    const styles = readFileSync('src/styles.css', 'utf8')
    expect(hud).toContain('scene-hud')
    expect(hud).toContain('chapterLabel')
    expect(drag).toContain('inventory-drag-ghost')
    expect(drag).toContain('pointermove')
    expect(interaction).toContain("success ? 'snap' : 'bounce'")
    expect(styles).toContain('@media (prefers-reduced-motion: reduce)')
    expect(styles).toContain('.legacy-objective-card { display: none !important; }')
  })
})
