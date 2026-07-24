import { describe, expect, it } from 'vitest'
import { GameEngine } from './engine'
import { CircuitRoutingGame } from './minigames/circuit'
import { MemorySaveRepository } from './save'
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

