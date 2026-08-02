import type { ChapterGuideDefinition, StoryCardDefinition } from '../data/trial/story'
import { withBaseAssets } from './assetPath'

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character] ?? character)

export class StoryIntro {
  renderCard(card: StoryCardDefinition, index: number, total: number, replay = false): string {
    return withBaseAssets(`
      <main class="story-intro-screen" data-trial-view="story-intro" data-story-card-id="${card.id}" style="--story-background:url('${card.image}')">
        <div class="story-intro-shade"></div>
        <section class="story-intro-panel">
          <header><span>${escapeHtml(card.eyebrow)}</span><small>${index + 1} / ${total}</small></header>
          <div class="story-intro-progress">${Array.from({ length: total }, (_, step) => `<i class="${step <= index ? 'is-active' : ''}"></i>`).join('')}</div>
          <h2>${escapeHtml(card.title)}</h2>
          <p>${escapeHtml(card.body)}</p>
          ${card.characterIds?.length
            ? `<div class="story-character-pair">
                <img src="/assets/characters/xingyu/xingyu_normal.png" alt="星宇正式立绘">
                <img src="/assets/characters/qima/qima_normal.png" alt="七码正式立绘">
              </div>`
            : ''}
          <footer>
            <button data-trial-action="intro-previous" ${index === 0 ? 'disabled' : ''}>上一页</button>
            <button class="text-action" data-trial-action="intro-skip">${replay ? '返回档案' : '跳过展示'}</button>
            <button class="trial-confirm-action" data-trial-action="intro-next">${index === total - 1 ? (replay ? '返回档案' : '进入序章介绍') : '下一页'}</button>
          </footer>
        </section>
      </main>
    `)
  }

  renderChapter(guide: ChapterGuideDefinition, mode: 'start' | 'review' | 'handoff'): string {
    const action = mode === 'start' ? 'chapter-start' : mode === 'handoff' ? 'g02-recap-continue' : 'chapter-back'
    const label = mode === 'start' ? '进入序章' : mode === 'handoff' ? '进入旧屏幕谷' : '返回章节列表'
    return withBaseAssets(`
      <section class="chapter-guide-screen" data-trial-view="chapter-guide" data-chapter-id="${guide.id}" style="--chapter-background:url('${guide.image}')">
        <div class="chapter-guide-shade"></div>
        <article>
          <span>${escapeHtml(guide.label)}</span>
          <h2>${escapeHtml(guide.title)}</h2>
          <p>${escapeHtml(guide.summary)}</p>
          <ol>${guide.objectives.map((objective) => `<li>${escapeHtml(objective)}</li>`).join('')}</ol>
          <small>${escapeHtml(guide.estimatedMinutes)}</small>
          <div class="chapter-guide-actions">
            ${mode !== 'handoff' ? '<button data-trial-action="title">返回标题页</button>' : ''}
            <button class="trial-confirm-action" data-trial-action="${action}">${label}</button>
          </div>
        </article>
      </section>
    `)
  }
}
