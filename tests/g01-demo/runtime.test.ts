import { describe, expect, it } from 'vitest'
import { G01 } from '../../src/content/g01'
import { GameEngine } from '../../src/game/engine'
import {
  LocalSaveRepository,
  MemorySaveRepository,
  type StorageLike,
} from '../../src/game/save'
import type { GameSession, SceneStateId } from '../../src/game/types'

const signalTargets = [
  'RUNTIME-ITM-G01-013-PRISM',
  'RUNTIME-ITM-G01-013-COIL',
  'ITM-G01-013',
  'RUNTIME-ITM-G01-013-PHASE-KEY',
]

const storageHarness = (): StorageLike => {
  const values = new Map<string, string>()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  }
}

const enterScn06 = (engine: GameEngine): void => {
  engine.updateStory((draft) => {
    draft.flags.g01_scn05_complete = true
  })
  expect(engine.enterScene('SCN-G01-06').ok).toBe(true)
}

const completeScn06 = (engine: GameEngine): void => {
  enterScn06(engine)
  expect(engine.inspect('HS-G01-0025').ok).toBe(true)
  for (const itemId of signalTargets) expect(engine.findItem(itemId).ok).toBe(true)
  expect(engine.snapshot.sceneState).toBe('S2')
  expect(engine.completePuzzle('RUNTIME-PUZ-G01-SIGNAL-ALIGNMENT').ok).toBe(true)
  expect(engine.inspect('HS-G01-0026').ok).toBe(true)
  expect(engine.inspect('HS-G01-0027').ok).toBe(true)
  expect(engine.inspect('HS-G01-0028').ok).toBe(true)
  expect(engine.inspect('RUNTIME-HS-G01-06-SAVE-OBSERVATION').ok).toBe(true)
}

const enterScn07At = (
  engine: GameEngine,
  target: Extract<SceneStateId, 'S1' | 'S2' | 'S3' | 'S4'>,
): void => {
  completeScn06(engine)
  expect(engine.enterScene('SCN-G01-07').ok).toBe(true)
  expect(engine.inspect('HS-G01-0029').ok).toBe(true)
  if (target === 'S1') return
  expect(engine.completePuzzle('RUNTIME-PUZ-G01-LANDING-TRIANGULATION').ok).toBe(true)
  if (target === 'S2') return
  expect(engine.inspect('RUNTIME-HS-G01-07-CORRIDOR-CONFIRM').ok).toBe(true)
  if (target === 'S3') return
  expect(engine.completePuzzle('RUNTIME-PUZ-G01-IMPACT-DAMPING').ok).toBe(true)
}

const preserved = (before: GameSession, after: GameSession): void => {
  expect(after.inventoryItemIds).toEqual(before.inventoryItemIds)
  expect(after.foundItemIds).toEqual(before.foundItemIds)
  expect(after.hosProgress).toEqual(before.hosProgress)
  expect(after.completedHotspotIds).toEqual(before.completedHotspotIds)
  expect(after.completedPuzzleIds).toEqual(before.completedPuzzleIds)
  expect(after.puzzleProgress).toEqual(before.puzzleProgress)
  expect(after.dialogueHistory).toEqual(before.dialogueHistory)
}

describe('G01 full demo runtime', () => {
  it('completes SCN06 HOS, signal puzzle, ordered basic ability authorization and save', () => {
    const engine = new GameEngine(G01, new MemorySaveRepository())
    completeScn06(engine)
    const snapshot = engine.snapshot

    expect(snapshot.sceneState).toBe('S6')
    expect(snapshot.hosProgress['RUNTIME-HOS-G01-06-SIGNAL-TRACE']).toEqual(
      signalTargets,
    )
    expect(snapshot.inventoryItemIds).toContain('ITM-G01-013')
    expect(snapshot.flags.g01_scn06_evidence_distress_record).toBe(true)
    expect(snapshot.flags.ability_qima_search).toBe(true)
    expect(snapshot.flags.ability_analysis).toBe(true)
    expect(snapshot.flags.ability_pathfinding).toBe(true)
    expect(snapshot.flags.ability_teleport).toBe(false)
    expect(snapshot.flags.ability_shrink).toBe(false)
    expect(snapshot.flags.ability_clone).toBe(false)
    expect(snapshot.flags.world_star_core_count).toBe(0)
  })

  it('rejects out-of-order authorization and preserves frozen abilities', () => {
    const engine = new GameEngine(G01, new MemorySaveRepository())
    enterScn06(engine)
    expect(engine.inspect('HS-G01-0025').ok).toBe(true)
    for (const itemId of signalTargets) expect(engine.findItem(itemId).ok).toBe(true)
    expect(engine.completePuzzle('RUNTIME-PUZ-G01-SIGNAL-ALIGNMENT').ok).toBe(true)

    expect(engine.inspect('HS-G01-0027').ok).toBe(false)
    const snapshot = engine.snapshot
    expect(snapshot.flags.ability_analysis).toBe(false)
    expect(snapshot.flags.ability_pathfinding).toBe(false)
    expect(snapshot.flags.world_star_core_count).toBe(0)
  })

  for (const stage of ['S1', 'S2', 'S3', 'S4'] as const) {
    it(`persists SCN07 ${stage} soft failure and resumes retained progress`, () => {
      const storage = storageHarness()
      const repository = new LocalSaveRepository('G01', storage)
      const engine = new GameEngine(G01, repository)
      enterScn07At(engine, stage)
      const before = engine.snapshot

      expect(engine.triggerPrCSoftFailure(`test-${stage}`).ok).toBe(true)
      const reloaded = new GameEngine(
        G01,
        new LocalSaveRepository('G01', storage),
      )
      expect(reloaded.snapshot.activeRuntimeNodeId).toBe(
        'SCN-G01-07:orbit-safe-node',
      )
      preserved(before, reloaded.snapshot)
      expect(reloaded.resumePrCAfterSoftFailure().ok).toBe(true)
      expect(reloaded.snapshot.safeRecovery).toBeNull()
      expect(reloaded.snapshot.sceneState).toBe(stage === 'S3' ? 'S2' : stage)
      preserved(before, reloaded.snapshot)
    })
  }

  it('writes final flags only after SCN07 S6 handoff and restores the boundary save', () => {
    const storage = storageHarness()
    const engine = new GameEngine(
      G01,
      new LocalSaveRepository('G01', storage),
    )
    enterScn07At(engine, 'S4')
    expect(engine.snapshot.flags.g01_chapter_complete).toBe(false)
    expect(engine.snapshot.flags.g01_handoff_to_g02).toBe(false)

    expect(engine.inspect('HS-G01-0030').ok).toBe(true)
    expect(engine.inspect('HS-G01-0031').ok).toBe(true)
    expect(engine.snapshot.sceneState).toBe('S6')
    expect(engine.snapshot.flags.g01_chapter_complete).toBe(false)
    expect(engine.completeG01Handoff().ok).toBe(true)

    const completed = engine.snapshot
    expect(completed.currentSceneId).toBe('G02-BOUNDARY')
    expect(completed.flags.g01_chapter_complete).toBe(true)
    expect(completed.flags.g01_handoff_to_g02).toBe(true)
    expect(completed.flags.world_star_core_count).toBe(0)

    const reloaded = new GameEngine(
      G01,
      new LocalSaveRepository('G01', storage),
    ).snapshot
    expect(reloaded.currentSceneId).toBe('G02-BOUNDARY')
    expect(reloaded.flags.g01_chapter_complete).toBe(true)
    expect(reloaded.flags.g01_handoff_to_g02).toBe(true)
    expect(reloaded.flags.world_star_core_count).toBe(0)
  })

  it('keeps the G02 boundary read-only with no gameplay definitions', () => {
    const boundary = G01.scenes?.find((scene) => scene.id === 'G02-BOUNDARY')
    expect(boundary).toBeDefined()
    expect(boundary?.items).toEqual([])
    expect(boundary?.hotspots).toEqual([])
    expect(boundary?.transitions).toEqual([])
  })
})
