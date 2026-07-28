import { characterData } from '../../data/characters'

const escapeAttribute = (value: string): string =>
  value.replace(/[&<>"']/g, (character) => {
    const replacements: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    }
    return replacements[character] ?? character
  })

export class CharacterPortrait {
  render(characterId: string, state: string, className = ''): string {
    const character = characterData.get(characterId)
    const source = characterData.portrait(characterId, state)
    return `<img class="character-portrait ${escapeAttribute(className)}" src="${escapeAttribute(source)}" alt="${escapeAttribute(character.name)} · ${escapeAttribute(state)}">`
  }
}
