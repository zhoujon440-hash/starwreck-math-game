import type { GameSession } from '../../game/types'
import type { DialogueNode } from '../../types/dialogue'

/** Player copy may conceal an identity until the narrative reveal while the
 * frozen formal source node remains intact and traceable. */
export const presentDialogueNode = (session: GameSession, node: DialogueNode): DialogueNode => {
  if (node.dialogue_id === 'DLG-G01-0001' && session.flags.qima_identity_revealed !== true) {
    return { ...node, text: '导航核心？回答。' }
  }
  return node
}

