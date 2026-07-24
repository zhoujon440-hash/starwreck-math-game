import { InventoryDragCoordinator } from '../game/drag'
import type { GameEngine } from '../game/engine'
import { sceneStateOrder } from '../game/engine'
import type {
  ActionResult,
  GameSession,
  HintResult,
  HotspotDefinition,
  ItemDefinition,
} from '../game/types'

const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      })[character] ?? character,
  )

const hotspotStyle = (hotspot: HotspotDefinition): string =>
  `left:${hotspot.area.x}%;top:${hotspot.area.y}%;width:${hotspot.area.width}%;height:${hotspot.area.height}%`

const areaStyle = (
  area: { x: number; y: number; width: number; height: number },
  rotation = 0,
): string =>
  `left:${area.x}%;top:${area.y}%;width:${area.width}%;height:${area.height}%;--object-rotation:${rotation}deg`

const itemById = (items: ItemDefinition[], itemId: string): ItemDefinition | undefined =>
  items.find((item) => item.id === itemId)

const dialogueForState = (state: GameSession['sceneState']) => {
  if (state === 'S0') return { speaker: '星宇', avatar: '星', line: '七码？回答。' }
  if (state === 'S1') {
    return { speaker: '系统', avatar: '系', line: '导航核心离线。维修舱进入应急照明模式。' }
  }
  if (state === 'S5') {
    return { speaker: '星宇', avatar: '星', line: '灯亮了。现在去找七码。' }
  }
  return null
}

export class GameView {
  readonly #drag: InventoryDragCoordinator
  #session: GameSession
  #selectedItemId: string | null = null
  #cabinetOpen = false
  #introDismissed = false
  #completionPanelDismissed = false
  #hintedHotspotId: string | null = null
  #hintAvailableAt = 0
  #toast = ''
  #toastTimer: number | undefined
  #hintTimer: number | undefined
  #unsubscribe: (() => void) | undefined

  constructor(
    private readonly root: HTMLElement,
    private readonly engine: GameEngine,
  ) {
    this.#session = engine.snapshot
    this.#drag = new InventoryDragCoordinator(root, (itemId, targetId) => {
      this.#useItem(itemId, targetId)
    })
    root.addEventListener('click', this.#handleClick)
  }

  mount(): void {
    this.#unsubscribe = this.engine.subscribe((session) => {
      this.#session = session
      if (session.sceneState !== 'S2') this.#cabinetOpen = false
      if (session.sceneState !== 'S0') this.#introDismissed = true
      if (session.sceneState !== 'S5') this.#completionPanelDismissed = false
      this.#render()
    })
  }

  destroy(): void {
    this.#unsubscribe?.()
    this.#drag.destroy()
    this.root.removeEventListener('click', this.#handleClick)
    if (this.#toastTimer) window.clearTimeout(this.#toastTimer)
    if (this.#hintTimer) window.clearTimeout(this.#hintTimer)
  }

  #render(): void {
    const state = this.engine.chapter.states[this.#session.sceneState]
    const activeHotspots = this.engine.activeHotspots()
    const sceneHotspots = activeHotspots.filter((hotspot) => hotspot.scope !== 'zoom')
    const inventoryItems = this.#session.inventoryItemIds
      .map((itemId) => itemById(this.engine.chapter.items, itemId))
      .filter((item): item is ItemDefinition => Boolean(item))
    const remainingCurrentItems = activeHotspots.filter(
      (hotspot) =>
        hotspot.kind === 'hidden-item' &&
        hotspot.itemId &&
        !this.#session.foundItemIds.includes(hotspot.itemId),
    )
    const hintCoolingDown = Date.now() < this.#hintAvailableAt
    const dialogue = dialogueForState(this.#session.sceneState)

    this.root.innerHTML = `
      <main class="game-shell state-${this.#session.sceneState}">
        <header class="topbar">
          <div class="brand-lockup">
            <span class="brand-mark" aria-hidden="true">✦</span>
            <div>
              <p>星骸拾荒者：十二星门</p>
              <span>G01 · ${escapeHtml(this.engine.chapter.title)}</span>
            </div>
          </div>

          <div class="state-readout" aria-label="场景进度">
            <span class="state-code">${this.#session.sceneState}</span>
            <div>
              <strong>${escapeHtml(state.title)}</strong>
              <div class="state-track" aria-hidden="true">
                ${sceneStateOrder
                  .map(
                    (stateId) =>
                      `<i class="${sceneStateOrder.indexOf(stateId) <= sceneStateOrder.indexOf(this.#session.sceneState) ? 'is-complete' : ''}"></i>`,
                  )
                  .join('')}
              </div>
            </div>
          </div>

          <div class="save-status" title="进度会自动保存在此设备">
            <i aria-hidden="true"></i>
            <span>本地自动存档 · schema v${this.#session.schemaVersion}</span>
          </div>
        </header>

        <section class="scene-frame" aria-label="${escapeHtml(this.engine.chapter.sceneTitle)}">
          <div class="scene-canvas" data-scene-canvas>
            <div class="scene-art" role="img" aria-label="断电后的拾光号领航舱，窗外漂浮着飞船残骸"></div>
            <div class="state-layer distribution-box-layer" aria-hidden="true"></div>
            <div class="state-layer cabinet-layer" aria-hidden="true"></div>
            <div class="state-layer lighting-layer" aria-hidden="true"></div>
            <div class="scene-treatment" aria-hidden="true"></div>
            <div class="foreground-layer" aria-hidden="true"></div>
            ${this.#collectibleLayersTemplate('scene')}

            <div class="hotspot-layer pickable-layer">
              ${sceneHotspots.map((hotspot) => this.#hotspotTemplate(hotspot)).join('')}
              ${this.#sceneUtilityTargetsTemplate()}
            </div>
          </div>

          <aside class="objective-card">
            <span>当前目标 · ${escapeHtml(this.engine.chapter.sceneTitle)}</span>
            <strong>${escapeHtml(state.objective)}</strong>
            <p>${escapeHtml(state.narrative)}</p>
          </aside>

          ${
            dialogue
              ? `
                <aside class="dialogue-card" aria-label="${escapeHtml(dialogue.speaker)}的对白">
                  <div class="dialogue-avatar" aria-hidden="true">${dialogue.avatar}</div>
                  <div>
                    <span>${escapeHtml(dialogue.speaker)}</span>
                    <p>${escapeHtml(dialogue.line)}</p>
                  </div>
                </aside>
              `
              : ''
          }

          ${
            this.#session.sceneState === 'S0' && !this.#introDismissed
              ? `
                <section class="story-panel intro-panel" aria-labelledby="intro-title">
                  <span class="eyebrow">G01 · SCN-G01-00</span>
                  <h1 id="intro-title">拾光号熄灯</h1>
                  <blockquote>“七码？回答。”</blockquote>
                  <p>导航核心离线。维修舱进入应急照明模式。星宇必须先在黑暗中找到光源。</p>
                  <button class="primary-action" data-action="dismiss-intro">开始搜寻</button>
                </section>
              `
              : ''
          }

          ${
            this.#session.sceneState === 'S5' && !this.#completionPanelDismissed
              ? `
                <section class="story-panel complete-panel" aria-labelledby="light-title">
                  <span class="eyebrow">安全节点 S5</span>
                  <h2 id="light-title">应急照明恢复</h2>
                  <p>维修舱灯带逐段亮起。通向船尾的舱门重新可见，但七码仍然没有回应。</p>
                  <button
                    class="secondary-action"
                    data-action="inspect"
                    data-hotspot-id="HS-G01-0006"
                  >进入下一场景入口</button>
                  <button class="text-action" data-action="dismiss-complete">收起面板查看完整场景</button>
                </section>
              `
              : ''
          }

          ${
            this.#session.sceneState === 'S6'
              ? `
                <section class="story-panel complete-panel" aria-labelledby="complete-title">
                  <span class="eyebrow">第一轮交付边界</span>
                  <h2 id="complete-title">拾光号熄灯 · 完成</h2>
                  <p>SCN-G01-00 已可完整通关。后续场景等待项目负责人审查后再进入开发。</p>
                  <div class="completion-stats">
                    <span><b>${this.#session.foundItemIds.length}</b> 找到物品</span>
                    <span><b>${this.#session.hintCount}</b> 使用提示</span>
                    <span><b>0</b> G01 星核</span>
                  </div>
                  <button class="secondary-action" data-action="restart">再次体验</button>
                </section>
              `
              : ''
          }

          <div class="scene-counter" aria-live="polite">
            ${
              remainingCurrentItems.length
                ? `<span>当前待发现</span><strong>${remainingCurrentItems.length}</strong>`
                : `<span>领航舱状态</span><strong>${escapeHtml(state.title)}</strong>`
            }
          </div>

          <footer class="inventory-hud">
            <div class="inventory-heading">
              <span>背包</span>
              <small>${inventoryItems.length ? '拖拽道具到场景使用' : '找到的关键道具会出现在这里'}</small>
            </div>
            <div class="inventory-list" aria-label="背包道具">
              ${
                inventoryItems.length
                  ? inventoryItems.map((item) => this.#inventoryTemplate(item)).join('')
                  : `<div class="inventory-empty"><i aria-hidden="true">＋</i><span>空</span></div>`
              }
            </div>
            <button
              class="hint-button"
              data-action="hint"
              ${hintCoolingDown ? 'disabled' : ''}
              aria-label="${hintCoolingDown ? '提示正在冷却' : '获取渐进式提示'}"
            >
              <span aria-hidden="true">⌁</span>
              <strong>${hintCoolingDown ? '分析中' : '提示'}</strong>
            </button>
          </footer>
        </section>

        ${this.#cabinetOpen ? this.#cabinetTemplate() : ''}

        <div class="toast ${this.#toast ? 'is-visible' : ''}" role="status" aria-live="polite">
          ${escapeHtml(this.#toast)}
        </div>

        <div class="rotate-notice">
          <span aria-hidden="true">↻</span>
          <strong>请横屏探索拾光号</strong>
          <p>横屏能保留完整的场景细节与背包操作区。</p>
        </div>
      </main>
    `
  }

  #hotspotTemplate(hotspot: HotspotDefinition): string {
    if (
      hotspot.kind === 'hidden-item' &&
      hotspot.itemId &&
      this.#session.foundItemIds.includes(hotspot.itemId)
    ) {
      return ''
    }

    const classes = [
      'scene-hotspot',
      `kind-${hotspot.kind}`,
      hotspot.id === this.#hintedHotspotId ? 'is-hinted' : '',
      hotspot.requiredItemId === this.#selectedItemId ? 'is-compatible' : '',
    ]
      .filter(Boolean)
      .join(' ')

    const action =
      hotspot.kind === 'hidden-item'
        ? 'find-item'
        : hotspot.kind === 'zoom'
          ? 'open-cabinet'
          : hotspot.kind === 'use-target'
            ? 'use-target'
            : 'inspect'

    return `
      <button
        class="${classes}"
        style="${hotspotStyle(hotspot)}"
        data-action="${action}"
        data-hotspot-id="${hotspot.id}"
        ${hotspot.itemId ? `data-item-id="${hotspot.itemId}"` : ''}
        ${hotspot.kind === 'use-target' ? `data-drop-target="${hotspot.id}"` : ''}
        aria-label="${escapeHtml(hotspot.ariaLabel)}"
      ><span class="sr-only">${escapeHtml(hotspot.ariaLabel)}</span></button>
    `
  }

  #collectibleLayersTemplate(scope: 'scene' | 'zoom'): string {
    return this.engine.chapter.items
      .filter(
        (item) =>
          item.collectibleLayer?.scope === scope &&
          !this.#session.foundItemIds.includes(item.id),
      )
      .map((item) => {
        const layer = item.collectibleLayer
        if (!layer) return ''
        return `
          <img
            class="collectible-object collectible-${scope}"
            data-collectible-item="${item.id}"
            src="${layer.source}"
            style="${areaStyle(layer.area, layer.rotation)}"
            alt=""
            aria-hidden="true"
            draggable="false"
          >
        `
      })
      .join('')
  }

  #sceneUtilityTargetsTemplate(): string {
    const state = this.#session.sceneState
    const cabinetHotspot = this.engine.chapter.hotspots.find(
      (hotspot) => hotspot.id === 'HS-G01-0003',
    )
    const distributionBox = this.engine.chapter.hotspots.find(
      (hotspot) => hotspot.id === 'HS-G01-0002',
    )
    const canReinspectCabinet = ['S3', 'S4'].includes(state)

    return `
      ${
        canReinspectCabinet && cabinetHotspot
          ? `
            <button
              class="scene-hotspot scene-inspection-hotspot"
              style="${hotspotStyle(cabinetHotspot)}"
              data-action="open-cabinet"
              data-hotspot-id="HS-G01-0003"
              aria-label="重新检查维修柜"
            ><span class="sr-only">重新检查维修柜</span></button>
          `
          : ''
      }
      ${
        state === 'S3' && distributionBox
          ? `
            <div
              class="scene-hotspot inactive-drop-target"
              style="${hotspotStyle(distributionBox)}"
              data-drop-target="HS-G01-0002"
              aria-hidden="true"
            ></div>
          `
          : ''
      }
    `
  }

  #inventoryTemplate(item: ItemDefinition): string {
    const crop = item.inventoryCrop
    const cropStyle = crop
      ? `--crop-x:${crop.x}%;--crop-y:${crop.y}%;--crop-scale:${Math.round(10_000 / crop.size)}% auto;--crop-source:url("${crop.source ?? '/assets/g01-cockpit.png'}");`
      : ''
    const artwork = item.inventoryIcon
      ? `<img class="inventory-art" src="${item.inventoryIcon}" alt="">`
      : '<i class="inventory-art" aria-hidden="true"></i>'
    return `
      <button
        class="inventory-item ${this.#selectedItemId === item.id ? 'is-selected' : ''}"
        draggable="true"
        data-action="select-item"
        data-inventory-item="${item.id}"
        style="${cropStyle}"
        aria-pressed="${this.#selectedItemId === item.id}"
      >
        ${artwork}
        <span>
          <strong>${escapeHtml(item.name)}</strong>
          <small>${escapeHtml(item.description)}</small>
        </span>
      </button>
    `
  }

  #cabinetTemplate(): string {
    const cabinetItems = this.engine.chapter.items.filter((item) =>
      ['ITM-G01-002', 'ITM-G01-003', 'ITM-G01-004', 'ITM-G01-005'].includes(item.id),
    )
    const zoomHotspots = this.engine
      .activeHotspots()
      .filter(
        (hotspot) =>
          hotspot.scope === 'zoom' &&
          hotspot.itemId &&
          !this.#session.foundItemIds.includes(hotspot.itemId),
      )
    const foundCount = cabinetItems.filter((item) =>
      this.#session.foundItemIds.includes(item.id),
    ).length

    return `
      <div class="modal-backdrop" data-action="close-cabinet"></div>
      <section class="zoom-modal cabinet-modal" role="dialog" aria-modal="true" aria-labelledby="cabinet-title">
        <header>
          <div>
            <span class="eyebrow">局部放大 · HS-G01-0003</span>
            <h2 id="cabinet-title">维修柜找物</h2>
          </div>
          <div class="zoom-progress">${foundCount} / ${cabinetItems.length}</div>
          <button class="icon-button" data-action="close-cabinet" aria-label="关闭维修柜特写">×</button>
        </header>

        <div class="cabinet-content">
          <div class="cabinet-art" role="img" aria-label="打开的飞船维修柜，物品散落在三层置物架中">
            ${this.#collectibleLayersTemplate('zoom')}
            ${zoomHotspots.map((hotspot) => this.#hotspotTemplate(hotspot)).join('')}
            <button
              class="scene-hotspot cabinet-distractor burnt-fuse"
              data-action="cabinet-distractor"
              aria-label="检查烧毁的保险丝"
            ><span class="sr-only">烧毁的保险丝</span></button>
            <button
              class="scene-hotspot cabinet-distractor loose-screws"
              data-action="cabinet-distractor"
              aria-label="检查普通螺丝"
            ><span class="sr-only">普通螺丝</span></button>
          </div>

          <aside class="hos-list">
            <span>HOS-G01-001</span>
            <h3>在画面中找出</h3>
            <ul>
              ${cabinetItems
                .map(
                  (item) => `
                    <li class="${this.#session.foundItemIds.includes(item.id) ? 'is-found' : ''}">
                      <i aria-hidden="true"></i>
                      ${escapeHtml(item.name)}
                      ${item.id === 'ITM-G01-002' ? '<small>关键</small>' : ''}
                    </li>
                  `,
                )
                .join('')}
            </ul>
            <p>烧毁保险丝和普通螺丝是干扰物。物件没有可见标记，请观察材质与形状。</p>
          </aside>
        </div>
      </section>
    `
  }

  #handleClick = (event: MouseEvent): void => {
    const actionElement = (event.target as HTMLElement).closest<HTMLElement>('[data-action]')
    const action = actionElement?.dataset.action
    if (!actionElement || !action) return

    switch (action) {
      case 'dismiss-intro':
        this.#introDismissed = true
        this.#render()
        break
      case 'find-item': {
        const itemId = actionElement.dataset.itemId
        if (itemId) this.#handleResult(this.engine.findItem(itemId))
        break
      }
      case 'select-item': {
        const itemId = actionElement.dataset.inventoryItem
        if (!itemId) break
        this.#selectedItemId = this.#selectedItemId === itemId ? null : itemId
        this.#render()
        break
      }
      case 'use-target': {
        const targetId = actionElement.dataset.hotspotId
        if (targetId && this.#selectedItemId) this.#useItem(this.#selectedItemId, targetId)
        else this.#showToast('先从背包选择道具，或直接把道具拖到这里。')
        break
      }
      case 'open-cabinet':
        this.#cabinetOpen = true
        this.#render()
        break
      case 'close-cabinet':
        this.#cabinetOpen = false
        this.#render()
        break
      case 'dismiss-complete':
        this.#completionPanelDismissed = true
        this.#render()
        break
      case 'cabinet-distractor':
        this.#showToast('这是干扰物，不需要收进背包。')
        break
      case 'inspect': {
        const hotspotId = actionElement.dataset.hotspotId
        if (hotspotId) this.#handleResult(this.engine.inspect(hotspotId))
        break
      }
      case 'hint':
        this.#requestHint()
        break
      case 'restart':
        this.#selectedItemId = null
        this.#cabinetOpen = false
        this.#introDismissed = false
        this.#completionPanelDismissed = false
        this.engine.reset()
        this.#showToast('已返回 SCN-G01-00 起始安全节点。')
        break
      default:
        break
    }
  }

  #useItem(itemId: string, targetId: string): void {
    const result = this.engine.useItem(itemId, targetId)
    if (result.ok) this.#selectedItemId = null
    this.#handleResult(result)
  }

  #requestHint(): void {
    if (Date.now() < this.#hintAvailableAt) return
    const result = this.engine.requestHint(this.#cabinetOpen ? 'zoom' : 'scene')
    if (!result) {
      this.#showToast('当前区域的线索已经清理完毕。')
      return
    }

    if (result.hotspot.scope === 'zoom') this.#cabinetOpen = true
    this.#hintAvailableAt = Date.now() + 7_000
    if (result.level === 3) this.#hintedHotspotId = result.hotspot.id
    this.#render()
    this.#showToast(this.#hintCopy(result))

    if (this.#hintTimer) window.clearTimeout(this.#hintTimer)
    this.#hintTimer = window.setTimeout(() => {
      this.#hintedHotspotId = null
      this.#render()
    }, 3_800)
    window.setTimeout(() => this.#render(), 7_000)
  }

  #hintCopy(result: HintResult): string {
    const { hotspot, level } = result
    const horizontal =
      hotspot.area.x < 34 ? '左侧' : hotspot.area.x > 66 ? '右侧' : '中央区域'
    const vertical =
      hotspot.area.y < 34 ? '上方' : hotspot.area.y > 66 ? '下方' : '中部'
    const areaName = hotspot.scope === 'zoom' ? '维修柜' : '领航舱'
    if (level === 1) return `一级提示：留意${areaName}的${horizontal}。`
    if (level === 2) return `二级提示：目标位于${areaName}${horizontal}${vertical}。`
    return `三级提示：传感器正在短暂扫描——${hotspot.ariaLabel}。`
  }

  #handleResult(result: ActionResult): void {
    this.#showToast(result.message)
  }

  #showToast(message: string): void {
    this.#toast = message
    this.#render()
    if (this.#toastTimer) window.clearTimeout(this.#toastTimer)
    this.#toastTimer = window.setTimeout(() => {
      this.#toast = ''
      this.#render()
    }, 2_800)
  }
}
