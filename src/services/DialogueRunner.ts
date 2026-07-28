import { characterData } from '../data/characters'
import type { GameSession } from '../game/types'
import type { DialogueNode } from '../types/dialogue'
import { DialogueDataLoader } from './DialogueDataLoader'
import { DialogueHistory } from './DialogueHistory'

export type DialogueStatePort = {
  snapshot: GameSession
  updateStory(updater: (draft: GameSession) => void): void
}

export class DialogueRunner {
  readonly #history = new DialogueHistory()

  constructor(
    private readonly loader: DialogueDataLoader,
    private readonly port: DialogueStatePort,
  ) {}

  get current(): DialogueNode | null {
    const id = this.port.snapshot.dialogue.currentDialogueId
    return id && this.port.snapshot.dialogue.active ? this.loader.get(id) : null
  }

  start(dialogueId: string): void {
    const node = this.loader.get(dialogueId)
    this.port.updateStory((draft) => {
      draft.dialogue.currentDialogueId = node.dialogue_id
      draft.dialogue.active = true
      this.#applyNode(draft, node)
    })
  }

  startTrigger(sceneId: string, trigger: string): boolean {
    const node = this.loader.byTrigger(sceneId, trigger)
    if (!node) return false
    this.start(node.dialogue_id)
    return true
  }

  advance(): void {
    const node = this.current
    if (!node) return
    if (!node.next_dialogue_id) {
      this.port.updateStory((draft) => {
        draft.dialogue.active = false
        draft.dialogue.currentDialogueId = null
      })
      return
    }
    const next = this.loader.get(node.next_dialogue_id)
    this.port.updateStory((draft) => {
      draft.dialogue.currentDialogueId = next.dialogue_id
      draft.dialogue.active = true
      this.#applyNode(draft, next)
    })
  }

  skipRead(): boolean {
    const node = this.current
    if (!node || !node.skippable || !this.port.snapshot.dialogue.readDialogueIds.includes(node.dialogue_id)) {
      return false
    }
    this.advance()
    return true
  }

  #applyNode(draft: GameSession, node: DialogueNode): void {
    if (!draft.dialogue.readDialogueIds.includes(node.dialogue_id)) {
      draft.dialogue.readDialogueIds.push(node.dialogue_id)
    }
    draft.dialogueHistory = this.#history.append(draft.dialogueHistory, node)
    Object.assign(draft.flags, node.writes_variables)
    if (node.updates_scene_state) {
      draft.sceneState = node.updates_scene_state
      draft.sceneStates[draft.currentSceneId] = node.updates_scene_state
    }
    if (node.grants_item && !draft.inventoryItemIds.includes(node.grants_item)) {
      draft.inventoryItemIds.push(node.grants_item)
    }
    for (const [characterId, portraitState] of Object.entries(
      node.updates_character_state,
    )) {
      characterData.portrait(characterId, portraitState)
      draft.characterStates[characterId] = portraitState
    }
    if (node.speaker_id !== 'SYSTEM' && !draft.unlockedCharacterIds.includes(node.speaker_id)) {
      draft.unlockedCharacterIds.push(node.speaker_id)
    }
  }
}
