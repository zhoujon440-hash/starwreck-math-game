import type { DialogueHistoryEntry, DialogueNode } from '../types/dialogue'

export class DialogueHistory {
  append(entries: DialogueHistoryEntry[], node: DialogueNode): DialogueHistoryEntry[] {
    if (!node.history_visible || entries.some((entry) => entry.dialogueId === node.dialogue_id)) {
      return entries
    }
    return [
      ...entries,
      {
        dialogueId: node.dialogue_id,
        sceneId: node.scene_id,
        speakerId: node.speaker_id,
        portraitState: node.portrait_state,
        text: node.text,
        sequence: node.sequence,
        recordedAt: new Date().toISOString(),
      },
    ]
  }
}
