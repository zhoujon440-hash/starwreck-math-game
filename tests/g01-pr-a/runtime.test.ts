import { describe, expect, it } from 'vitest'
import { G01 } from '../../src/content/g01'
import { GameEngine } from '../../src/game/engine'
import type { GameSession, SceneStateId } from '../../src/game/types'
import {
  LocalSaveRepository,
  MemorySaveRepository,
  type StorageLike,
} from '../../src/game/save'

const cargoItems = [
  'ITM-G01-007',
  'ITM-G01-008',
  'ITM-G01-009',
  'RUNTIME-ITM-G01-REPRESS-KEY',
]

const findAll = (engine: GameEngine, ids: string[]) => {
  for (const id of ids) expect(engine.findItem(id).ok).toBe(true)
}

const storageHarness = (): {
  storage: StorageLike
  values: Map<string, string>
} => {
  const values = new Map<string, string>()
  return {
    values,
    storage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    },
  }
}

const advanceCargoTo = (
  engine: GameEngine,
  target: Extract<SceneStateId, 'S1' | 'S2' | 'S3' | 'S4'>,
): void => {
  expect(engine.enterScene('SCN-G01-03').ok).toBe(true)
  expect(engine.snapshot.flags.g01_scn03_evidence_leak_confirmed).not.toBe(true)
  expect(engine.snapshot.flags.g01_scn03_evidence_pressure_reading).not.toBe(true)
  expect(engine.inspect('HS-G01-0013').ok).toBe(true)
  expect(engine.snapshot.flags.g01_scn03_evidence_leak_confirmed).toBe(true)
  expect(engine.snapshot.flags.g01_scn03_evidence_pressure_reading).not.toBe(true)
  if (target === 'S1') return

  findAll(engine, cargoItems)
  expect(engine.snapshot.sceneState).toBe('S2')
  if (target === 'S2') return

  expect(engine.useItem('ITM-G01-009', 'HS-G01-0014').ok).toBe(true)
  expect(engine.snapshot.inventoryItemIds).toContain('ITM-G01-009')
  expect(engine.snapshot.flags.g01_scn03_evidence_pressure_reading).not.toBe(true)
  if (target === 'S3') return

  expect(
    engine.completePuzzle('RUNTIME-PUZ-G01-PRESSURE-CALIBRATION').ok,
  ).toBe(true)
  expect(engine.snapshot.flags.g01_scn03_evidence_pressure_reading).toBe(true)
  expect(engine.snapshot.puzzleProgress.pressure_reading).toBe('safe-window-90s')
  expect(engine.useItem('ITM-G01-008', 'HS-G01-0015-PATCH').ok).toBe(true)
  expect(engine.snapshot.sceneState).toBe('S4')
}

const expectPreservedProgress = (
  before: GameSession,
  after: GameSession,
): void => {
  expect(after.foundItemIds).toEqual(before.foundItemIds)
  expect(after.inventoryItemIds).toEqual(before.inventoryItemIds)
  expect(after.usedItemIds).toEqual(before.usedItemIds)
  expect(after.hosProgress).toEqual(before.hosProgress)
  expect(after.completedHotspotIds).toEqual(before.completedHotspotIds)
  expect(after.completedPuzzleIds).toEqual(before.completedPuzzleIds)
  expect(after.puzzleProgress).toEqual(before.puzzleProgress)
  expect(after.dialogueHistory).toEqual(before.dialogueHistory)
  expect(after.characterDiscoveries).toEqual(before.characterDiscoveries)
  expect(after.flags.g01_scn03_evidence_leak_confirmed).toBe(
    before.flags.g01_scn03_evidence_leak_confirmed,
  )
  expect(after.flags.g01_scn03_evidence_pressure_reading).toBe(
    before.flags.g01_scn03_evidence_pressure_reading,
  )
}

describe('G01 PR-A runtime', () => {
  it('completes SCN-G01-02 with wrong-use non-consumption and an explicit runtime cargo entry', () => {
    const engine = new GameEngine(G01, new MemorySaveRepository())
    expect(engine.enterScene('SCN-G01-02').ok).toBe(true)
    expect(engine.inspect('HS-G01-0009').ok).toBe(true)
    findAll(engine, [
      'RUNTIME-ITM-G01-MAINTENANCE-SHEET',
      'RUNTIME-ITM-G01-STAR-MAP-KEY',
    ])
    expect(engine.snapshot.sceneState).toBe('S2')
    expect(engine.inspect('HS-G01-0010').ok).toBe(true)
    expect(
      engine.completePuzzle('RUNTIME-PUZ-G01-TASK-DEPENDENCY').ok,
    ).toBe(true)

    const beforeWrong = engine.snapshot
    expect(
      engine.useItem(
        'RUNTIME-ITM-G01-MAINTENANCE-SHEET',
        'RUNTIME-HS-G01-02-MAP-KEY',
      ).ok,
    ).toBe(false)
    expect(engine.snapshot.inventoryItemIds).toContain(
      'RUNTIME-ITM-G01-MAINTENANCE-SHEET',
    )
    expect(engine.snapshot.completedHotspotIds).toEqual(
      beforeWrong.completedHotspotIds,
    )

    expect(
      engine.useItem(
        'RUNTIME-ITM-G01-STAR-MAP-KEY',
        'RUNTIME-HS-G01-02-MAP-KEY',
      ).ok,
    ).toBe(true)
    expect(
      engine.useItem(
        'RUNTIME-ITM-G01-MAINTENANCE-SHEET',
        'HS-G01-0011',
      ).ok,
    ).toBe(true)
    expect(engine.snapshot.sceneState).toBe('S6')
    expect(
      engine.activeHotspots().some((hotspot) => hotspot.id === 'HS-G01-0012'),
    ).toBe(false)
    expect(
      engine
        .activeHotspots()
        .some(
          (hotspot) => hotspot.id === 'RUNTIME-HS-G01-02-CARGO-ENTRY',
        ),
    ).toBe(true)
    expect(engine.snapshot.flags.world_star_core_count).toBe(0)
    expect(engine.snapshot.flags.g01_chapter_complete).toBe(false)
    expect(engine.snapshot.flags.g01_handoff_to_g02).toBe(false)
  })

  it.each(['S1', 'S2', 'S3', 'S4'] as const)(
    'persists the real safety node and restores exact %s progress without inventing evidence',
    (stage) => {
      const { storage } = storageHarness()
      const engine = new GameEngine(
        G01,
        new LocalSaveRepository('G01', storage),
      )
      advanceCargoTo(engine, stage)
      const beforeFailure = engine.snapshot

      expect(engine.triggerCargoSoftFailure(`matrix-${stage}`).ok).toBe(true)
      const atSafetyNode = engine.snapshot
      expect(atSafetyNode.activeRuntimeNodeId).toBe(
        'SCN-G01-03:cargo-safety-door',
      )
      expect(atSafetyNode.safeRecovery).toMatchObject({
        nodeId: 'SCN-G01-03:cargo-safety-door',
        sceneId: 'SCN-G01-03',
        preFailureState: stage,
        reason: `matrix-${stage}`,
      })
      expect(atSafetyNode.flags.g01_scn03_safe_recovery_active).toBe(true)
      expect(engine.activeHotspots()).toEqual([])
      expectPreservedProgress(beforeFailure, atSafetyNode)

      const shouldHavePressureEvidence = stage === 'S4'
      expect(atSafetyNode.flags.g01_scn03_evidence_leak_confirmed).toBe(true)
      expect(
        atSafetyNode.flags.g01_scn03_evidence_pressure_reading === true,
      ).toBe(shouldHavePressureEvidence)

      const restored = new GameEngine(
        G01,
        new LocalSaveRepository('G01', storage),
      )
      expect(restored.snapshot.activeRuntimeNodeId).toBe(
        'SCN-G01-03:cargo-safety-door',
      )
      expect(restored.snapshot.safeRecovery?.preFailureState).toBe(stage)
      expectPreservedProgress(beforeFailure, restored.snapshot)

      expect(restored.resumeCargoAfterSoftFailure().ok).toBe(true)
      const resumed = restored.snapshot
      expect(resumed.activeRuntimeNodeId).toBeNull()
      expect(resumed.safeRecovery).toBeNull()
      expect(resumed.sceneState).toBe(stage)
      expect(resumed.sceneStates['SCN-G01-03']).toBe(stage)
      expectPreservedProgress(beforeFailure, resumed)

      for (const itemId of beforeFailure.foundItemIds) {
        expect(restored.findItem(itemId).ok).toBe(false)
      }
      expect(new Set(resumed.foundItemIds).size).toBe(resumed.foundItemIds.length)
      expect(new Set(resumed.inventoryItemIds).size).toBe(
        resumed.inventoryItemIds.length,
      )
      expect(resumed.flags.world_star_core_count).toBe(0)
      expect(resumed.flags.g01_chapter_complete).toBe(false)
      expect(resumed.flags.g01_handoff_to_g02).toBe(false)
    },
  )

  it('migrates a legacy overlay save into the persisted safety node and removes impossible evidence', () => {
    const { storage, values } = storageHarness()
    const engine = new GameEngine(
      G01,
      new LocalSaveRepository('G01', storage),
    )
    advanceCargoTo(engine, 'S2')
    const legacy = engine.snapshot
    legacy.activeRuntimeNodeId = null
    legacy.safeRecovery = null
    legacy.flags.g01_scn03_safe_recovery_active = true
    legacy.flags.g01_scn03_evidence_pressure_reading = true
    legacy.puzzleProgress.pressure_reading = 'impossible-legacy-evidence'
    values.set('starwreck:save:G01:v1', JSON.stringify(legacy))

    const migrated = new GameEngine(
      G01,
      new LocalSaveRepository('G01', storage),
    )
    expect(migrated.snapshot.activeRuntimeNodeId).toBe(
      'SCN-G01-03:cargo-safety-door',
    )
    expect(migrated.snapshot.safeRecovery?.preFailureState).toBe('S2')
    expect(migrated.snapshot.flags.g01_scn03_evidence_pressure_reading).toBe(
      false,
    )
    expect(migrated.snapshot.puzzleProgress.pressure_reading).toBeUndefined()
  })
})
