import type { CharacterSide } from '../characters'

export type DialogueSpeakerId = 'xingyu' | 'qima' | 'system'

export type DialogueCondition = {
  flag: string
  equals: boolean | number | string
}

export type DialogueEffect =
  | {
      type: 'set-flag'
      key: string
      value: boolean | number | string
    }
  | {
      type: 'unlock-profile'
      characterId: 'xingyu' | 'qima'
    }
  | {
      type: 'set-character-state'
      characterId: 'xingyu' | 'qima'
      portraitState: string
    }

export type DialogueLineDefinition = {
  dialogueId: string
  sequenceId: string
  sceneId: string
  sequence: number
  speakerId: DialogueSpeakerId
  speakerName: string
  portraitState: string
  side: CharacterSide
  text: string
  optionalVoiceId?: string
  blocking: boolean
  skippable: boolean
  condition?: DialogueCondition
  effects: DialogueEffect[]
  nextDialogueId?: string
}

export type DialogueSequenceDefinition = {
  sequenceId: string
  sceneId: string
  trigger: string
  dialogueIds: string[]
  requiredFirstPlay: boolean
}
