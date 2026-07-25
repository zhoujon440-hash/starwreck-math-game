import type { AdventureDefinition } from '../game/types'
import { G01_CHARACTERS } from './characters'
import { G01_DIALOGUES, G01_DIALOGUE_SEQUENCES } from './dialogues'
import { G01 } from './g01'
import { G01_SCENE_01 } from './g01-scene-01'
import { G01_STORY_SCENES } from './story/g01-scenes'

export const G01_ADVENTURE: AdventureDefinition = {
  id: 'G01',
  title: '拾光号：坠落之前',
  initialSceneId: 'SCN-G01-00',
  scenes: {
    'SCN-G01-00': G01,
    'SCN-G01-01': G01_SCENE_01,
  },
  characters: G01_CHARACTERS,
  dialogues: G01_DIALOGUES,
  dialogueSequences: G01_DIALOGUE_SEQUENCES,
  storyScenes: G01_STORY_SCENES,
}
