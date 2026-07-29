import { describe, expect, it } from 'vitest'
import { G01 } from '../../src/content/g01'
import { GameEngine } from '../../src/game/engine'
import {
  LocalSaveRepository,
  MemorySaveRepository,
  type StorageLike,
} from '../../src/game/save'

const findAll = (engine: GameEngine, ids: string[]) => {
  for (const id of ids) expect(engine.findItem(id).ok).toBe(true)
}

describe('G01 PR-A runtime', () => {
  it('completes SCN-G01-02 with wrong-use non-consumption and no chapter handoff', () => {
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
    expect(engine.snapshot.flags.world_star_core_count).toBe(0)
    expect(engine.snapshot.flags.g01_chapter_complete).toBe(false)
    expect(engine.snapshot.flags.g01_handoff_to_g02).toBe(false)
  })

  it('preserves items, evidence and correct repair progress across cargo soft failure', () => {
    const engine = new GameEngine(G01, new MemorySaveRepository())
    expect(engine.enterScene('SCN-G01-03').ok).toBe(true)
    expect(engine.inspect('HS-G01-0013').ok).toBe(true)
    findAll(engine, [
      'ITM-G01-007',
      'ITM-G01-008',
      'ITM-G01-009',
      'RUNTIME-ITM-G01-REPRESS-KEY',
    ])
    expect(engine.snapshot.sceneState).toBe('S2')

    const beforeWrong = engine.snapshot
    expect(engine.useItem('ITM-G01-007', 'HS-G01-0014').ok).toBe(false)
    expect(engine.snapshot.inventoryItemIds).toContain('ITM-G01-007')
    expect(engine.snapshot.completedHotspotIds).toEqual(
      beforeWrong.completedHotspotIds,
    )

    expect(engine.useItem('ITM-G01-009', 'HS-G01-0014').ok).toBe(true)
    expect(engine.snapshot.inventoryItemIds).toContain('ITM-G01-009')
    expect(
      engine.completePuzzle('RUNTIME-PUZ-G01-PRESSURE-CALIBRATION').ok,
    ).toBe(true)
    expect(engine.useItem('ITM-G01-007', 'HS-G01-0015-PATCH').ok).toBe(false)
    expect(engine.useItem('ITM-G01-008', 'HS-G01-0015-PATCH').ok).toBe(true)

    engine.updateStory((draft) => {
      draft.flags.g01_scn03_evidence_leak_confirmed = true
      draft.flags.g01_scn03_evidence_pressure_reading = true
      draft.puzzleProgress.pressure_reading = 'safe-window-90s'
    })
    const beforeFailure = engine.snapshot
    expect(engine.triggerCargoSoftFailure('test-critical-pressure').ok).toBe(true)
    const failed = engine.snapshot
    expect(failed.sceneState).toBe('S4')
    expect(failed.inventoryItemIds).toEqual(beforeFailure.inventoryItemIds)
    expect(failed.foundItemIds).toEqual(beforeFailure.foundItemIds)
    expect(failed.completedHotspotIds).toEqual(beforeFailure.completedHotspotIds)
    expect(failed.completedPuzzleIds).toEqual(beforeFailure.completedPuzzleIds)
    expect(failed.flags.g01_scn03_evidence_leak_confirmed).toBe(true)
    expect(failed.flags.g01_scn03_evidence_pressure_reading).toBe(true)
    expect(failed.flags.g01_scn03_safe_recovery_active).toBe(true)
    expect(failed.completedHotspotIds).toContain('HS-G01-0015-PATCH')

    expect(engine.resumeCargoAfterSoftFailure().ok).toBe(true)
    expect(engine.useItem('ITM-G01-007', 'HS-G01-0015-TAPE').ok).toBe(true)
    expect(
      engine.useItem('RUNTIME-ITM-G01-REPRESS-KEY', 'HS-G01-0016').ok,
    ).toBe(true)
    expect(engine.snapshot.sceneState).toBe('S6')
    expect(engine.snapshot.flags.world_star_core_count).toBe(0)
    expect(engine.snapshot.flags.g01_chapter_complete).toBe(false)
    expect(engine.snapshot.flags.g01_handoff_to_g02).toBe(false)
  })

  it('restores HOS disappearance, inventory and soft-failure state after reload', () => {
    const values = new Map<string, string>()
    const storage: StorageLike = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    }
    const engine = new GameEngine(
      G01,
      new LocalSaveRepository('G01', storage),
    )
    engine.enterScene('SCN-G01-03')
    engine.inspect('HS-G01-0013')
    findAll(engine, [
      'ITM-G01-007',
      'ITM-G01-008',
      'ITM-G01-009',
      'RUNTIME-ITM-G01-REPRESS-KEY',
    ])
    engine.useItem('ITM-G01-009', 'HS-G01-0014')
    engine.completePuzzle('RUNTIME-PUZ-G01-PRESSURE-CALIBRATION')
    engine.useItem('ITM-G01-008', 'HS-G01-0015-PATCH')
    engine.updateStory((draft) => {
      draft.flags.g01_scn03_evidence_leak_confirmed = true
      draft.flags.g01_scn03_evidence_pressure_reading = true
    })
    engine.triggerCargoSoftFailure('reload-check')

    const restored = new GameEngine(
      G01,
      new LocalSaveRepository('G01', storage),
    )
    expect(restored.snapshot.currentSceneId).toBe('SCN-G01-03')
    expect(restored.snapshot.sceneState).toBe('S4')
    expect(restored.snapshot.hosProgress['HOS-G01-003']).toHaveLength(4)
    expect(restored.snapshot.foundItemIds).toContain('ITM-G01-008')
    expect(restored.snapshot.inventoryItemIds).not.toContain('ITM-G01-008')
    expect(restored.snapshot.completedHotspotIds).toContain('HS-G01-0015-PATCH')
    expect(restored.snapshot.flags.g01_scn03_safe_recovery_active).toBe(true)
    expect(restored.snapshot.flags.g01_scn03_evidence_pressure_reading).toBe(true)
    expect(restored.findItem('ITM-G01-007').ok).toBe(false)
    expect(restored.snapshot.flags.world_star_core_count).toBe(0)
  })
})
