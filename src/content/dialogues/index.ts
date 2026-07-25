import { G01_SCENE_00_DIALOGUES, G01_SCENE_00_SEQUENCES } from './g01-scene-00'
import { G01_SCENE_01_DIALOGUES, G01_SCENE_01_SEQUENCES } from './g01-scene-01'

export * from './g01-scene-00'
export * from './g01-scene-01'
export * from './types'

export const G01_DIALOGUES = [...G01_SCENE_00_DIALOGUES, ...G01_SCENE_01_DIALOGUES]
export const G01_DIALOGUE_SEQUENCES = [...G01_SCENE_00_SEQUENCES, ...G01_SCENE_01_SEQUENCES]
