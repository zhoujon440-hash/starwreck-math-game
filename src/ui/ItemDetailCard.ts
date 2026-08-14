import type { GameSession } from '../game/types'
import { itemUsageStatus, type TrialItemArchiveEntry } from '../data/trial/items'
import { withBaseAssets } from './assetPath'

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character] ?? character)

export class ItemDetailCard {
  render(item: TrialItemArchiveEntry, session: GameSession | null, firstPickup = false): string {
    return withBaseAssets(`
      <div class="trial-modal-backdrop"></div>
      <section class="trial-card item-detail-card" role="dialog" aria-modal="true" aria-labelledby="item-card-name" data-item-card-id="${item.id}">
        <div class="item-card-visual">${item.icon ? `<img src="${item.icon}" alt="${escapeHtml(item.name)}">` : '<i></i>'}</div>
        <div class="trial-card-copy">
          <span>${firstPickup ? '获得物品' : '物品档案'}</span>
          <h2 id="item-card-name">${escapeHtml(item.name)}</h2>
          <div class="item-card-tags"><b>${escapeHtml(item.type)}</b><b>${item.critical ? '关键物品' : '普通物品'}</b><b>${itemUsageStatus(item, session)}</b></div>
          <p>${escapeHtml(item.background)}</p>
          <dl>
            <div><dt>观察</dt><dd>${escapeHtml(item.observation)}</dd></div>
            <div><dt>获得位置</dt><dd>${escapeHtml(item.acquiredSceneName)}</dd></div>
            <div><dt>错误使用</dt><dd>${escapeHtml(item.wrongUseHint)}</dd></div>
          </dl>
          <button class="trial-confirm-action" data-trial-action="dismiss-card">${firstPickup ? '放入背包' : '关闭详情'}</button>
        </div>
      </section>
    `)
  }
}
