import { InventoryDragCoordinator } from '../game/drag'
import type { GameEngine } from '../game/engine'
import { sceneStateOrder } from '../game/engine'
import { CircuitRoutingGame } from '../game/minigames/circuit'
import type { ActionResult, GameSession, HotspotDefinition, ItemDefinition } from '../game/types'

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

const itemById = (items: ItemDefinition[], itemId: string): ItemDefinition | undefined =>
  items.find((item) => item.id === itemId)

export class GameView {
  readonly #drag: InventoryDragCoordinator
  readonly #circuit = new CircuitRoutingGame(['cold-white', 'amber', 'cyan', 'deep-red'])
  #session: GameSession
  #selectedItemId: string | null = null
  #zoomOpen = false
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
      if (session.sceneState !== 'S3') this.#zoomOpen = false
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
    const inventoryItems = this.#session.inventoryItemIds
      .map((itemId) => itemById(this.engine.chapter.items, itemId))
      .filter((item): item is ItemDefinition => Boolean(item))
    const remainingItems = this.engine.chapter.items.filter(
      (item) => !this.#session.foundItemIds.includes(item.id),
    )
    const hintCoolingDown = Date.now() < this.#hintAvailableAt

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
            <span>本地自动存档</span>
          </div>
        </header>

        <section class="scene-frame" aria-label="${escapeHtml(this.engine.chapter.sceneTitle)}">
          <div class="scene-art" role="img" aria-label="受损的拾光号领航舱，窗外是行星与飞船残骸"></div>
          <div class="scene-treatment" aria-hidden="true"></div>

          <aside class="objective-card">
            <span>当前目标</span>
            <strong>${escapeHtml(state.objective)}</strong>
            <p>${escapeHtml(state.narrative)}</p>
          </aside>

          <div class="hotspot-layer">
            ${activeHotspots.map((hotspot) => this.#hotspotTemplate(hotspot)).join('')}
          </div>

          ${
            this.#session.sceneState === 'S0'
              ? `
                <section class="story-panel intro-panel" aria-labelledby="intro-title">
                  <span class="eyebrow">序章 · 安全节点 00</span>
                  <h1 id="intro-title">拾光号坠落之前</h1>
                  <blockquote>“星宇，别相信自动航线。<br />有人改写了星门坐标。”</blockquote>
                  <p>未知引力锁住了拾光号。领航舱只剩九十秒应急电力。</p>
                  <button class="primary-action" data-action="start">接管应急权限</button>
                </section>
              `
              : ''
          }

          ${
            this.#session.sceneState === 'S6'
              ? `
                <section class="story-panel complete-panel" aria-labelledby="complete-title">
                  <span class="eyebrow">G01 · 第一场景完成</span>
                  <h2 id="complete-title">坠落航线已锁定</h2>
                  <p>星宇将拾光号带离碎片带。那颗没有编号的行星正在打开第一道星门。</p>
                  <div class="completion-stats">
                    <span><b>${this.#session.foundItemIds.length}</b> 找到道具</span>
                    <span><b>${this.#session.hintCount}</b> 使用提示</span>
                    <span><b>S6</b> 安全节点</span>
                  </div>
                  <button class="secondary-action" data-action="restart">再次体验</button>
                </section>
              `
              : ''
          }

          <div class="scene-counter" aria-live="polite">
            ${
              this.#session.sceneState === 'S1'
                ? `<span>尚未找到</span><strong>${remainingItems.length} / ${this.engine.chapter.items.length}</strong>`
                : `<span>领航舱状态</span><strong>${escapeHtml(state.title)}</strong>`
            }
          </div>

          <footer class="inventory-hud">
            <div class="inventory-heading">
              <span>背包</span>
              <small>${inventoryItems.length ? '拖拽道具到场景使用' : '找到的道具会出现在这里'}</small>
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
              aria-label="${hintCoolingDown ? '提示正在冷却' : '显示一处当前线索'}"
            >
              <span aria-hidden="true">⌁</span>
              <strong>${hintCoolingDown ? '分析中' : '提示'}</strong>
            </button>
          </footer>
        </section>

        ${this.#zoomOpen ? this.#zoomTemplate() : ''}

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
          ? 'open-zoom'
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

  #inventoryTemplate(item: ItemDefinition): string {
    const crop = item.inventoryCrop
    const cropStyle = crop
      ? `--crop-x:${crop.x}%;--crop-y:${crop.y}%;--crop-scale:${Math.round(10_000 / crop.size)}%;`
      : ''
    return `
      <button
        class="inventory-item ${this.#selectedItemId === item.id ? 'is-selected' : ''}"
        draggable="true"
        data-action="select-item"
        data-inventory-item="${item.id}"
        style="${cropStyle}"
        aria-pressed="${this.#selectedItemId === item.id}"
      >
        <i class="inventory-art" aria-hidden="true"></i>
        <span>
          <strong>${escapeHtml(item.name)}</strong>
          <small>${escapeHtml(item.description)}</small>
        </span>
      </button>
    `
  }

  #zoomTemplate(): string {
    const circuit = this.#circuit.snapshot
    const nodeDefinitions = [
      { id: 'cold-white', label: '冷白', className: 'node-white' },
      { id: 'amber', label: '琥珀', className: 'node-amber' },
      { id: 'cyan', label: '青蓝', className: 'node-cyan' },
      { id: 'deep-red', label: '深红', className: 'node-red' },
    ]
    const statusCopy =
      circuit.status === 'solved'
        ? '能量路由稳定'
        : circuit.status === 'failed'
          ? '保护性断路已触发'
          : '按照舱壁残留的光谱顺序接通四路继电器'

    return `
      <div class="modal-backdrop" data-action="close-zoom"></div>
      <section class="zoom-modal" role="dialog" aria-modal="true" aria-labelledby="puzzle-title">
        <header>
          <div>
            <span class="eyebrow">局部放大 · 检修舱</span>
            <h2 id="puzzle-title">应急电路：光谱路由</h2>
          </div>
          <button class="icon-button" data-action="close-zoom" aria-label="关闭局部放大">×</button>
        </header>

        <div class="zoom-content">
          <div class="zoom-art" role="img" aria-label="领航舱右下方已经打开的检修舱"></div>
          <div class="circuit-panel">
            <div class="circuit-clue">
              <span>舱壁残码</span>
              <strong>冷白 → 琥珀 → 青蓝 → 深红</strong>
            </div>
            <div class="circuit-board" data-status="${circuit.status}">
              <div class="circuit-lines" aria-hidden="true"></div>
              ${nodeDefinitions
                .map(
                  (node, index) => `
                    <button
                      class="circuit-node ${node.className} ${this.#circuit.path.includes(node.id) ? 'is-active' : ''}"
                      data-action="circuit-node"
                      data-node-id="${node.id}"
                      aria-label="接通${node.label}继电器"
                      style="--node-index:${index}"
                    >
                      <i aria-hidden="true"></i>
                      <span>${node.label}</span>
                    </button>
                  `,
                )
                .join('')}
            </div>
            <div class="circuit-status" aria-live="polite">
              <span>${escapeHtml(statusCopy)}</span>
              <div class="circuit-progress" aria-label="电路进度 ${circuit.progress}/${circuit.total}">
                ${Array.from(
                  { length: circuit.total },
                  (_, index) => `<i class="${index < circuit.progress ? 'is-on' : ''}"></i>`,
                ).join('')}
              </div>
              <small>失误 ${circuit.mistakes} / 3</small>
            </div>
          </div>
        </div>

        <footer>
          ${
            circuit.status === 'failed'
              ? `<button class="danger-action" data-action="rollback">回退到安全节点 S2</button>`
              : `<button class="text-action" data-action="skip-puzzle">跳过谜题</button>`
          }
          <p>跳过不会阻断剧情；失败时可回退到最近的安全节点。</p>
        </footer>
      </section>
    `
  }

  #handleClick = (event: MouseEvent): void => {
    const actionElement = (event.target as HTMLElement).closest<HTMLElement>('[data-action]')
    const action = actionElement?.dataset.action
    if (!actionElement || !action) return

    switch (action) {
      case 'start':
        this.#handleResult(this.engine.start())
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
      case 'open-zoom':
        this.#zoomOpen = true
        if (this.#circuit.snapshot.status === 'idle') this.#circuit.start()
        this.#render()
        break
      case 'close-zoom':
        this.#zoomOpen = false
        this.#render()
        break
      case 'hint':
        this.#requestHint()
        break
      case 'circuit-node': {
        const nodeId = actionElement.dataset.nodeId
        if (!nodeId) break
        const result = this.#circuit.act(nodeId)
        if (result.status === 'solved') {
          this.#zoomOpen = false
          this.#handleResult(this.engine.completePuzzle('power-routing'))
        } else {
          this.#render()
          if (result.status === 'failed') this.#showToast('电路过载。可以回退到 S2 安全节点。')
        }
        break
      }
      case 'skip-puzzle':
        this.#zoomOpen = false
        this.#handleResult(this.engine.completePuzzle('power-routing'))
        break
      case 'rollback':
        this.#zoomOpen = false
        this.#circuit.reset()
        this.#handleResult(this.engine.rollbackToCheckpoint())
        break
      case 'restart':
        this.#selectedItemId = null
        this.#zoomOpen = false
        this.#circuit.reset()
        this.engine.reset()
        this.#showToast('已返回 G01 起始安全节点。')
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
    const hint = this.engine.requestHint()
    if (!hint) {
      this.#showToast('当前线索已经清理完毕。')
      return
    }

    this.#hintedHotspotId = hint.id
    this.#hintAvailableAt = Date.now() + 12_000
    this.#render()
    this.#showToast('传感器捕捉到一处异常反光。')

    if (this.#hintTimer) window.clearTimeout(this.#hintTimer)
    this.#hintTimer = window.setTimeout(() => {
      this.#hintedHotspotId = null
      this.#render()
    }, 3_800)
    window.setTimeout(() => this.#render(), 12_000)
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
