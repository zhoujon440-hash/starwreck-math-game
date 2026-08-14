import type { GameSession } from '../../game/types'

const revealFlags: Record<string, string | null> = {
  'CHAR-XINGYU': null,
  'CHAR-QIMA': 'qima_identity_revealed',
  'CHAR-ALMAO': 'almao_identity_revealed',
  'CHAR-ZHENG': 'zheng_identity_revealed',
}

export const characterNarrativelyRevealed = (
  characterId: string,
  session: GameSession | null,
): boolean => {
  if (characterId === 'CHAR-XINGYU') return true
  const flag = revealFlags[characterId]
  return Boolean(flag && session?.flags[flag] === true)
}

