import { DEBUG_UI } from '../config'
import {
  G01_CABINET_ART,
  G01_CLOSED_SCENE_ART,
  G01_SCENE_ART,
} from '../content/g01'
import {
  G01_SCENE_01_ART,
  G01_SCENE_01_CORE_ART,
} from '../content/g01-scene-01'
import type { CharacterDefinition } from '../content/characters'
import type { DialogueLineDefinition } from '../content/dialogues'
import { InventoryDragCoordinator } from '../game/drag'
import type { GameEngine } from '../game/engine'
import { CircuitRoutingGame } from '../game/minigames/circuit'
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

const CIRCUIT_ID = 'PZL-G01-01-CIRCUIT'
const CIRCUIT_SOLUTION = ['white', 'amber', 'cyan', 'red']
const SCENE_01_ITEM_IDS = [
  'ITM-G01-101',
  'ITM-G01-102',
  'ITM-G01-103',
  'ITM-G01-104',
]

export class GameView {
  readonly #drag: InventoryDragCoordinator
  readonly #circuit = new CircuitRoutingGame(CIRCUIT_SOLUTION)
  #session: GameSession
  #selectedItemId: string | null = null
  #zoomOpen = false
  #historyOpen = false
  #profilesOpen = false
  #circuitOpen = false
  #autoPlay = false
  #hintedHotspotId: string | null = null
  #hintAvailableAt = 0
  #toast = ''
  #typedLineId: string | null = null
  #typedCharacters = 0
  #typeTimer: number | undefined
  #autoTimer: number | undefined
  #toastTimer: number | undefined
  #hintTimer: number | undefined
  #unsubscribe: (() => void) | undefined

  constructor(
    private readonly root: HTMLElement,
    private readonly engine: GameEngine,
  ) {
    this.#session = engine.snapshot
    this.#restoreCircuit()
    this.#drag = new InventoryDragCoordinator(root, (itemId, targetId) => {
      this.#useItem(itemId, targetId)
    })
    root.addEventListener('click', this.#handleClick)
    window.addEventListener('keydown', this.#handleKeyDown)
  }

  mount(): void {
    this.#unsubscribe = this.engine.subscribe((session) => {
      const sceneChanged = session.currentSceneId !== this.#session.currentSceneId
      this.#session = session
      if (sceneChanged) {
        this.#selectedItemId = null
        this.#zoomOpen = false
        this.#historyOpen = false
        this.#profilesOpen = false
      }
      if (session.currentSceneId === 'SCN-G01-00' && session.sceneState !== 'S2') {
        this.#zoomOpen = false
      }
      if (session.completedPuzzleIds.includes(CIRCUIT_ID)) {
        this.#circuitOpen = false
        this.#zoomOpen = false
      } else {
        this.#restoreCircuit()
        if (
          session.currentSceneId === 'SCN-G01-01' &&
          session.sceneState === 'S6' &&
          !session.currentDialogueId &&
          !this.engine.pendingCharacterProfileId
        ) {
          this.#circuitOpen = true
        }
      }
      this.#render()
    })
  }

  destroy(): void {
    this.#unsubscribe?.()
    this.#drag.destroy()
    this.root.removeEventListener('click', this.#handleClick)
    window.removeEventListener('keydown', this.#handleKeyDown)
    this.#clearTypingTimers()
    if (this.#toastTimer) window.clearTimeout(this.#toastTimer)
    if (this.#hintTimer) window.clearTimeout(this.#hintTimer)
  }

  #render(): void {
    const chapter = this.engine.chapter
    const state = chapter.states[this.#session.sceneState]
    const storyScene = this.engine.adventure.storyScenes.find(
      (scene) => scene.sceneId === this.#session.currentSceneId,
    )
    const activeHotspots = this.engine.activeHotspots()
    const sceneHotspots = activeHotspots.filter((hotspot) => hotspot.scope !== 'zoom')
    const inventoryItems = this.#session.inventoryItemIds
      .map((itemId) =>
        [...Object.values(this.engine.adventure.scenes).flatMap((scene) => scene.items)].find(
          (item) => item.id === itemId,
        ),
      )
      .filter((item): item is ItemDefinition => Boolean(item))
    const remainingCurrentItems = activeHotspots.filter(
      (hotspot) =>
        hotspot.kind === 'hidden-item' &&
        hotspot.itemId &&
        !this.#session.foundItemIds.includes(hotspot.itemId),
    )
    const hintCoolingDown = Date.now() < this.#hintAvailableAt
    const dialogue = this.engine.currentDialogue
    const pendingProfileId = this.engine.pendingCharacterProfileId
    const storyOverlayActive = Boolean(dialogue || pendingProfileId)
    const storyIndex = Math.max(
      0,
      this.engine.adventure.storyScenes.findIndex(
        (scene) => scene.sceneId === this.#session.currentSceneId,
      ),
    )
    const sceneArt = this.#sceneArt()

    this.root.innerHTML = `
      <main
        class="game-shell scene-${this.#session.currentSceneId.toLowerCase()} state-${this.#session.sceneState} ${storyOverlayActive ? 'story-overlay-active' : ''}"
        data-debug-ui="${DEBUG_UI}"
        data-current-scene="${this.#session.currentSceneId}"
        data-qima-state="${escapeHtml(this.#session.characterStates.qima ?? 'offline')}"
      >
        <header class="topbar">
          <div class="brand-lockup">
            <span class="brand-mark" aria-hidden="true">✦</span>
            <div>
              <p>星骸拾荒者：十二星门</p>
              <span>序章 · ${escapeHtml(this.engine.adventure.title)}</span>
            </div>
          </div>

          <div class="state-readout" aria-label="剧情进度">
            ${DEBUG_UI ? `<span class="state-code">${escapeHtml(this.#session.currentSceneId)} · ${this.#session.sceneState}</span>` : ''}
            <div>
              <strong>${escapeHtml(storyScene?.title ?? state.title)}</strong>
              <div class="story-track" aria-hidden="true">
                ${this.engine.adventure.storyScenes
                  .map(
                    (_, index) =>
                      `<i class="${index <= storyIndex ? 'is-complete' : ''}"></i>`,
                  )
                  .join('')}
              </div>
              <small>序章进度 ${storyIndex + 1} / 8</small>
            </div>
          </div>

          <nav class="topbar-tools" aria-label="剧情工具">
            <button data-action="open-profiles" aria-label="打开角色档案">角色档案</button>
            <button data-action="open-history" aria-label="打开对话历史">对话历史</button>
            <div class="save-status" title="进度会自动保存在此设备">
              <i aria-hidden="true"></i>
              <span>${DEBUG_UI ? `已自动保存 · schema v${this.#session.schemaVersion}` : '已自动保存'}</span>
            </div>
          </nav>
        </header>

        <section class="scene-frame" aria-label="${escapeHtml(chapter.sceneTitle)}">
          <div
            class="scene-canvas"
            data-scene-canvas
            style="--scene-art:url('${sceneArt}')"
          >
            <div class="scene-art" role="img" aria-label="${escapeHtml(this.#sceneDescription())}"></div>
            <div class="state-layer distribution-box-layer" aria-hidden="true"></div>
            <div class="state-layer lighting-layer" aria-hidden="true"></div>
            <div class="state-layer core-power-layer" aria-hidden="true"></div>
            <div class="scene-treatment" aria-hidden="true"></div>
            <div class="foreground-layer" aria-hidden="true"></div>
            ${this.#qimaSceneSpriteTemplate()}
            ${this.#collectibleLayersTemplate('scene')}

            <div class="hotspot-layer pickable-layer" ${storyOverlayActive ? 'inert' : ''}>
              ${sceneHotspots.map((hotspot) => this.#hotspotTemplate(hotspot)).join('')}
              ${this.#sceneUtilityTargetsTemplate()}
            </div>
          </div>

          <aside class="objective-card">
            <span>当前目标 · ${escapeHtml(storyScene?.title ?? state.title)}</span>
            <strong>${escapeHtml(state.objective)}</strong>
            <p>${escapeHtml(state.narrative)}</p>
          </aside>

          <div class="scene-counter" aria-live="polite">
            ${
              remainingCurrentItems.length
                ? `<span>当前待发现</span><strong>${remainingCurrentItems.length}</strong>`
                : `<span>当前进展</span><strong>${escapeHtml(state.title)}</strong>`
            }
          </div>

          ${this.#openingCinematicTemplate()}
          ${this.#sceneHandoffTemplate()}

          <footer class="inventory-hud">
            <div class="inventory-heading">
              <span>背包</span>
              <small>${inventoryItems.length ? '拖拽道具到场景使用' : '关键道具会保存在这里'}</small>
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
              ${hintCoolingDown || storyOverlayActive ? 'disabled' : ''}
              aria-label="${hintCoolingDown ? '提示正在冷却' : '获取渐进式提示'}"
            >
              <span aria-hidden="true">⌁</span>
              <strong>${hintCoolingDown ? '分析中' : '提示'}</strong>
            </button>
          </footer>
        </section>

        ${this.#zoomOpen ? this.#zoomTemplate() : ''}
        ${this.#circuitOpen ? this.#circuitTemplate() : ''}
        ${dialogue ? this.#dialogueTemplate(dialogue) : ''}
        ${pendingProfileId ? this.#characterIntroductionTemplate(pendingProfileId) : ''}
        ${this.#historyOpen ? this.#historyTemplate() : ''}
        ${this.#profilesOpen ? this.#profilesTemplate() : ''}

        <div class="toast ${this.#toast ? 'is-visible' : ''}" role="status" aria-live="polite">
          ${escapeHtml(this.#toast)}
        </div>

        <div class="rotate-notice">
          <span aria-hidden="true">↻</span>
          <strong>请横屏探索拾光号</strong>
          <p>横屏能保留完整的场景细节、角色演出与背包操作区。</p>
        </div>
      </main>
    `

    this.#syncTyping(dialogue)
  }

  #sceneArt(): string {
    if (this.#session.currentSceneId === 'SCN-G01-01') return G01_SCENE_01_ART
    return ['S0', 'S1'].includes(this.#session.sceneState)
      ? G01_CLOSED_SCENE_ART
      : G01_SCENE_ART
  }

  #sceneDescription(): string {
    if (this.#session.currentSceneId === 'SCN-G01-01') {
      return '拾光号导航核心舱，右侧服务座停着失去响应的七码'
    }
    return '拾光号领航舱，窗外漂浮着飞船残骸'
  }

  #openingCinematicTemplate(): string {
    const openingSequence = this.engine.adventure.dialogueSequences.find(
      (sequence) =>
        sequence.sceneId === this.#session.currentSceneId && sequence.trigger === 'scene:begin',
    )
    const hasBegun = Boolean(
      this.#session.currentDialogueSequenceId === openingSequence?.sequenceId ||
        (openingSequence &&
          this.#session.completedDialogueSequenceIds.includes(openingSequence.sequenceId)) ||
        (openingSequence &&
          openingSequence.dialogueIds.some((id) => this.#session.readDialogueIds.includes(id))),
    )
    if (
      this.#session.currentSceneId !== this.engine.adventure.initialSceneId ||
      hasBegun ||
      this.engine.currentDialogue
    ) {
      return ''
    }
    return `
      <section class="opening-cinematic" aria-labelledby="opening-title">
        <div class="opening-signal" aria-hidden="true"><i></i><i></i><i></i></div>
        <span class="eyebrow">序章 · 坠落之前</span>
        <h1 id="opening-title">拾光号熄灯</h1>
        <p>主电网断开。导航核心没有回应。</p>
        <button class="primary-action" data-action="begin-scene">接入应急终端</button>
      </section>
    `
  }

  #sceneHandoffTemplate(): string {
    if (
      this.engine.currentDialogue ||
      this.engine.pendingCharacterProfileId ||
      this.#zoomOpen ||
      this.#circuitOpen
    ) {
      return ''
    }
    if (this.#session.currentSceneId === 'SCN-G01-00' && this.#session.sceneState === 'S6') {
      return `
        <section class="story-panel handoff-panel" aria-labelledby="handoff-title">
          <span class="eyebrow">船尾信号回波</span>
          <h2 id="handoff-title">前往导航核心舱</h2>
          <p>舱灯沿船尾依次亮起。那段微弱而熟悉的回波来自导航核心舱。</p>
          <button class="secondary-action" data-action="enter-scene" data-scene-id="SCN-G01-01">
            追踪七码的信号
          </button>
        </section>
      `
    }
    if (
      this.#session.currentSceneId === 'SCN-G01-01' &&
      this.#session.flags.g01_scene_01_complete === true
    ) {
      return `
        <section class="story-panel handoff-panel scene-one-complete" aria-labelledby="mission-title">
          <span class="eyebrow">导航核心恢复</span>
          <h2 id="mission-title">船上第一张任务单</h2>
          <p>七码重新接入拾光号。任务台亮起，第一张待办单正在生成。</p>
          <div class="completion-stats">
            <span><b>${this.#session.foundItemIds.length}</b> 找到物品</span>
            <span><b>${this.#session.hintCount}</b> 使用提示</span>
            <span><b>2</b> 恢复舱段</span>
          </div>
          <button class="secondary-action" data-action="open-profiles">查看搭档档案</button>
          <button class="text-action" data-action="open-history">回顾刚才的对话</button>
        </section>
      `
    }
    return ''
  }

  #qimaSceneSpriteTemplate(): string {
    if (this.#session.currentSceneId !== 'SCN-G01-01') return ''
    const qima = this.engine.adventure.characters.qima
    if (!qima) return ''
    const state = this.#session.characterStates.qima ?? qima.defaultPortrait
    const source = qima.portraitStates[state] ?? qima.portraitStates[qima.defaultPortrait]
    return `
      <img
        class="qima-scene-sprite qima-${escapeHtml(state)}"
        data-qima-scene-sprite
        src="${source}"
        alt="${state === 'offline' ? '关机的七码停在服务座中' : '七码位于导航核心服务座中'}"
        draggable="false"
      >
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
    if (this.#session.currentSceneId !== 'SCN-G01-00') return ''
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
              data-action="open-zoom"
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

  #inventoryTemplate(item: ItemDefinition, compact = false): string {
    const artwork = item.inventoryIcon
      ? `<img class="inventory-art" src="${item.inventoryIcon}" alt="">`
      : '<i class="inventory-art" aria-hidden="true"></i>'
    return `
      <button
        class="inventory-item ${compact ? 'is-compact' : ''} ${this.#selectedItemId === item.id ? 'is-selected' : ''}"
        draggable="true"
        data-action="select-item"
        data-inventory-item="${item.id}"
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

  #zoomTemplate(): string {
    return this.#session.currentSceneId === 'SCN-G01-01'
      ? this.#coreRepairTemplate()
      : this.#cabinetTemplate()
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
      <div class="modal-backdrop" data-action="close-zoom"></div>
      <section class="zoom-modal cabinet-modal" role="dialog" aria-modal="true" aria-labelledby="cabinet-title">
        <header>
          <div>
            <span class="eyebrow">${DEBUG_UI ? '局部放大 · HS-G01-0003' : '局部放大'}</span>
            <h2 id="cabinet-title">维修柜找物</h2>
          </div>
          <div class="zoom-progress">${foundCount} / ${cabinetItems.length}</div>
          <button class="icon-button" data-action="close-zoom" aria-label="关闭维修柜特写">×</button>
        </header>
        <div class="cabinet-content">
          <div
            class="cabinet-art"
            style="--zoom-art:url('${G01_CABINET_ART}')"
            role="img"
            aria-label="打开的飞船维修柜，物品散落在多层置物架中"
          >
            ${this.#collectibleLayersTemplate('zoom')}
            <div class="cabinet-clutter-foreground clutter-upper-canister" aria-hidden="true"></div>
            <div class="cabinet-clutter-foreground clutter-cables" aria-hidden="true"></div>
            <div class="cabinet-clutter-foreground clutter-parts-tray" aria-hidden="true"></div>
            ${zoomHotspots.map((hotspot) => this.#hotspotTemplate(hotspot)).join('')}
            <button class="scene-hotspot cabinet-distractor burnt-fuse" data-action="distractor" aria-label="检查烧毁的保险丝"></button>
            <button class="scene-hotspot cabinet-distractor loose-screws" data-action="distractor" aria-label="检查普通螺丝"></button>
          </div>
          <aside class="hos-list">
            <span>${DEBUG_UI ? 'HOS-G01-001' : '维修柜清单'}</span>
            <h3>在画面中找出</h3>
            <ul>
              ${cabinetItems
                .map(
                  (item) => `
                    <li class="${this.#session.foundItemIds.includes(item.id) ? 'is-found' : ''}">
                      <i aria-hidden="true"></i>${escapeHtml(item.name)}
                      ${item.id === 'ITM-G01-002' ? '<small>关键</small>' : ''}
                    </li>
                  `,
                )
                .join('')}
            </ul>
            <p>烧毁保险丝和普通螺丝是干扰物。请观察材质与形状。</p>
          </aside>
        </div>
      </section>
    `
  }

  #coreRepairTemplate(): string {
    const parts = this.engine.chapter.items.filter((item) => SCENE_01_ITEM_IDS.includes(item.id))
    const zoomHotspots = this.engine.activeHotspots().filter((hotspot) => hotspot.scope === 'zoom')
    const foundCount = parts.filter((item) => this.#session.foundItemIds.includes(item.id)).length
    const repairInventory = this.#session.inventoryItemIds
      .map((itemId) => itemById(this.engine.chapter.items, itemId))
      .filter(
        (item): item is ItemDefinition =>
          Boolean(item && SCENE_01_ITEM_IDS.includes(item.id)),
      )
    return `
      <div class="modal-backdrop" data-action="close-zoom"></div>
      <section class="zoom-modal core-modal" role="dialog" aria-modal="true" aria-labelledby="core-title">
        <header>
          <div>
            <span class="eyebrow">${DEBUG_UI ? 'HOS-G01-101 · 核心检修' : '核心检修'}</span>
            <h2 id="core-title">七码核心检修</h2>
          </div>
          <div class="zoom-progress">${this.#session.sceneState === 'S1' ? `${foundCount} / ${parts.length}` : escapeHtml(this.engine.stateDefinition.title)}</div>
          <button class="icon-button" data-action="close-zoom" aria-label="关闭七码核心特写">×</button>
        </header>
        <div class="core-content">
          <div
            class="core-art ${this.#session.usedItemIds.includes('ITM-G01-104') ? 'is-clean' : ''}"
            style="--zoom-art:url('${G01_SCENE_01_CORE_ART}')"
            role="img"
            aria-label="七码损坏的核心接口与散落维修部件"
          >
            ${this.#collectibleLayersTemplate('zoom')}
            ${this.#installedPartsTemplate()}
            <div class="core-clutter-foreground core-clutter-left" aria-hidden="true"></div>
            <div class="core-clutter-foreground core-clutter-right" aria-hidden="true"></div>
            ${zoomHotspots.map((hotspot) => this.#hotspotTemplate(hotspot)).join('')}
          </div>
          <aside class="repair-sidebar">
            <span>修复步骤</span>
            <h3>${this.#session.sceneState === 'S1' ? '找齐核心部件' : escapeHtml(this.engine.stateDefinition.objective)}</h3>
            <ol>
              <li class="${this.#session.foundItemIds.includes('ITM-G01-104') ? 'is-complete' : ''}">找到清洁刷</li>
              <li class="${this.#session.usedItemIds.includes('ITM-G01-104') ? 'is-complete' : ''}">清理接口</li>
              <li class="${this.#session.usedItemIds.includes('ITM-G01-101') ? 'is-complete' : ''}">安装逻辑芯片</li>
              <li class="${this.#session.usedItemIds.includes('ITM-G01-102') ? 'is-complete' : ''}">接回线路</li>
              <li class="${this.#session.usedItemIds.includes('ITM-G01-103') ? 'is-complete' : ''}">恢复保护</li>
            </ol>
            ${
              repairInventory.length
                ? `
                  <div class="repair-inventory" aria-label="核心修复部件">
                    ${repairInventory.map((item) => this.#inventoryTemplate(item, true)).join('')}
                  </div>
                `
                : '<p>在核心画面中寻找需要的修复部件。</p>'
            }
            ${
              this.#session.sceneState === 'S6' &&
              !this.#session.completedPuzzleIds.includes(CIRCUIT_ID)
                ? '<button class="secondary-action calibration-action" data-action="open-circuit">开始线路校准</button>'
                : ''
            }
          </aside>
        </div>
      </section>
    `
  }

  #installedPartsTemplate(): string {
    const installed: Array<{
      itemId: string
      targetId: string
      className: string
    }> = [
      { itemId: 'ITM-G01-101', targetId: 'HS-G01-0104', className: 'installed-chip' },
      { itemId: 'ITM-G01-102', targetId: 'HS-G01-0105', className: 'installed-connector' },
      { itemId: 'ITM-G01-103', targetId: 'HS-G01-0106', className: 'installed-fuse' },
    ]
    return installed
      .filter(({ itemId }) => this.#session.usedItemIds.includes(itemId))
      .map(({ itemId, targetId, className }) => {
        const item = itemById(this.engine.chapter.items, itemId)
        const target = this.engine.chapter.hotspots.find((hotspot) => hotspot.id === targetId)
        if (!item?.inventoryIcon || !target) return ''
        return `<img class="installed-part ${className}" src="${item.inventoryIcon}" style="${hotspotStyle(target)}" alt="" aria-hidden="true">`
      })
      .join('')
  }

  #dialogueTemplate(dialogue: DialogueLineDefinition): string {
    const xingyu = this.engine.adventure.characters.xingyu
    const qima = this.engine.adventure.characters.qima
    const qimaUnlocked = this.#session.unlockedCharacterIds.includes('qima')
    const typedText =
      this.#typedLineId === dialogue.dialogueId
        ? dialogue.text.slice(0, this.#typedCharacters)
        : ''
    const sequence = this.engine.adventure.dialogueSequences.find(
      (candidate) => candidate.sequenceId === dialogue.sequenceId,
    )

    return `
      <section class="dialogue-stage" aria-label="${escapeHtml(dialogue.speakerName)}的对白">
        <div class="dialogue-portraits" aria-hidden="true">
          ${this.#portraitSlotTemplate('left', xingyu, dialogue)}
          ${
            qimaUnlocked
              ? this.#portraitSlotTemplate('right', qima, dialogue)
              : dialogue.speakerId === 'system'
                ? '<div class="system-portrait is-active"><i></i><i></i><i></i></div>'
                : ''
          }
        </div>
        <div class="dialogue-console">
          <div class="dialogue-heading">
            <span>${escapeHtml(dialogue.speakerName)}</span>
            <div>
              <button data-action="toggle-auto" aria-pressed="${this.#autoPlay}">
                自动 ${this.#autoPlay ? '开' : '关'}
              </button>
              <button data-action="open-history">历史</button>
            </div>
          </div>
          <button
            class="dialogue-copy"
            data-action="advance-dialogue"
            aria-label="${escapeHtml(dialogue.text)}。点击继续"
          >
            <p data-dialogue-text>${escapeHtml(typedText)}</p>
            <i aria-hidden="true"></i>
          </button>
          <div class="dialogue-actions">
            <span>${dialogue.sequence} / ${sequence?.dialogueIds.length ?? dialogue.sequence}</span>
            ${
              sequence?.requiredFirstPlay
                ? '<small>关键剧情</small>'
                : '<button data-action="skip-dialogue">略过本段</button>'
            }
            <button data-action="advance-dialogue">继续</button>
          </div>
        </div>
      </section>
    `
  }

  #portraitSlotTemplate(
    side: 'left' | 'right',
    character: CharacterDefinition | undefined,
    dialogue: DialogueLineDefinition,
  ): string {
    if (!character) return ''
    const key = character.characterId === 'CHAR-G01-XINGYU' ? 'xingyu' : 'qima'
    const active = dialogue.speakerId === key
    const state = active
      ? dialogue.portraitState
      : this.#session.characterStates[key] ?? character.defaultPortrait
    const source =
      character.portraitStates[state] ?? character.portraitStates[character.defaultPortrait]
    return `
      <div class="portrait-slot portrait-${side} ${active ? 'is-active' : ''}">
        <img
          data-character-portrait="${key}"
          data-portrait-state="${escapeHtml(state)}"
          src="${source}"
          alt=""
        >
      </div>
    `
  }

  #characterIntroductionTemplate(characterId: string): string {
    const character = this.engine.adventure.characters[characterId]
    if (!character) return ''
    const state =
      characterId === 'qima'
        ? this.#session.characterStates.qima ?? 'normal'
        : character.defaultPortrait
    const source =
      character.portraitStates[state] ?? character.portraitStates[character.defaultPortrait]
    const goal =
      characterId === 'xingyu'
        ? '恢复拾光号并寻找失联的七码'
        : '恢复导航核心，并与星宇继续完成拾光号任务'
    return `
      <section class="character-introduction" role="dialog" aria-modal="true" aria-labelledby="character-intro-title">
        <div class="character-intro-art">
          <img src="${source}" alt="${escapeHtml(character.displayName)}正式角色形象">
        </div>
        <div class="character-intro-copy">
          <span class="eyebrow">角色档案已解锁</span>
          <h2 id="character-intro-title">${escapeHtml(character.displayName)}</h2>
          <strong>${escapeHtml(character.role)}</strong>
          <p>${escapeHtml(character.shortIntroduction)}</p>
          <dl>
            <div><dt>当前目标</dt><dd>${escapeHtml(goal)}</dd></div>
          </dl>
          <button
            class="primary-action"
            data-action="acknowledge-profile"
            data-character-id="${characterId}"
          >记录角色档案</button>
        </div>
      </section>
    `
  }

  #historyTemplate(): string {
    const history = this.engine.dialogueHistory
    return `
      <div class="modal-backdrop elevated" data-action="close-history"></div>
      <section class="archive-modal history-modal" role="dialog" aria-modal="true" aria-labelledby="history-title">
        <header>
          <div><span class="eyebrow">船内记录</span><h2 id="history-title">对话历史</h2></div>
          <button class="icon-button" data-action="close-history" aria-label="关闭对话历史">×</button>
        </header>
        <ol>
          ${
            history.length
              ? history
                  .map(
                    (dialogue) => `
                      <li>
                        <span>${escapeHtml(dialogue.speakerName)}</span>
                        <p>${escapeHtml(dialogue.text)}</p>
                      </li>
                    `,
                  )
                  .join('')
              : '<li class="archive-empty">还没有可回顾的对话。</li>'
          }
        </ol>
      </section>
    `
  }

  #profilesTemplate(): string {
    return `
      <div class="modal-backdrop elevated" data-action="close-profiles"></div>
      <section class="archive-modal profiles-modal" role="dialog" aria-modal="true" aria-labelledby="profiles-title">
        <header>
          <div><span class="eyebrow">拾光号人员记录</span><h2 id="profiles-title">角色档案</h2></div>
          <button class="icon-button" data-action="close-profiles" aria-label="关闭角色档案">×</button>
        </header>
        <div class="profile-grid">
          ${Object.entries(this.engine.adventure.characters)
            .map(([characterId, character]) =>
              this.#profileCardTemplate(characterId, character),
            )
            .join('')}
        </div>
      </section>
    `
  }

  #profileCardTemplate(characterId: string, character: CharacterDefinition): string {
    const unlocked = this.#session.unlockedCharacterIds.includes(characterId)
    if (!unlocked) {
      return `
        <article class="profile-card is-locked">
          <div class="profile-silhouette" aria-hidden="true"></div>
          <span>档案锁定</span>
          <h3>未知搭档信号</h3>
          <p>恢复失联单元后可查看完整资料。</p>
        </article>
      `
    }
    const state =
      this.#session.characterStates[characterId] ?? character.defaultPortrait
    const source =
      character.portraitStates[state] ?? character.portraitStates[character.defaultPortrait]
    return `
      <article class="profile-card" data-profile-character="${characterId}">
        <img src="${source}" alt="${escapeHtml(character.displayName)}角色形象">
        <div>
          <span>${escapeHtml(character.role)}</span>
          <h3>${escapeHtml(character.fullName)}</h3>
          <p>${escapeHtml(character.personality)}</p>
          <dl>
            ${character.unlockedProfileSections
              .map(
                (section) =>
                  `<div><dt>${escapeHtml(section.label)}</dt><dd>${escapeHtml(section.value)}</dd></div>`,
              )
              .join('')}
          </dl>
        </div>
      </article>
    `
  }

  #circuitTemplate(): string {
    const snapshot = this.#circuit.snapshot
    const nodes = [
      { id: 'white', label: '冷白', className: 'node-white' },
      { id: 'amber', label: '琥珀', className: 'node-amber' },
      { id: 'cyan', label: '青蓝', className: 'node-cyan' },
      { id: 'red', label: '红色', className: 'node-red' },
    ]
    return `
      <div class="modal-backdrop circuit-backdrop"></div>
      <section class="circuit-modal" role="dialog" aria-modal="true" aria-labelledby="circuit-title">
        <header>
          <div>
            <span class="eyebrow">七码启动序列</span>
            <h2 id="circuit-title">线路校准</h2>
          </div>
          <div class="boot-status"><i></i><span>启动中</span></div>
        </header>
        <div class="circuit-clue">
          <span>维护记录</span>
          <strong>按冷白 → 琥珀 → 青蓝 → 红色接通线路</strong>
        </div>
        <div class="circuit-board" data-status="${snapshot.status}">
          <div class="circuit-lines" aria-hidden="true"></div>
          ${nodes
            .map(
              (node) => `
                <button
                  class="circuit-node ${node.className} ${this.#circuit.path.includes(node.id) ? 'is-active' : ''}"
                  data-action="circuit-node"
                  data-node-id="${node.id}"
                  aria-label="接通${node.label}线路"
                  ${snapshot.status === 'failed' ? 'disabled' : ''}
                ><i aria-hidden="true"></i><span>${node.label}</span></button>
              `,
            )
            .join('')}
        </div>
        <footer class="circuit-status">
          <span>${snapshot.status === 'failed' ? '校准中断，可从安全状态重新尝试。' : '依次选择四条维护线路。错误不会清除已完成的修复。'}</span>
          <div class="circuit-progress" aria-label="线路校准进度">
            ${CIRCUIT_SOLUTION.map(
              (_, index) => `<i class="${index < snapshot.progress ? 'is-on' : ''}"></i>`,
            ).join('')}
          </div>
          <small>偏差 ${snapshot.mistakes} / 3</small>
          ${
            snapshot.status === 'failed'
              ? '<button class="secondary-action" data-action="reset-circuit">重新校准</button>'
              : ''
          }
          ${
            snapshot.mistakes >= 2
              ? '<button class="text-action" data-action="assist-circuit">启用辅助校准</button>'
              : ''
          }
        </footer>
      </section>
    `
  }

  #handleClick = (event: MouseEvent): void => {
    const actionElement = (event.target as HTMLElement).closest<HTMLElement>('[data-action]')
    const action = actionElement?.dataset.action
    if (!actionElement || !action) return

    switch (action) {
      case 'begin-scene':
        this.#playShipFailureCue()
        this.#handleResult(this.engine.beginScene())
        break
      case 'advance-dialogue':
        this.#advanceDialogue()
        break
      case 'skip-dialogue':
        this.#handleResult(this.engine.skipDialogue())
        break
      case 'toggle-auto':
        this.#autoPlay = !this.#autoPlay
        this.#render()
        break
      case 'acknowledge-profile': {
        const characterId = actionElement.dataset.characterId
        if (characterId) this.#handleResult(this.engine.acknowledgeCharacterProfile(characterId))
        break
      }
      case 'open-history':
        this.#historyOpen = true
        this.#render()
        break
      case 'close-history':
        this.#historyOpen = false
        this.#render()
        break
      case 'open-profiles':
        this.#profilesOpen = true
        this.#render()
        break
      case 'close-profiles':
        this.#profilesOpen = false
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
      case 'open-zoom':
        this.#zoomOpen = true
        this.#render()
        break
      case 'close-zoom':
        this.#zoomOpen = false
        this.#render()
        break
      case 'distractor':
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
      case 'enter-scene': {
        const sceneId = actionElement.dataset.sceneId
        if (sceneId) this.#handleResult(this.engine.enterScene(sceneId))
        break
      }
      case 'open-circuit':
        this.#circuitOpen = true
        this.#render()
        break
      case 'circuit-node': {
        const nodeId = actionElement.dataset.nodeId
        if (nodeId) this.#handleCircuitNode(nodeId)
        break
      }
      case 'reset-circuit':
        this.#circuit.reset()
        this.#circuit.start()
        this.#persistCircuit()
        this.#render()
        break
      case 'assist-circuit':
        this.#handleResult(this.engine.completePuzzle(CIRCUIT_ID, true))
        break
      default:
        break
    }
  }

  #handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      if (this.#historyOpen) this.#historyOpen = false
      else if (this.#profilesOpen) this.#profilesOpen = false
      else if (this.#zoomOpen && !this.engine.currentDialogue) this.#zoomOpen = false
      this.#render()
      return
    }
    if (event.key.toLowerCase() === 'h') {
      this.#historyOpen = !this.#historyOpen
      this.#render()
      return
    }
    if ((event.key === 'Enter' || event.key === ' ') && this.engine.currentDialogue) {
      event.preventDefault()
      this.#advanceDialogue()
    }
  }

  #advanceDialogue(): void {
    const dialogue = this.engine.currentDialogue
    if (!dialogue) return
    if (this.#typedCharacters < dialogue.text.length) {
      this.#revealDialogue(dialogue)
      return
    }
    this.#handleResult(this.engine.advanceDialogue())
  }

  #useItem(itemId: string, targetId: string): void {
    const result = this.engine.useItem(itemId, targetId)
    if (result.ok) this.#selectedItemId = null
    this.#handleResult(result)
  }

  #requestHint(): void {
    if (Date.now() < this.#hintAvailableAt) return
    const result = this.engine.requestHint(this.#zoomOpen ? 'zoom' : 'scene')
    if (!result) {
      this.#showToast('当前区域的线索已经清理完毕。')
      return
    }

    if (result.hotspot.scope === 'zoom') this.#zoomOpen = true
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
    const areaName = hotspot.scope === 'zoom' ? '局部特写' : '当前舱段'
    if (level === 1) return `一级提示：留意${areaName}的${horizontal}。`
    if (level === 2) return `二级提示：目标位于${areaName}${horizontal}${vertical}。`
    return `三级提示：传感器正在短暂扫描——${hotspot.ariaLabel}。`
  }

  #handleCircuitNode(nodeId: string): void {
    const beforeMistakes = this.#circuit.snapshot.mistakes
    const snapshot = this.#circuit.act(nodeId)
    this.#persistCircuit()
    if (snapshot.status === 'solved') {
      this.#handleResult(this.engine.completePuzzle(CIRCUIT_ID))
      return
    }
    if (snapshot.mistakes > beforeMistakes) {
      this.#showToast('线路顺序不匹配，校准从第一条线路重新开始。')
    } else {
      this.#render()
    }
  }

  #restoreCircuit(): void {
    if (this.#session.completedPuzzleIds.includes(CIRCUIT_ID)) return
    const value = this.#session.puzzleProgress[CIRCUIT_ID]
    if (typeof value !== 'string') {
      this.#circuit.start()
      return
    }
    try {
      const parsed = JSON.parse(value) as { path?: unknown; mistakes?: unknown }
      const path = Array.isArray(parsed.path)
        ? parsed.path.filter((entry): entry is string => typeof entry === 'string')
        : []
      const mistakes = typeof parsed.mistakes === 'number' ? parsed.mistakes : 0
      this.#circuit.restore(path, mistakes)
    } catch {
      this.#circuit.start()
    }
  }

  #persistCircuit(): void {
    this.engine.recordPuzzleProgress(
      CIRCUIT_ID,
      JSON.stringify({
        path: this.#circuit.path,
        mistakes: this.#circuit.snapshot.mistakes,
      }),
    )
  }

  #syncTyping(dialogue: DialogueLineDefinition | null): void {
    if (!dialogue) {
      this.#clearTypingTimers()
      this.#typedLineId = null
      this.#typedCharacters = 0
      return
    }
    if (this.#typedLineId !== dialogue.dialogueId) {
      this.#clearTypingTimers()
      this.#typedLineId = dialogue.dialogueId
      this.#typedCharacters = 0
    }
    if (this.#typedCharacters >= dialogue.text.length || this.#typeTimer) {
      if (this.#typedCharacters >= dialogue.text.length) this.#scheduleAutoAdvance()
      return
    }
    this.#typeTimer = window.setInterval(() => {
      const active = this.engine.currentDialogue
      if (!active || active.dialogueId !== dialogue.dialogueId) {
        this.#clearTypingTimers()
        return
      }
      this.#typedCharacters = Math.min(dialogue.text.length, this.#typedCharacters + 1)
      const text = this.root.querySelector<HTMLElement>('[data-dialogue-text]')
      if (text) text.textContent = dialogue.text.slice(0, this.#typedCharacters)
      if (this.#typedCharacters >= dialogue.text.length) {
        if (this.#typeTimer) window.clearInterval(this.#typeTimer)
        this.#typeTimer = undefined
        this.#scheduleAutoAdvance()
      }
    }, 28)
  }

  #revealDialogue(dialogue: DialogueLineDefinition): void {
    if (this.#typeTimer) window.clearInterval(this.#typeTimer)
    this.#typeTimer = undefined
    this.#typedCharacters = dialogue.text.length
    const text = this.root.querySelector<HTMLElement>('[data-dialogue-text]')
    if (text) text.textContent = dialogue.text
    this.#scheduleAutoAdvance()
  }

  #scheduleAutoAdvance(): void {
    if (!this.#autoPlay || this.#autoTimer || !this.engine.currentDialogue) return
    this.#autoTimer = window.setTimeout(() => {
      this.#autoTimer = undefined
      if (this.engine.currentDialogue && !this.engine.pendingCharacterProfileId) {
        this.engine.advanceDialogue()
      }
    }, 1_150)
  }

  #clearTypingTimers(): void {
    if (this.#typeTimer) window.clearInterval(this.#typeTimer)
    if (this.#autoTimer) window.clearTimeout(this.#autoTimer)
    this.#typeTimer = undefined
    this.#autoTimer = undefined
  }

  #playShipFailureCue(): void {
    try {
      const context = new AudioContext()
      const master = context.createGain()
      master.gain.setValueAtTime(0.0001, context.currentTime)
      master.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.04)
      master.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 1.25)
      master.connect(context.destination)

      const oscillator = context.createOscillator()
      oscillator.type = 'sawtooth'
      oscillator.frequency.setValueAtTime(92, context.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(38, context.currentTime + 1.1)
      oscillator.connect(master)
      oscillator.start()
      oscillator.stop(context.currentTime + 1.3)

      const buffer = context.createBuffer(1, Math.floor(context.sampleRate * 0.7), context.sampleRate)
      const data = buffer.getChannelData(0)
      for (let index = 0; index < data.length; index += 1) {
        data[index] = (Math.random() * 2 - 1) * (1 - index / data.length)
      }
      const noise = context.createBufferSource()
      const noiseGain = context.createGain()
      noiseGain.gain.value = 0.035
      noise.buffer = buffer
      noise.connect(noiseGain).connect(master)
      noise.start()
      window.setTimeout(() => void context.close(), 1_500)
    } catch {
      // Audio support is optional; the visual failure cue remains available.
    }
  }

  #handleResult(result: ActionResult): void {
    if (!result.ok) this.#showToast(result.message)
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
