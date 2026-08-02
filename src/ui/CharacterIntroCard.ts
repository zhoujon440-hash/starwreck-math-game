import type { TrialCharacterProfile } from '../data/trial/characters'
import { withBaseAssets } from './assetPath'

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character] ?? character)

export class CharacterIntroCard {
  render(character: TrialCharacterProfile): string {
    return withBaseAssets(`
      <aside class="trial-card character-intro-card is-nonblocking" role="status" aria-labelledby="character-card-name" data-character-card-id="${character.id}">
        <div class="trial-card-portrait"><img src="${character.portrait}" alt="${escapeHtml(character.name)}正式立绘"></div>
        <div class="trial-card-copy">
          <span>人物记录已更新</span>
          <h2 id="character-card-name">${escapeHtml(character.name)}</h2>
          <strong>${escapeHtml(character.identity)}</strong>
          <p>${escapeHtml(character.relationship)}</p>
          <dl><div><dt>当前目标</dt><dd>${escapeHtml(character.currentGoal)}</dd></div></dl>
          <ul>${character.traits.map((trait) => `<li>${escapeHtml(trait)}</li>`).join('')}</ul>
          <button class="trial-confirm-action" data-trial-action="dismiss-card">记入角色档案</button>
        </div>
      </aside>
    `)
  }
}
