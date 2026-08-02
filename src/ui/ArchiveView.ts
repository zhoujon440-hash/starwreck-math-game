import { CHAPTER_GUIDES, WORLD_ARCHIVE_ENTRIES } from '../data/trial/story'
import { TRIAL_CHARACTERS, trialCharacterById } from '../data/trial/characters'
import { TRIAL_ITEMS, itemUsageStatus } from '../data/trial/items'
import type { TrialUiMeta } from '../game/uiMetaSave'
import type { GameSession } from '../game/types'
import { withBaseAssets } from './assetPath'

export type ArchiveTab = 'world' | 'chapters' | 'characters' | 'items' | 'evidence' | 'dialogue'

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character] ?? character)

const evidenceDefinitions = [
  ['货舱漏气记录', '裂口位置与空气流失方向已经确认。', 'g01_scn03_evidence_leak_confirmed'],
  ['货舱测压读数', '压力校准结果保存在货舱安全节点。', 'g01_scn03_evidence_pressure_reading'],
  ['锈环星异常信号', '星图中反复删除自身的微弱异常点。', 'g01_scn04_evidence_anomaly'],
  ['锈环星求救记录', '经波形校准后确认来源的求救记录。', 'g01_scn06_evidence_distress_record'],
  ['旧屏幕谷落点扫描', '拾光号抵达旧屏幕谷外缘前保存的落点记录。', 'g01_scn07_evidence_landing_scan'],
  ['管理员封存脉冲', '旧屏幕谷入口处留下的封存信号样本。', 'g02_evidence_001'],
  ['私人资源归属标签', '仍能对应具体使用者的资源标签。', 'g02_evidence_002'],
  ['公共供暖资源标签', '连接公共供暖线路的资源标签。', 'g02_evidence_003'],
  ['废弃资源标签', '已经断开用途并留下废弃划痕的标签。', 'g02_evidence_004'],
  ['借用规则档案', '旧电视墙恢复的借、用、还记录。', 'g02_evidence_005'],
] as const

const chapterUnlocked = (chapterId: 'G01' | 'G02', session: GameSession | null): boolean =>
  chapterId === 'G01' || session?.flags.g01_handoff_to_g02 === true

const characterUnlocked = (characterId: string, session: GameSession | null, meta: TrialUiMeta): boolean => {
  if (meta.seenCharacterCards.includes(characterId)) return true
  return session?.unlockedCharacterIds.includes(characterId) === true
}

export class ArchiveView {
  render(session: GameSession | null, meta: TrialUiMeta, tab: ArchiveTab = 'world', overlay = false): string {
    const tabs: Array<[ArchiveTab, string]> = [
      ['world', '世界背景'], ['chapters', '章节回顾'], ['characters', '人物档案'],
      ['items', '物品档案'], ['evidence', '证据记录'], ['dialogue', '对话历史'],
    ]
    return withBaseAssets(`
      ${overlay ? '<div class="trial-modal-backdrop"></div>' : ''}
      <section class="trial-library-screen archive-screen ${overlay ? 'is-overlay' : ''}" data-trial-view="archive" data-archive-tab="${tab}">
        <header>
          <div><span>星宇的旅程记录</span><h2>故事档案</h2></div>
          <button data-trial-action="archive-close">返回</button>
        </header>
        <nav class="archive-tabs" aria-label="档案分类">
          ${tabs.map(([id, label]) => `<button class="${tab === id ? 'is-selected' : ''}" data-trial-action="archive-tab" data-tab="${id}">${label}</button>`).join('')}
        </nav>
        <div class="archive-content">${this.#tabContent(tab, session, meta)}</div>
      </section>
    `)
  }

  #tabContent(tab: ArchiveTab, session: GameSession | null, meta: TrialUiMeta): string {
    if (tab === 'world') {
      return `<div class="archive-world-grid">
        ${WORLD_ARCHIVE_ENTRIES.map((entry, index) => {
          const unlocked = index === 0 || meta.introSeen
          return `<article class="archive-world-entry ${unlocked ? '' : 'is-locked'}" style="--entry-image:url('${entry.image}')">
            <div></div><span>${unlocked ? escapeHtml(entry.eyebrow) : '尚待航行记录'}</span>
            <h3>${unlocked ? escapeHtml(entry.title) : '更多背景将在旅程开始后记录'}</h3>
            <p>${unlocked ? escapeHtml(entry.body) : '先从标题页开始新游戏。'}</p>
          </article>`
        }).join('')}
        <button class="archive-replay-story" data-trial-action="replay-intro">重新查看故事背景</button>
      </div>`
    }

    if (tab === 'chapters') {
      return `<div class="archive-chapter-grid">
        ${Object.values(CHAPTER_GUIDES).map((chapter) => {
          const unlocked = chapterUnlocked(chapter.id, session)
          return `<article class="archive-chapter ${unlocked ? '' : 'is-locked'}">
            <img src="${chapter.image}" alt="">
            <div><span>${escapeHtml(chapter.label)}</span><h3>${escapeHtml(chapter.title)}</h3>
              <p>${unlocked ? escapeHtml(chapter.summary) : '信号之外的内容尚未由当前旅程解锁。'}</p>
              <button data-trial-action="chapter-review" data-chapter="${chapter.id}" ${unlocked ? '' : 'disabled'}>${unlocked ? '查看章节介绍' : '尚未解锁'}</button>
            </div>
          </article>`
        }).join('')}
      </div>`
    }

    if (tab === 'characters') {
      return `<div class="archive-character-grid">
        ${TRIAL_CHARACTERS.map((character) => {
          const unlocked = characterUnlocked(character.id, session, meta)
          return `<article class="archive-character ${unlocked ? '' : 'is-locked'}">
            ${unlocked ? `<img src="${character.portrait}" alt="${escapeHtml(character.name)}正式立绘">` : '<div class="locked-silhouette"></div>'}
            <div><span>${unlocked ? escapeHtml(character.identity) : '尚未正式相遇'}</span>
              <h3>${unlocked ? escapeHtml(character.name) : '未知人物'}</h3>
              <p>${unlocked ? escapeHtml(character.relationship) : '继续当前旅程后，人物记录会在正式登场时更新。'}</p>
              ${unlocked ? `<button data-trial-action="view-character" data-character-id="${character.id}">查看完整人物卡</button>` : ''}
            </div>
          </article>`
        }).join('')}
      </div>`
    }

    if (tab === 'items') {
      return `<div class="archive-item-grid" data-item-coverage-count="${TRIAL_ITEMS.length}">
        ${TRIAL_ITEMS.map((item) => {
          const unlocked = session?.foundItemIds.includes(item.id) === true || session?.usedItemIds.includes(item.id) === true
          return `<article class="archive-item ${unlocked ? '' : 'is-locked'}">
            <div class="archive-item-icon">${unlocked && item.icon ? `<img src="${item.icon}" alt="${escapeHtml(item.name)}">` : '<i></i>'}</div>
            <div><span>${unlocked ? escapeHtml(item.type) : '尚未取得'}</span>
              <h3>${unlocked ? escapeHtml(item.name) : escapeHtml(item.acquiredSceneName + '的未发现物品')}</h3>
              <p>${unlocked ? `${itemUsageStatus(item, session)} · ${escapeHtml(item.observation)}` : '在场景中亲自找到后才能查看详情。'}</p>
              ${unlocked ? `<button data-trial-action="view-item" data-item-id="${item.id}">查看物品详情</button>` : ''}
            </div>
          </article>`
        }).join('')}
      </div>`
    }

    if (tab === 'evidence') {
      const found = evidenceDefinitions.filter(([, , flag]) => session?.flags[flag] === true)
      return `<div class="archive-evidence-list">
        ${found.length ? found.map(([name, description]) => `<article><i></i><div><h3>${escapeHtml(name)}</h3><p>${escapeHtml(description)}</p></div></article>`).join('') : '<p class="archive-empty">尚未取得证据。证据会在正式调查和安全节点中保存。</p>'}
      </div>`
    }

    return `<ol class="archive-dialogue-list">
      ${session?.dialogueHistory.length ? session.dialogueHistory.map((entry) => {
        const character = trialCharacterById(entry.speakerId)
        const speaker = character?.name ?? (entry.speakerId === 'SYSTEM' ? '拾光号系统' : '锈环星求救信号')
        return `<li><span>${escapeHtml(speaker)}</span><p>${escapeHtml(entry.text)}</p><small>记录 ${entry.sequence}</small></li>`
      }).join('') : '<li class="archive-empty">尚未记录对白。</li>'}
    </ol>`
  }
}
