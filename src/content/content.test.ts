import { describe, expect, it } from 'vitest'
import { G01_CHARACTERS, QIMA, XINGYU } from './characters'
import { G01_DIALOGUES, G01_DIALOGUE_SEQUENCES } from './dialogues'
import { G01_STORY_SCENES } from './story/g01-scenes'
import {
  validateCharacterDefinitions,
  validateDialogueData,
  validateStoryScenes,
} from './validation'

describe('G01 character and story content', () => {
  it('validates stable character, dialogue and eight-scene definitions', () => {
    expect(validateCharacterDefinitions(G01_CHARACTERS)).toEqual([])
    expect(validateDialogueData(G01_DIALOGUES, G01_DIALOGUE_SEQUENCES)).toEqual([])
    expect(validateStoryScenes(G01_STORY_SCENES)).toEqual([])
  })

  it('defines every required portrait state without text placeholders', () => {
    expect(Object.keys(XINGYU.portraitStates)).toEqual([
      'normal',
      'alert',
      'thinking',
      'nervous',
      'determined',
    ])
    expect(Object.keys(QIMA.portraitStates)).toEqual([
      'offline',
      'damaged',
      'booting',
      'normal',
      'question',
      'warning',
      'proud',
      'awkward',
      'scanning',
    ])
    expect(Object.values(G01_CHARACTERS).every((character) => character.defaultPortrait.length > 1))
      .toBe(true)
  })

  it('keeps future unapproved scene writing explicitly pending', () => {
    expect(
      G01_STORY_SCENES.slice(2).every(
        (scene) =>
          scene.playable === false &&
          scene.narrativePurpose === '待项目负责人补充' &&
          scene.objectiveSummary === '待项目负责人补充',
      ),
    ).toBe(true)
  })

  it('keeps G01 star-core results at zero and never uses the retired protagonist name', () => {
    expect(G01_STORY_SCENES.every((scene) => scene.resultingFlags.world_star_core_count === 0)).toBe(
      true,
    )
    const productionContent = JSON.stringify({
      characters: G01_CHARACTERS,
      dialogues: G01_DIALOGUES,
      scenes: G01_STORY_SCENES,
    })
    expect(productionContent).not.toContain(['小', '砾'].join(''))
  })
})
