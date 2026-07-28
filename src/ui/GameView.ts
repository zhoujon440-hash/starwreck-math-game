import { InventoryDragCoordinator } from '../game/drag'
import type { GameEngine } from '../game/engine'
import { sceneStateOrder } from '../game/engine'
import { DEBUG_UI } from '../config'
import { CharacterPortrait } from '../components/characters/CharacterPortrait'
import { characterData } from '../data/characters'
import { G01_DIALOGUE } from '../data/dialogue/g01'
import { DialogueDataLoader } from '../services/DialogueDataLoader'
import { DialogueRunner } from '../services/DialogueRunner'
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

const PLAYER_SCENE_TITLE = '拾光号熄灯'

export class GameView {
  readonly #drag: InventoryDragCoordinator
  readonly #dialogueRunner: DialogueRunner
  readonly #portrait = new CharacterPortrait()
  #session: GameSession
  #selectedItemId: string | null = null
  #cabinetOpen = false
  #introDismissed = false
  #completionPanelDismissed = false
  #hintedHotspotId: string | null = null
  #hintAvailableAt = 0
  #historyOpen = false
  #profileOpen = false
  #toast = ''
  #toastTimer: number | undefined
  #hintTimer: number | undefined
  #unsubscribe: (() => void) | undefined

  constructor(
    private readonly root: HTMLElement,
    private readonly engine: GameEngine,
  ) {
    this.#session = engine.snapshot
    this.#dialogueRunner = new DialogueRunner(
      new DialogueDataLoader(G01_DIALOGUE),
      engine,
    )
    this.#drag = new InventoryDragCoordinator(root, (itemId, targetId) => {
      this.#useItem(itemId, targetId)
    })
    root.addEventListener('click', this.#handleClick)
  }

  mount(): void {
    this.#unsubscribe = this.engine.subscribe((session) => {
      this.#session = session
      if (session.sceneState !== 'S2') this.#cabinetOpen = false
      if (
        session.sceneState !== 'S0' ||
        session.dialogue.active ||
        session.dialogue.readDialogueIds.length > 0
      ) {
        this.#introDismissed = true
      }
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
    const dialogue = this.#dialogueRunner.current
    const cabinetVisualState = ['S0', 'S1'].includes(this.#session.sceneState) ? 'closed' : 'open'

    this.root.innerHTML = `
      <main
        class="game-shell state-${this.#session.sceneState}"
        data-debug-ui="${DEBUG_UI}"
        data-cabinet-visual-state="${cabinetVisualState}"
      >
        <header class="topbar">
          <div class="brand-lockup">
            <span class="brand-mark" aria-hidden="true">✦</span>
            <div>
              <p>星骸拾荒者：十二星门</p>
              <span>序章 · ${escapeHtml(this.engine.chapter.title)}</span>
            </div>
          </div>

          <div class="state-readout" aria-label="场景进度">
            ${DEBUG_UI ? `<span class="state-code">${this.#session.sceneState}</span>` : ''}
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
            <span>${DEBUG_UI ? `已自动保存 · schema v${this.#session.schemaVersion}` : '已自动保存'}</span>
          </div>
          <nav class="story-tools" aria-label="剧情工具">
            <button data-action="open-history">对话历史</button>
            <button data-action="open-profile">角色档案</button>
          </nav>
        </header>

        <section class="scene-frame" aria-label="${escapeHtml(this.engine.chapter.sceneTitle)}">
          <div class="scene-canvas" data-scene-canvas>
            <div class="scene-art" role="img" aria-label="断电后的拾光号领航舱，窗外漂浮着飞船残骸"></div>
            <div class="state-layer distribution-box-layer" aria-hidden="true"></div>
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
            <span>当前目标 · ${DEBUG_UI ? escapeHtml(this.engine.chapter.sceneTitle) : PLAYER_SCENE_TITLE}</span>
            <strong>${escapeHtml(state.objective)}</strong>
            <p>${escapeHtml(state.narrative)}</p>
          </aside>

          ${
            dialogue
              ? `
                <aside
                  class="dialogue-card dialogue-performance"
                  aria-label="${escapeHtml(this.#dialogueSpeakerName(dialogue.speaker_id))}的对白"
                  data-dialogue-id="${dialogue.dialogue_id}"
                >
                  <div class="dialogue-portrait-wrap">
                    ${this.#dialoguePortraitTemplate(dialogue.speaker_id, dialogue.portrait_state)}
                  </div>
                  <div class="dialogue-copy">
                    <span>${escapeHtml(this.#dialogueSpeakerName(dialogue.speaker_id))}</span>
                    <p>${escapeHtml(dialogue.text)}</p>
                    <button class="dialogue-next" data-action="advance-dialogue">
                      ${dialogue.next_dialogue_id ? '下一句' : '继续探索'}
                    </button>
                  </div>
                </aside>
              `
              : ''
          }

          ${
            this.#session.sceneState === 'S0' && !this.#introDismissed
              ? `
                <section class="story-panel intro-panel" aria-labelledby="intro-title">
                  <span class="eyebrow">${DEBUG_UI ? 'G01 · SCN-G01-00' : '序章 · 坠落之前'}</span>
                  <h1 id="intro-title">拾光号熄灯</h1>
                  <p>拾光号失去主照明，搭档信号也已中断。星宇必须先在黑暗中找到光源。</p>
                  <button class="primary-action" data-action="dismiss-intro">开始搜寻</button>
                </section>
              `
              : ''
          }

          ${
            this.#session.sceneState === 'S5' && !this.#completionPanelDismissed
              ? `
                <section class="story-panel complete-panel" aria-labelledby="light-title">
                  <span class="eyebrow">${DEBUG_UI ? '安全节点 S5' : '舱灯重启'}</span>
                  <h2 id="light-title">应急照明恢复</h2>
                  <p>维修舱灯带逐段亮起。通向船尾的舱门重新可见，但七码仍然没有回应。</p>
                  <button
                    class="secondary-action"
                    data-action="inspect"
                    data-hotspot-id="HS-G01-0006"
                  >沿船尾通道前进</button>
                  <button class="text-action" data-action="dismiss-complete">收起面板查看完整场景</button>
                </section>
              `
              : ''
          }

          ${
            this.#session.sceneState === 'S6'
              ? `
                <section class="story-panel complete-panel" aria-labelledby="complete-title">
                  <span class="eyebrow">${DEBUG_UI ? 'S6 · SCN-G01-00' : '船尾信号回波'}</span>
                  <h2 id="complete-title">继续寻找七码</h2>
                  <p>舱灯已恢复。星宇沿船尾通道前进，黑暗深处传来一段微弱而熟悉的信号。</p>
                  <div class="completion-stats">
                    <span><b>${this.#session.foundItemIds.length}</b> 找到物品</span>
                    <span><b>${this.#session.hintCount}</b> 使用提示</span>
                    <span><b>1</b> 恢复舱段</span>
                  </div>
                  <button class="secondary-action" data-action="restart">重新检查领航舱</button>
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
        ${this.#historyOpen ? this.#historyTemplate() : ''}
        ${this.#profileOpen ? this.#profileTemplate() : ''}

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
            <span class="eyebrow">${DEBUG_UI ? '局部放大 · HS-G01-0003' : '局部放大'}</span>
            <h2 id="cabinet-title">维修柜找物</h2>
          </div>
          <div class="zoom-progress">${foundCount} / ${cabinetItems.length}</div>
          <button class="icon-button" data-action="close-cabinet" aria-label="关闭维修柜特写">×</button>
        </header>

        <div class="cabinet-content">
          <div class="cabinet-art" role="img" aria-label="打开的飞船维修柜，物品散落在三层置物架中">
            ${this.#collectibleLayersTemplate('zoom')}
            <div class="cabinet-clutter-foreground clutter-upper-canister" aria-hidden="true"></div>
            <div class="cabinet-clutter-foreground clutter-cables" aria-hidden="true"></div>
            <div class="cabinet-clutter-foreground clutter-parts-tray" aria-hidden="true"></div>
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
            <span>${DEBUG_UI ? 'HOS-G01-001' : '维修柜清单'}</span>
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
        if (!this.#session.dialogue.readDialogueIds.includes('DLG-G01-0001')) {
          this.#dialogueRunner.start('DLG-G01-0001')
        } else {
          this.#render()
        }
        break
      case 'find-item': {
        const itemId = actionElement.dataset.itemId
        if (itemId) {
          const result = this.engine.findItem(itemId)
          this.#handleResult(result)
          if (result.ok && itemId === 'ITM-G01-001') {
            this.#dialogueRunner.startTrigger('SCN-G01-00', '取得手灯')
          }
        }
        break
      }
      case 'advance-dialogue':
        this.#dialogueRunner.advance()
        break
      case 'open-history':
        this.#historyOpen = true
        this.#render()
        break
      case 'close-history':
        this.#historyOpen = false
        this.#render()
        break
      case 'open-profile':
        this.#profileOpen = true
        this.#render()
        break
      case 'close-profile':
        this.#profileOpen = false
        this.#render()
        break
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
        this.#showToast('已返回领航舱熄灯时刻。')
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

  #dialogueSpeakerName(speakerId: string): string {
    return speakerId === 'SYSTEM' ? '拾光号系统' : characterData.get(speakerId).name
  }

  #dialoguePortraitTemplate(speakerId: string, portraitState: string): string {
    if (speakerId === 'SYSTEM') {
      return '<div class="system-portrait" aria-label="拾光号系统"><i></i><i></i><i></i></div>'
    }
    return this.#portrait.render(speakerId, portraitState, 'dialogue-portrait')
  }

  #historyTemplate(): string {
    return `
      <div class="modal-backdrop" data-action="close-history"></div>
      <section class="story-modal history-modal" role="dialog" aria-modal="true" aria-labelledby="history-title">
        <header>
          <div>
            <span class="eyebrow">序章记录</span>
            <h2 id="history-title">对话历史</h2>
          </div>
          <button class="icon-button" data-action="close-history" aria-label="关闭对话历史">×</button>
        </header>
        <ol class="dialogue-history-list">
          ${
            this.#session.dialogueHistory.length
              ? this.#session.dialogueHistory
                  .map(
                    (entry) => `
                      <li data-history-dialogue-id="${entry.dialogueId}">
                        <div class="history-portrait">
                          ${this.#dialoguePortraitTemplate(entry.speakerId, entry.portraitState)}
                        </div>
                        <div>
                          <span>${escapeHtml(this.#dialogueSpeakerName(entry.speakerId))}</span>
                          <p>${escapeHtml(entry.text)}</p>
                          <small>序章 · 对话 ${entry.sequence}</small>
                        </div>
                      </li>
                    `,
                  )
                  .join('')
              : '<li class="history-empty">尚未记录对白。</li>'
          }
        </ol>
      </section>
    `
  }

  #profileTemplate(): string {
    const unlocked = this.#session.unlockedCharacterIds
      .map((characterId) => characterData.get(characterId))
    return `
      <div class="modal-backdrop" data-action="close-profile"></div>
      <section class="story-modal profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-title">
        <header>
          <div>
            <span class="eyebrow">拾光号档案</span>
            <h2 id="profile-title">角色档案</h2>
          </div>
          <button class="icon-button" data-action="close-profile" aria-label="关闭角色档案">×</button>
        </header>
        <div class="profile-grid">
          ${
            unlocked.length
              ? unlocked
                  .map((character) => {
                    const state =
                      this.#session.characterStates[character.character_id] ??
                      character.default_state
                    const discoveries = [
                      ...character.discoveries,
                      ...(this.#session.characterDiscoveries[character.character_id] ?? []),
                    ]
                    return `
                      <article class="character-profile" data-character-id="${character.character_id}">
                        <div class="profile-portrait">
                          ${this.#portrait.render(character.character_id, state, 'archive-portrait')}
                        </div>
                        <div>
                          <span>${escapeHtml(character.official_id ?? '拾光号成员')}</span>
                          <h3>${escapeHtml(character.name)}</h3>
                          <p>${escapeHtml(character.introduction)}</p>
                          <dl>
                            <div><dt>当前状态</dt><dd>${escapeHtml(this.#characterStateLabel(state))}</dd></div>
                            <div><dt>与星宇关系</dt><dd>${escapeHtml(character.relationship_status)}</dd></div>
                          </dl>
                          <h4>已发现信息</h4>
                          <ul>${discoveries.map((fact) => `<li>${escapeHtml(fact)}</li>`).join('')}</ul>
                        </div>
                      </article>
                    `
                  })
                  .join('')
              : '<p class="profile-empty">在剧情中正式遇见角色后，档案会在这里解锁。</p>'
          }
        </div>
      </section>
    `
  }

  #characterStateLabel(state: string): string {
    const labels: Record<string, string> = {
      normal: '正常',
      alert: '警觉',
      thinking: '思考',
      nervous: '紧张',
      determined: '坚定',
      offline: '离线',
      damaged: '受损',
      booting: '启动中',
      question: '疑问',
      warning: '警示',
      proud: '确认记录',
      awkward: '迟疑',
      scanning: '扫描中',
    }
    return labels[state] ?? '状态未知'
  }
}
