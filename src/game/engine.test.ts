import { describe, expect, it } from 'vitest'
import { G01 } from '../content/g01'
import { G01_ADVENTURE } from '../content/g01-adventure'
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

    for (const itemId of ['ITM-G01-002', 'ITM-G01-003', 'ITM-G01-004', 'ITM-G01-005']) {
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
    for (const itemId of ['ITM-G01-002', 'ITM-G01-003', 'ITM-G01-004', 'ITM-G01-005']) {
      engine.findItem(itemId)
    }

    const restored = new GameEngine(G01, new LocalSaveRepository('G01', storage))
    expect(restored.snapshot.schemaVersion).toBe(2)
    expect(restored.snapshot.sceneState).toBe('S3')
    expect(restored.snapshot.foundItemIds).toContain('ITM-G01-002')
    expect(restored.snapshot.inventoryItemIds).toContain('ITM-G01-002')
    expect([...values.values()].some((value) => value.includes('"schemaVersion":2'))).toBe(true)
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

  it('unlocks Xingyu and preserves the data-driven opening dialogue order', () => {
    const engine = new GameEngine(G01_ADVENTURE, new MemorySaveRepository())

    expect(engine.beginScene().ok).toBe(true)
    expect(engine.currentDialogue?.dialogueId).toBe('DLG-G01-00-001')
    expect(engine.advanceDialogue().ok).toBe(true)
    expect(engine.snapshot.unlockedCharacterIds).toContain('xingyu')
    expect(engine.snapshot.flags.character_profile_xingyu_unlocked).toBe(true)
    expect(engine.pendingCharacterProfileId).toBe('xingyu')
    expect(engine.currentDialogue?.dialogueId).toBe('DLG-G01-00-002')
    expect(engine.acknowledgeCharacterProfile('xingyu').ok).toBe(true)
    expect(engine.advanceDialogue().ok).toBe(true)
    expect(engine.currentDialogue?.dialogueId).toBe('DLG-G01-00-003')
    expect(engine.advanceDialogue().ok).toBe(true)
    expect(engine.currentDialogue?.dialogueId).toBe('DLG-G01-00-004')
    expect(engine.advanceDialogue().ok).toBe(true)
    expect(engine.currentDialogue).toBeNull()
    expect(engine.snapshot.characterStates.xingyu).toBe('determined')
  })

  it('restores current dialogue, portrait state and profile presentation from schema v2', () => {
    const saves = new MemorySaveRepository()
    const engine = new GameEngine(G01_ADVENTURE, saves)
    engine.beginScene()
    engine.advanceDialogue()

    const restored = new GameEngine(G01_ADVENTURE, saves)
    expect(restored.snapshot.currentSceneId).toBe('SCN-G01-00')
    expect(restored.currentDialogue?.dialogueId).toBe('DLG-G01-00-002')
    expect(restored.snapshot.readDialogueIds).toEqual(['DLG-G01-00-001'])
    expect(restored.snapshot.characterStates.xingyu).toBe('alert')
    expect(restored.pendingCharacterProfileId).toBe('xingyu')
    expect(restored.snapshot.flags.world_star_core_count).toBe(0)
  })

  it('runs the conditional Qima recovery, introduction and first conversation once', () => {
    const saves = new MemorySaveRepository()
    const engine = new GameEngine(G01_ADVENTURE, saves)
    const finishStoryBeat = () => {
      let guard = 0
      while ((engine.currentDialogue || engine.pendingCharacterProfileId) && guard < 80) {
        const profileId = engine.pendingCharacterProfileId
        if (profileId) engine.acknowledgeCharacterProfile(profileId)
        else engine.advanceDialogue()
        guard += 1
      }
      expect(guard).toBeLessThan(80)
    }

    engine.beginScene()
    finishStoryBeat()
    engine.findItem('ITM-G01-001')
    finishStoryBeat()
    engine.useItem('ITM-G01-001', 'HS-G01-0002')
    finishStoryBeat()
    for (const itemId of ['ITM-G01-002', 'ITM-G01-003', 'ITM-G01-004', 'ITM-G01-005']) {
      engine.findItem(itemId)
    }
    finishStoryBeat()
    engine.useItem('ITM-G01-002', 'HS-G01-0004')
    finishStoryBeat()
    engine.inspect('HS-G01-0005')
    finishStoryBeat()
    engine.inspect('HS-G01-0006')
    expect(engine.snapshot.flags.g01_scene_00_story_complete).toBe(true)
    expect(engine.enterScene('SCN-G01-01').ok).toBe(true)
    expect(engine.snapshot.characterStates.qima).toBe('offline')
    finishStoryBeat()

    engine.inspect('HS-G01-0101')
    finishStoryBeat()
    expect(engine.snapshot.characterStates.qima).toBe('damaged')
    for (const itemId of ['ITM-G01-101', 'ITM-G01-102', 'ITM-G01-103', 'ITM-G01-104']) {
      engine.findItem(itemId)
    }
    finishStoryBeat()
    engine.useItem('ITM-G01-104', 'HS-G01-0103')
    finishStoryBeat()
    engine.useItem('ITM-G01-101', 'HS-G01-0104')
    finishStoryBeat()
    engine.useItem('ITM-G01-102', 'HS-G01-0105')
    finishStoryBeat()
    engine.useItem('ITM-G01-103', 'HS-G01-0106')
    finishStoryBeat()
    expect(engine.snapshot.characterStates.qima).toBe('booting')

    expect(engine.completePuzzle('PZL-G01-01-CIRCUIT').ok).toBe(true)
    expect(engine.currentDialogue?.dialogueId).toBe('DLG-G01-01-010')
    engine.advanceDialogue()
    expect(engine.snapshot.flags.qima_recovered).toBe(true)
    expect(engine.snapshot.flags.character_profile_qima_unlocked).toBe(true)
    expect(engine.snapshot.characterStates.qima).toBe('normal')
    expect(engine.pendingCharacterProfileId).toBe('qima')
    engine.acknowledgeCharacterProfile('qima')
    expect(engine.currentDialogue?.dialogueId).toBe('DLG-G01-01-011')
    finishStoryBeat()

    const restored = new GameEngine(G01_ADVENTURE, saves)
    expect(restored.snapshot.characterStates.qima).toBe('normal')
    expect(restored.snapshot.flags.g01_scene_01_complete).toBe(true)
    expect(restored.pendingCharacterProfileId).toBeNull()
    expect(restored.snapshot.completedDialogueSequenceIds).toContain(
      'SEQ-G01-01-FIRST-CONVERSATION',
    )
    expect(restored.snapshot.flags.world_star_core_count).toBe(0)
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
