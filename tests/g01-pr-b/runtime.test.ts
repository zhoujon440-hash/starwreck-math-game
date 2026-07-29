import { describe, expect, it } from 'vitest'
import { G01 } from '../../src/content/g01'
import { GameEngine } from '../../src/game/engine'
import { LocalSaveRepository, MemorySaveRepository, type StorageLike } from '../../src/game/save'
import type { GameSession, SceneStateId } from '../../src/game/types'

const scn04Items = [
  'RUNTIME-ITM-G01-010-A',
  'RUNTIME-ITM-G01-010-B',
  'RUNTIME-ITM-G01-010-C',
  'ITM-G01-011',
]

const findAll = (engine: GameEngine, ids: string[]) => {
  for (const id of ids) expect(engine.findItem(id).ok).toBe(true)
}

const storageHarness = (): StorageLike => {
  const values = new Map<string, string>()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  }
}

const preserved = (before: GameSession, after: GameSession) => {
  expect(after.foundItemIds).toEqual(before.foundItemIds)
  expect(after.inventoryItemIds).toEqual(before.inventoryItemIds)
  expect(after.usedItemIds).toEqual(before.usedItemIds)
  expect(after.hosProgress).toEqual(before.hosProgress)
  expect(after.completedHotspotIds).toEqual(before.completedHotspotIds)
  expect(after.completedPuzzleIds).toEqual(before.completedPuzzleIds)
  expect(after.puzzleProgress).toEqual(before.puzzleProgress)
  expect(after.dialogueHistory).toEqual(before.dialogueHistory)
}

const advanceScn04 = (engine: GameEngine, target: Extract<SceneStateId, 'S1' | 'S2' | 'S3' | 'S4'>) => {
  expect(engine.enterScene('SCN-G01-04').ok).toBe(true)
  expect(engine.inspect('HS-G01-0017').ok).toBe(true)
  if (target === 'S1') return
  findAll(engine, scn04Items)
  if (target === 'S2') return
  expect(engine.useItem(scn04Items[0], 'HS-G01-0018-A').ok).toBe(true)
  expect(engine.useItem(scn04Items[1], 'HS-G01-0018-B').ok).toBe(true)
  expect(engine.useItem(scn04Items[2], 'HS-G01-0018-C').ok).toBe(true)
  if (target === 'S3') return
  expect(engine.completePuzzle('TUT-MECH-002').ok).toBe(true)
}

const advanceScn05 = (engine: GameEngine, target: Extract<SceneStateId, 'S1' | 'S2' | 'S3' | 'S4'>) => {
  expect(engine.enterScene('SCN-G01-05').ok).toBe(true)
  expect(engine.inspect('HS-G01-0021').ok).toBe(true)
  if (target === 'S1') return
  expect(engine.inspect('HS-G01-0022').ok).toBe(true)
  if (target === 'S2') return
  expect(engine.findItem('ITM-G01-012').ok).toBe(true)
  if (target === 'S3') return
  expect(engine.useItem('ITM-G01-012', 'HS-G01-0023').ok).toBe(true)
}

describe('G01 PR-B runtime', () => {
  it('completes the star-map HOS, puzzle, evidence analysis and coordinate lock', () => {
    const engine = new GameEngine(G01, new MemorySaveRepository())
    advanceScn04(engine, 'S2')
    const beforeWrong = engine.snapshot
    expect(engine.useItem('ITM-G01-011', 'HS-G01-0018-A').ok).toBe(false)
    expect(engine.snapshot.inventoryItemIds).toContain('ITM-G01-011')
    expect(engine.snapshot.completedHotspotIds).toEqual(beforeWrong.completedHotspotIds)
    expect(engine.useItem(scn04Items[0], 'HS-G01-0018-A').ok).toBe(true)
    expect(engine.useItem(scn04Items[1], 'HS-G01-0018-B').ok).toBe(true)
    expect(engine.useItem(scn04Items[2], 'HS-G01-0018-C').ok).toBe(true)
    expect(engine.snapshot.sceneState).toBe('S3')
    expect(engine.completePuzzle('TUT-MECH-002').ok).toBe(true)
    expect(engine.snapshot.flags.g01_scn04_evidence_anomaly).not.toBe(true)
    expect(engine.inspect('HS-G01-0019').ok).toBe(true)
    expect(engine.snapshot.flags.g01_scn04_evidence_anomaly).toBe(true)
    expect(engine.useItem('ITM-G01-011', 'HS-G01-0020').ok).toBe(true)
    expect(engine.snapshot.sceneState).toBe('S6')
  })

  it('completes the ordered route with idempotent bypass acquisition', () => {
    const engine = new GameEngine(G01, new MemorySaveRepository())
    advanceScn05(engine, 'S3')
    expect(engine.findItem('ITM-G01-012').ok).toBe(false)
    engine.updateStory((draft) => draft.inventoryItemIds.push('ITM-G01-001'))
    const beforeWrong = engine.snapshot
    expect(engine.useItem('ITM-G01-001', 'HS-G01-0023').ok).toBe(false)
    expect(engine.snapshot.inventoryItemIds).toContain('ITM-G01-001')
    expect(engine.snapshot.completedHotspotIds).toEqual(beforeWrong.completedHotspotIds)
    expect(engine.useItem('ITM-G01-012', 'HS-G01-0023').ok).toBe(true)
    expect(engine.inspect('HS-G01-0024').ok).toBe(true)
    expect(engine.inspect('RUNTIME-HS-G01-05-LANDING-CONFIRM').ok).toBe(true)
    expect(engine.snapshot.sceneState).toBe('S6')
    expect(engine.snapshot.flags.g01_route_complete).toBe(true)
  })

  it.each([
    ['SCN-G01-04', 'S1'], ['SCN-G01-04', 'S2'], ['SCN-G01-04', 'S3'], ['SCN-G01-04', 'S4'],
    ['SCN-G01-05', 'S1'], ['SCN-G01-05', 'S2'], ['SCN-G01-05', 'S3'], ['SCN-G01-05', 'S4'],
  ] as const)('persists %s %s soft failure and resumes exact progress', (sceneId, stage) => {
    const storage = storageHarness()
    const engine = new GameEngine(G01, new LocalSaveRepository('G01', storage))
    if (sceneId === 'SCN-G01-04') advanceScn04(engine, stage)
    else advanceScn05(engine, stage)
    const before = engine.snapshot
    expect(engine.triggerPrBSoftFailure(`matrix-${sceneId}-${stage}`).ok).toBe(true)
    const failed = engine.snapshot
    expect(failed.safeRecovery?.preFailureState).toBe(stage)
    preserved(before, failed)
    const restored = new GameEngine(G01, new LocalSaveRepository('G01', storage))
    expect(restored.snapshot.activeRuntimeNodeId).toBe(failed.safeRecovery?.nodeId)
    preserved(before, restored.snapshot)
    expect(restored.resumePrBAfterSoftFailure().ok).toBe(true)
    expect(restored.snapshot.sceneState).toBe(stage)
    preserved(before, restored.snapshot)
    expect(restored.snapshot.flags.world_star_core_count).toBe(0)
    expect(restored.snapshot.flags.g01_chapter_complete).toBe(false)
    expect(restored.snapshot.flags.g01_handoff_to_g02).toBe(false)
  })

  it('keeps all six permanent abilities locked even after hostile save restoration', () => {
    const storage = storageHarness()
    const engine = new GameEngine(G01, new LocalSaveRepository('G01', storage))
    engine.updateStory((draft) => {
      for (const key of ['ability_qima_search', 'ability_analysis', 'ability_pathfinding', 'ability_teleport', 'ability_shrink', 'ability_clone']) draft.flags[key] = true
    })
    const snapshot = engine.snapshot
    for (const key of ['ability_qima_search', 'ability_analysis', 'ability_pathfinding', 'ability_teleport', 'ability_shrink', 'ability_clone']) expect(snapshot.flags[key]).toBe(false)
  })
})
