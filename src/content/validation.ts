import type { CharacterDefinition } from './characters'
import type { DialogueLineDefinition, DialogueSequenceDefinition } from './dialogues'
import type { G01StorySceneDefinition } from './story/g01-scenes'

export const validateCharacterDefinitions = (
  characters: Record<string, CharacterDefinition>,
): string[] => {
  const errors: string[] = []
  const ids = new Set<string>()
  Object.entries(characters).forEach(([key, character]) => {
    if (ids.has(character.characterId)) errors.push(`Duplicate characterId: ${character.characterId}`)
    ids.add(character.characterId)
    if (!character.displayName) errors.push(`${key} is missing displayName`)
    if (!character.portraitStates[character.defaultPortrait]) {
      errors.push(`${key} default portrait is missing`)
    }
    if (!character.firstAppearanceScene.startsWith('SCN-G01-')) {
      errors.push(`${key} has an invalid firstAppearanceScene`)
    }
  })
  return errors
}

export const validateDialogueData = (
  dialogues: DialogueLineDefinition[],
  sequences: DialogueSequenceDefinition[],
): string[] => {
  const errors: string[] = []
  const lineById = new Map(dialogues.map((line) => [line.dialogueId, line]))
  if (lineById.size !== dialogues.length) errors.push('Dialogue IDs must be unique')

  sequences.forEach((sequence) => {
    const lines = sequence.dialogueIds
      .map((id) => lineById.get(id))
      .filter((line): line is DialogueLineDefinition => Boolean(line))
    if (lines.length !== sequence.dialogueIds.length) {
      errors.push(`${sequence.sequenceId} references a missing dialogue`)
      return
    }
    if (lines.some((line) => line.sequenceId !== sequence.sequenceId)) {
      errors.push(`${sequence.sequenceId} contains a line from another sequence`)
    }
    const order = lines.map((line) => line.sequence)
    if (order.some((value, index) => value !== index + 1)) {
      errors.push(`${sequence.sequenceId} sequence numbers are not contiguous`)
    }
    lines.forEach((line, index) => {
      const expectedNext = lines[index + 1]?.dialogueId
      if (line.nextDialogueId !== expectedNext) {
        errors.push(`${line.dialogueId} has an invalid nextDialogueId`)
      }
    })
  })
  return errors
}

export const validateStoryScenes = (scenes: G01StorySceneDefinition[]): string[] => {
  const errors: string[] = []
  if (scenes.length !== 8) errors.push('G01 must define exactly eight story scenes')
  scenes.forEach((scene, index) => {
    const expectedId = `SCN-G01-${String(index).padStart(2, '0')}`
    if (scene.sceneId !== expectedId) errors.push(`Expected ${expectedId}, got ${scene.sceneId}`)
    if (scene.resultingFlags.world_star_core_count !== 0) {
      errors.push(`${scene.sceneId} changes world_star_core_count`)
    }
  })
  return errors
}

