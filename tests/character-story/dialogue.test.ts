import { describe, expect, it } from 'vitest'
import { G01_DIALOGUE } from '../../src/data/dialogue/g01'
import { GameEngine } from '../../src/game/engine'
import { MemorySaveRepository } from '../../src/game/save'
import { G01 } from '../../src/content/g01'
import { DialogueDataLoader } from '../../src/services/DialogueDataLoader'
import { DialogueRunner } from '../../src/services/DialogueRunner'

describe('dialogue data and runner', () => {
  it('keeps formal dialogue sequence in source order', () => {
    expect(G01_DIALOGUE.map((node) => node.dialogue_id)).toEqual([
      'DLG-G01-0001',
      'DLG-G01-0002',
      'DLG-G01-0003',
      'DLG-G01-0004',
      'DLG-G01-0005',
      'DLG-G01-0006',
      'DLG-G01-0007',
      'DLG-G01-0008',
      'DLG-G01-0009',
      'DLG-G01-0010',
      'DLG-G01-0011',
    ])
  })

  it('resolves every character speaker and portrait state', () => {
    expect(() => new DialogueDataLoader(G01_DIALOGUE)).not.toThrow()
  })

  it('keeps every next dialogue reference valid', () => {
    const loader = new DialogueDataLoader(G01_DIALOGUE)
    for (const node of G01_DIALOGUE) {
      if (node.next_dialogue_id) {
        expect(loader.get(node.next_dialogue_id).dialogue_id).toBe(
          node.next_dialogue_id,
        )
      }
    }
  })

  it('records dialogue history exactly once', () => {
    const engine = new GameEngine(G01, new MemorySaveRepository())
    const runner = new DialogueRunner(new DialogueDataLoader(G01_DIALOGUE), engine)
    runner.start('DLG-G01-0001')
    runner.advance()
    runner.start('DLG-G01-0001')
    expect(engine.snapshot.dialogueHistory.map((entry) => entry.dialogueId)).toEqual([
      'DLG-G01-0001',
      'DLG-G01-0002',
    ])
  })

  it('restores an active dialogue node from the save-backed session', () => {
    const saves = new MemorySaveRepository()
    const first = new GameEngine(G01, saves)
    const firstRunner = new DialogueRunner(
      new DialogueDataLoader(G01_DIALOGUE),
      first,
    )
    firstRunner.start('DLG-G01-0001')

    const restored = new GameEngine(G01, saves)
    const restoredRunner = new DialogueRunner(
      new DialogueDataLoader(G01_DIALOGUE),
      restored,
    )
    expect(restoredRunner.current?.dialogue_id).toBe('DLG-G01-0001')
    expect(restored.snapshot.dialogue.active).toBe(true)
  })

  it('writes dialogue variables without changing G01 star-core count', () => {
    const engine = new GameEngine(G01, new MemorySaveRepository())
    const runner = new DialogueRunner(new DialogueDataLoader(G01_DIALOGUE), engine)
    runner.start('DLG-G01-0002')
    expect(engine.snapshot.flags.g01_qima_online).toBe(false)
    expect(engine.snapshot.flags.world_star_core_count).toBe(0)
  })

  it('unlocks the speaker profile on first formal dialogue', () => {
    const engine = new GameEngine(G01, new MemorySaveRepository())
    const runner = new DialogueRunner(new DialogueDataLoader(G01_DIALOGUE), engine)
    runner.start('DLG-G01-0001')
    expect(engine.snapshot.unlockedCharacterIds).toEqual(['CHAR-XINGYU'])
  })

  it('does not unlock Qima before the SCN-G01-01 recovery dialogue', () => {
    const engine = new GameEngine(G01, new MemorySaveRepository())
    const runner = new DialogueRunner(new DialogueDataLoader(G01_DIALOGUE), engine)
    runner.start('DLG-G01-0001')
    runner.advance()
    expect(engine.snapshot.unlockedCharacterIds).not.toContain('CHAR-QIMA')
  })
})
