import type { GameSession } from '../../game/types'
import type { DialogueNode } from '../../types/dialogue'

export const CONCEALED_QIMA_NAME = '受损导航设备'

/**
 * Identity concealment is a presentation rule, not a rewrite of frozen source
 * data. Running every player-facing HTML fragment through this function also
 * covers accessible names, image alternatives and modal copy.
 */
export const presentIdentityMarkup = (
  session: Pick<GameSession, 'flags'> | null | undefined,
  markup: string,
): string => session?.flags.qima_identity_revealed === true
  ? markup
  : markup.replaceAll('七码', CONCEALED_QIMA_NAME)

/** Player copy may conceal an identity until the narrative reveal while the
 * frozen formal source node remains intact and traceable. */
export const presentDialogueNode = (session: GameSession, node: DialogueNode): DialogueNode => {
  if (session.flags.qima_identity_revealed === true) return node
  return {
    ...node,
    text: node.dialogue_id === 'DLG-G01-0001'
      ? '导航核心？回答。'
      : node.text.replaceAll('七码', CONCEALED_QIMA_NAME),
  }
}
