import type { CharacterId, PortraitState } from './character'
import type { SceneStateId } from '../game/types'

export type DialogueSpeakerId = CharacterId | 'SYSTEM' | 'DISTRESS_SIGNAL'

export type DialogueNode = {
  dialogue_id: string
  scene_id: string
  speaker_id: DialogueSpeakerId
  portrait_state: PortraitState | 'system'
  text: string
  sequence: number
  trigger_condition: string
  next_dialogue_id: string | null
  writes_variables: Record<string, boolean | number | string>
  grants_item: string | null
  updates_character_state: Partial<Record<CharacterId, PortraitState>>
  updates_scene_state: SceneStateId | null
  skippable: boolean
  replayable: boolean
  history_visible: boolean
}

export type DialogueState = {
  currentDialogueId: string | null
  active: boolean
  readDialogueIds: string[]
}

export type DialogueHistoryEntry = {
  dialogueId: string
  sceneId: string
  speakerId: DialogueSpeakerId
  portraitState: PortraitState | 'system'
  text: string
  sequence: number
  recordedAt: string
}
