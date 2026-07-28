import { characterData } from '../data/characters'
import type { DialogueNode } from '../types/dialogue'

export class DialogueDataLoader {
  readonly #nodes: Map<string, DialogueNode>

  constructor(nodes: DialogueNode[]) {
    this.#nodes = new Map(nodes.map((node) => [node.dialogue_id, structuredClone(node)]))
    if (this.#nodes.size !== nodes.length) throw new Error('Duplicate dialogue_id')
    this.#validate()
  }

  get(dialogueId: string): DialogueNode {
    const node = this.#nodes.get(dialogueId)
    if (!node) throw new Error(`Unknown dialogue: ${dialogueId}`)
    return structuredClone(node)
  }

  forScene(sceneId: string): DialogueNode[] {
    return [...this.#nodes.values()]
      .filter((node) => node.scene_id === sceneId)
      .sort((left, right) => left.sequence - right.sequence)
      .map((node) => structuredClone(node))
  }

  byTrigger(sceneId: string, trigger: string): DialogueNode | null {
    const node = [...this.#nodes.values()].find(
      (candidate) =>
        candidate.scene_id === sceneId && candidate.trigger_condition === trigger,
    )
    return node ? structuredClone(node) : null
  }

  #validate(): void {
    for (const node of this.#nodes.values()) {
      if (node.speaker_id !== 'SYSTEM') {
        characterData.portrait(node.speaker_id, node.portrait_state)
      } else if (node.portrait_state !== 'system') {
        throw new Error(`System dialogue must use system portrait: ${node.dialogue_id}`)
      }
      if (node.next_dialogue_id && !this.#nodes.has(node.next_dialogue_id)) {
        throw new Error(
          `Dangling next_dialogue_id: ${node.dialogue_id}/${node.next_dialogue_id}`,
        )
      }
    }
  }
}
