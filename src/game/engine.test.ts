import { describe, expect, it } from 'vitest'
import { G01 } from '../content/g01'
import { GameEngine } from './engine'
import { CircuitRoutingGame } from './minigames/circuit'
import { LocalSaveRepository, MemorySaveRepository, type StorageLike } from './save'
import type { ChapterDefinition } from './types'

const chapter: ChapterDefinition = {
  id: 'G01-test',
  title: 'Test',
  sceneTitle: 'Test scene',
  protagonist: '星宇',
  initialState: 'S0',
  states: {
    S0: { id: 'S0', title: 'Intro', objective: 'Start', narrative: '', safeCheckpoint: true },
    S1: { id: 'S1', title: 'Find', objective: 'Find item', narrative: '' },
    S2: { id: 'S2', title: 'Use', objective: 'Use item', narrative: '', safeCheckpoint: true },
    S3: { id: 'S3', title: 'Puzzle', objective: 'Solve', narrative: '' },
    S4: { id: 'S4', title: 'Route', objective: 'Continue', narrative: '', safeCheckpoint: true },
    S5: { id: 'S5', title: 'Final', objective: 'Continue', narrative: '' },
    S6: { id: 'S6', title: 'Done', objective: 'Done', narrative: '', safeCheckpoint: true },
  },
  items: [{ id: 'tool', name: 'Tool', description: 'A tool' }],
  hotspots: [
    {
      id: 'tool-spot',
      kind: 'hidden-item',
      ariaLabel: 'Tool',
      area: { x: 1, y: 1, width: 1, height: 1 },
      activeStates: ['S1'],
      itemId: 'tool',
    },
    {
      id: 'panel',
      kind: 'use-target',
      ariaLabel: 'Panel',
      area: { x: 1, y: 1, width: 1, height: 1 },
      activeStates: ['S2'],
      requiredItemId: 'tool',
    },
  ],
  transitions: [
    { from: 'S0', event: 'start', to: 'S1' },
    { from: 'S1', event: 'found:all', to: 'S2' },
    { from: 'S2', event: 'use:tool:panel', to: 'S3' },
    { from: 'S3', event: 'puzzle:test', to: 'S4' },
  ],
}

describe('GameEngine', () => {
  it('moves through find, inventory and item-use states', () => {
    const engine = new GameEngine(chapter, new MemorySaveRepository())

    expect(engine.start().ok).toBe(true)
    expect(engine.snapshot.sceneState).toBe('S1')
    expect(engine.findItem('tool').ok).toBe(true)
    expect(engine.snapshot.sceneState).toBe('S2')
    expect(engine.snapshot.inventoryItemIds).toEqual(['tool'])
    expect(engine.useItem('tool', 'panel').ok).toBe(true)
    expect(engine.snapshot.sceneState).toBe('S3')
    expect(engine.snapshot.inventoryItemIds).toEqual([])
  })

  it('restores the most recent safe checkpoint', () => {
    const saves = new MemorySaveRepository()
    const engine = new GameEngine(chapter, saves)
    engine.start()
    engine.findItem('tool')
    engine.useItem('tool', 'panel')

    expect(engine.snapshot.sceneState).toBe('S3')
    expect(engine.rollbackToCheckpoint().ok).toBe(true)
    expect(engine.snapshot.sceneState).toBe('S2')
    expect(engine.snapshot.inventoryItemIds).toEqual(['tool'])
  })

  it('completes the frozen SCN-G01-00 chain without consuming a wrongly used key item', () => {
    const engine = new GameEngine(G01, new MemorySaveRepository())

    expect(engine.findItem('ITM-G01-001').ok).toBe(true)
    expect(engine.snapshot.sceneState).toBe('S1')
    expect(engine.useItem('ITM-G01-001', 'HS-G01-0002').ok).toBe(true)
    expect(engine.snapshot.inventoryItemIds).toContain('ITM-G01-001')
    expect(engine.snapshot.sceneState).toBe('S2')

    for (const itemId of [
      'ITM-G01-002',
      'ITM-G01-003',
      'RUNTIME-ITM-G01-SCN00-GLOVE',
      'RUNTIME-ITM-G01-SCN00-LABEL',
    ]) {
      expect(engine.findItem(itemId).ok).toBe(true)
    }

    expect(engine.snapshot.sceneState).toBe('S3')
    expect(engine.snapshot.inventoryItemIds).toEqual(['ITM-G01-001', 'ITM-G01-002'])
    expect(engine.useItem('ITM-G01-001', 'HS-G01-0004').ok).toBe(false)
    expect(engine.snapshot.inventoryItemIds).toContain('ITM-G01-002')
    expect(engine.useItem('ITM-G01-002', 'HS-G01-0004').ok).toBe(true)
    expect(engine.snapshot.inventoryItemIds).not.toContain('ITM-G01-002')
    expect(engine.snapshot.sceneState).toBe('S4')

    expect(engine.inspect('HS-G01-0005').ok).toBe(true)
    expect(engine.snapshot.sceneState).toBe('S5')
    expect(engine.inspect('HS-G01-0006').ok).toBe(true)
    expect(engine.snapshot.sceneState).toBe('S6')
    expect(engine.snapshot.flags.world_star_core_count).toBe(0)
  })

  it('serializes schemaVersion and restores cabinet, fuse and inventory consistently', () => {
    const values = new Map<string, string>()
    const storage: StorageLike = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    }
    const saves = new LocalSaveRepository('G01', storage)
    const engine = new GameEngine(G01, saves)

    engine.findItem('ITM-G01-001')
    engine.useItem('ITM-G01-001', 'HS-G01-0002')
    for (const itemId of [
      'ITM-G01-002',
      'ITM-G01-003',
      'RUNTIME-ITM-G01-SCN00-GLOVE',
      'RUNTIME-ITM-G01-SCN00-LABEL',
    ]) {
      engine.findItem(itemId)
    }

    const restored = new GameEngine(G01, new LocalSaveRepository('G01', storage))
    expect(restored.snapshot.schemaVersion).toBe(2)
    expect(restored.snapshot.sceneState).toBe('S3')
    expect(restored.snapshot.foundItemIds).toContain('ITM-G01-002')
    expect(restored.snapshot.inventoryItemIds).toContain('ITM-G01-002')
    expect([...values.values()].some((value) => value.includes('"schemaVersion":2'))).toBe(true)
  })

  it('completes SCN-G01-01 without skipping Qima states or consuming a wrong item', () => {
    const engine = new GameEngine(G01, new MemorySaveRepository())
    expect(engine.enterScene('SCN-G01-01').ok).toBe(true)
    expect(engine.snapshot.currentSceneId).toBe('SCN-G01-01')
    expect(engine.snapshot.characterStates['CHAR-QIMA']).toBe('offline')

    expect(engine.inspect('RUNTIME-HS-G01-01-ENTRY').ok).toBe(true)
    expect(engine.snapshot.sceneState).toBe('S1')
    expect(engine.inspect('HS-G01-0005').ok).toBe(true)
    engine.updateStory((draft) => {
      draft.characterStates['CHAR-QIMA'] = 'damaged'
    })
    expect(engine.snapshot.sceneState).toBe('S2')

    for (const itemId of [
      'ITM-G01-004',
      'ITM-G01-005',
      'ITM-G01-006',
      'RUNTIME-ITM-G01-FIXED-BUCKLE',
    ]) {
      expect(engine.findItem(itemId).ok).toBe(true)
    }
    expect(engine.snapshot.sceneState).toBe('S3')
    expect(engine.completePuzzle('PUZ-G01-CHIP-ORIENTATION').ok).toBe(true)
    expect(engine.snapshot.sceneState).toBe('S4')

    const beforeWrongUse = engine.snapshot
    expect(engine.useItem('ITM-G01-004', 'HS-G01-0007-CONTACT').ok).toBe(false)
    expect(engine.snapshot.inventoryItemIds).toContain('ITM-G01-004')
    expect(engine.snapshot.completedHotspotIds).toEqual(
      beforeWrongUse.completedHotspotIds,
    )
    expect(engine.snapshot.sceneState).toBe('S4')

    expect(engine.useItem('ITM-G01-005', 'HS-G01-0007-CONTACT').ok).toBe(true)
    expect(engine.useItem('ITM-G01-006', 'HS-G01-0007-FUSE').ok).toBe(true)
    expect(engine.useItem('ITM-G01-004', 'HS-G01-0008').ok).toBe(true)
    expect(
      engine.useItem(
        'RUNTIME-ITM-G01-FIXED-BUCKLE',
        'RUNTIME-HS-G01-0008-BUCKLE',
      ).ok,
    ).toBe(true)
    expect(engine.snapshot.sceneState).toBe('S5')

    engine.updateStory((draft) => {
      draft.characterStates['CHAR-QIMA'] = 'booting'
    })
    expect(engine.completePuzzle('PUZ-G01-QIMA-BOOT').ok).toBe(true)
    engine.updateStory((draft) => {
      draft.characterStates['CHAR-QIMA'] = 'normal'
    })
    expect(engine.snapshot.sceneState).toBe('S6')
    expect(engine.snapshot.characterStates['CHAR-QIMA']).toBe('normal')
    expect(engine.snapshot.flags.world_star_core_count).toBe(0)
  })

  it('forces a non-zero star-core count from an older G01 save back to zero', () => {
    const values = new Map<string, string>()
    const storage: StorageLike = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    }
    const saveKey = 'starwreck:save:G01:v1'
    values.set(
      saveKey,
      JSON.stringify({
        version: 1,
        chapterId: 'G01',
        sceneState: 'S3',
        foundItemIds: ['ITM-G01-001', 'ITM-G01-002'],
        inventoryItemIds: ['ITM-G01-001', 'ITM-G01-002'],
        flags: { world_star_core_count: 12, legacy_marker: 'kept' },
        updatedAt: '2026-07-24T00:00:00.000Z',
      }),
    )

    const restored = new LocalSaveRepository('G01', storage).load()
    expect(restored?.flags.world_star_core_count).toBe(0)
    expect(restored?.flags.legacy_marker).toBe('kept')
  })
})

describe('CircuitRoutingGame', () => {
  it('solves only when nodes are selected in order', () => {
    const circuit = new CircuitRoutingGame(['a', 'c', 'b'])
    circuit.start()
    expect(circuit.act('a').progress).toBe(1)
    expect(circuit.act('b').mistakes).toBe(1)
    expect(circuit.act('a').progress).toBe(1)
    expect(circuit.act('c').progress).toBe(2)
    expect(circuit.act('b').status).toBe('solved')
  })
})
