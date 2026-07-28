import { describe, expect, it } from 'vitest'
import { CHARACTERS, CharacterDataStore } from '../../src/data/characters'

describe('character data', () => {
  it('loads all five approved Xingyu portrait states', () => {
    expect(CHARACTERS['CHAR-XINGYU'].available_states).toEqual([
      'normal',
      'alert',
      'thinking',
      'nervous',
      'determined',
    ])
  })

  it('loads all nine approved Qima portrait states', () => {
    expect(CHARACTERS['CHAR-QIMA'].available_states).toHaveLength(9)
    expect(CHARACTERS['CHAR-QIMA'].available_states).toContain('booting')
  })

  it('keeps Qima official id frozen', () => {
    expect(CHARACTERS['CHAR-QIMA'].official_id).toBe('EDU-0077')
  })

  it('rejects unknown characters', () => {
    expect(() => new CharacterDataStore().get('CHAR-UNKNOWN')).toThrow(
      'Unknown character',
    )
  })

  it('rejects unknown portrait states', () => {
    expect(() =>
      new CharacterDataStore().portrait('CHAR-QIMA', 'unknown'),
    ).toThrow('Unknown portrait state')
  })

  it('never resolves a design board as a runtime portrait', () => {
    for (const character of Object.values(CHARACTERS)) {
      expect(Object.values(character.portrait_states)).not.toContainEqual(
        expect.stringContaining('/art/source/'),
      )
    }
  })
})
