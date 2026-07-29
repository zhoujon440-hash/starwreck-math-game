import { InventoryDragCoordinator } from '../game/drag'
import type { GameEngine } from '../game/engine'
import { sceneStateOrder } from '../game/engine'
import hosManifest from '../../data/source/g01/scn-g01-01/hos_manifest.json'
import scn02Art from '../../data/source/g01/pr-a/scn-g01-02-art-manifest.json'
import scn03Art from '../../data/source/g01/pr-a/scn-g01-03-art-manifest.json'
import prBArt from '../../data/source/g01/pr-b/runtime-art-manifest.json'
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
  #puzzleOpen = false
  #activeZoomId: string | null = null
  #toast = ''
  #toastTimer: number | undefined
  #hintTimer: number | undefined
  #bootTimer: number | undefined
  #recoveryDialogueTimer: number | undefined
  #cargoDangerTimer: number | undefined
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
      if (
        session.currentSceneId === 'SCN-G01-00' &&
        session.sceneState !== 'S2'
      ) {
        this.#cabinetOpen = false
      }
      if (
        session.currentSceneId === 'SCN-G01-01' &&
        session.sceneState !== 'S2'
      ) {
        this.#cabinetOpen = false
      }
      if (
        session.currentSceneId === 'SCN-G01-01' &&
        session.sceneState !== 'S3'
      ) {
        this.#puzzleOpen = false
      }
      if (
        session.sceneState !== 'S0' ||
        session.dialogue.active ||
        session.dialogue.readDialogueIds.length > 0
      ) {
        this.#introDismissed = true
      }
      if (session.currentSceneId === 'SCN-G01-00' && session.sceneState !== 'S5') {
        this.#completionPanelDismissed = false
      }
      this.#render()
    })
  }

  destroy(): void {
    this.#unsubscribe?.()
    this.#drag.destroy()
    this.root.removeEventListener('click', this.#handleClick)
    if (this.#toastTimer) window.clearTimeout(this.#toastTimer)
    if (this.#hintTimer) window.clearTimeout(this.#hintTimer)
    if (this.#bootTimer) window.clearTimeout(this.#bootTimer)
    if (this.#recoveryDialogueTimer) window.clearTimeout(this.#recoveryDialogueTimer)
    if (this.#cargoDangerTimer) window.clearTimeout(this.#cargoDangerTimer)
  }

  #render(): void {
    const scene = this.engine.currentSceneDefinition
    const isScn00 = scene.id === 'SCN-G01-00'
    const isScn01 = scene.id === 'SCN-G01-01'
    const isScn02 = scene.id === 'SCN-G01-02'
    const isScn03 = scene.id === 'SCN-G01-03'
    const isScn04 = scene.id === 'SCN-G01-04'
    const isScn05 = scene.id === 'SCN-G01-05'
    const isCargoRecovery =
      isScn03 &&
      this.#session.activeRuntimeNodeId === 'SCN-G01-03:cargo-safety-door' &&
      Boolean(this.#session.safeRecovery)
    const isPrBRecovery =
      (isScn04 || isScn05) &&
      this.#session.safeRecovery?.sceneId === scene.id &&
      Boolean(this.#session.activeRuntimeNodeId)
    const state = isCargoRecovery || isPrBRecovery
      ? {
          id: this.#session.sceneState,
          title: isCargoRecovery ? '货舱安全门' : '航行安全节点',
          objective: '确认保留内容，并从失败前进度继续',
          narrative: '当前位于独立保存的安全恢复节点，正确进度未被回滚。',
        }
      : scene.states[this.#session.sceneState]
    const activeHotspots = this.engine.activeHotspots()
    const sceneHotspots = activeHotspots.filter((hotspot) => hotspot.scope !== 'zoom')
    const inventoryItems = this.#session.inventoryItemIds
      .map((itemId) => itemById(this.engine.allItems, itemId))
      .filter((item): item is ItemDefinition => Boolean(item))
    const remainingCurrentItems = activeHotspots.filter(
      (hotspot) =>
        hotspot.kind === 'hidden-item' &&
        hotspot.itemId &&
        !this.#session.foundItemIds.includes(hotspot.itemId),
    )
    const hintCoolingDown = Date.now() < this.#hintAvailableAt
    const dialogue = this.#dialogueRunner.current
    const cabinetVisualState =
      isScn00 && ['S0', 'S1'].includes(this.#session.sceneState) ? 'closed' : 'open'
    const sceneArt =
      isScn00 && ['S0', 'S1'].includes(this.#session.sceneState)
        ? '/assets/g01-cockpit-cabinet-closed-v2.png'
        : scene.art

    this.root.innerHTML = `
      <main
        class="game-shell state-${this.#session.sceneState} scene-${scene.id.toLowerCase()} ${isCargoRecovery || isPrBRecovery ? 'is-cargo-safe-recovery' : ''}"
        data-debug-ui="${DEBUG_UI}"
        data-scene-id="${scene.id}"
        data-runtime-node-id="${escapeHtml(this.#session.activeRuntimeNodeId ?? 'scene-active')}"
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

        <section class="scene-frame" aria-label="${escapeHtml(scene.title)}">
          <div class="scene-canvas" data-scene-canvas>
            <div
              class="scene-art"
              style="background-image:url('${sceneArt}')"
              role="img"
              aria-label="${escapeHtml(
                isScn00
                  ? '断电后的拾光号领航舱，窗外漂浮着飞船残骸'
                  : isScn01
                    ? '受损的拾光号导航核心舱，七码维修托架位于右侧'
                    : isScn02
                      ? '拾光号中控任务台、船内地图与通往货舱的舱门'
                      : isScn03
                        ? '结霜的拾光号货舱，右侧外壳裂口正在漏气'
                        : isScn04
                          ? '布满导航零件的星图室，中央十二星门环有三处缺口'
                          : '拾光号驾驶舱外是密集垃圾雨与一条狭窄安全航线',
              )}"
            ></div>
            <div class="state-layer distribution-box-layer" aria-hidden="true"></div>
            <div class="state-layer lighting-layer" aria-hidden="true"></div>
            ${isScn01 ? this.#scn01SceneLayersTemplate() : ''}
            ${isScn02 || (isScn03 && !isCargoRecovery) ? this.#prASceneLayersTemplate() : ''}
            ${isScn04 || isScn05 ? this.#prBSceneLayersTemplate() : ''}
            <div class="scene-treatment" aria-hidden="true"></div>
            <div class="foreground-layer" aria-hidden="true"></div>
            ${this.#collectibleLayersTemplate('scene')}

            <div class="hotspot-layer pickable-layer">
              ${sceneHotspots.map((hotspot) => this.#hotspotTemplate(hotspot)).join('')}
              ${this.#sceneUtilityTargetsTemplate()}
            </div>
          </div>

          <aside class="objective-card">
            <span>当前目标 · ${DEBUG_UI ? escapeHtml(scene.id) : escapeHtml(isScn00 ? PLAYER_SCENE_TITLE : scene.playerTitle)}</span>
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
            isScn00 && this.#session.sceneState === 'S0' && !this.#introDismissed
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
            isScn00 &&
            this.#session.sceneState === 'S5' &&
            !this.#completionPanelDismissed
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
            isScn00 && this.#session.sceneState === 'S6'
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
                  <button class="secondary-action" data-action="enter-scn01">进入导航核心舱</button>
                </section>
              `
              : ''
          }

          ${
            isScn01 && this.#session.sceneState === 'S5'
              ? `
                <section class="boot-sequence" aria-label="七码启动中" data-boot-sequence="non-skippable">
                  <div class="boot-wave" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
                  <span>正在恢复导航核心</span>
                  <strong>七码启动校验不可跳过</strong>
                  <div class="boot-progress" aria-hidden="true"><i></i></div>
                </section>
              `
              : ''
          }

          ${
            isScn01 &&
            this.#session.sceneState === 'S6' &&
            !dialogue &&
            this.#session.dialogue.readDialogueIds.includes('DLG-G01-0006')
              ? `
                <section class="story-panel complete-panel scn01-complete" aria-labelledby="scn01-complete-title">
                  <span class="eyebrow">${DEBUG_UI ? 'S6 · SCN-G01-01' : '导航搭档恢复'}</span>
                  <h2 id="scn01-complete-title">七码已重新上线</h2>
                  <p>第一段修复完成。中控任务屏已经恢复最低供电，可以建立船上第一张任务单。</p>
                  <div class="completion-stats">
                    <span><b>4</b> 找回组件</span>
                    <span><b>4</b> 完成修复</span>
                    <span><b>0</b> 序章星核</span>
                  </div>
                  <button class="secondary-action" data-action="enter-scn02">前往中控任务台</button>
                </section>
              `
              : ''
          }

          ${
            isScn02 && this.#session.sceneState === 'S6' && !dialogue
              ? `
                <section class="story-panel complete-panel pr-a-complete" aria-labelledby="scn02-complete-title">
                  <span class="eyebrow">${DEBUG_UI ? 'S6 · SCN-G01-02' : '首条任务链已建立'}</span>
                  <h2 id="scn02-complete-title">前往漏气货舱</h2>
                  <p>任务日志已按依赖顺序保存：先测压力，再修补裂口，最后复压。</p>
                  <div class="completion-stats">
                    <span><b>2</b> 关键线索</span>
                    <span><b>1</b> 任务链</span>
                    <span><b>0</b> 序章星核</span>
                  </div>
                  <button class="secondary-action" data-action="enter-scn03">打开货舱安全门</button>
                </section>
              `
              : ''
          }

          ${
            isScn03 && this.#session.sceneState === 'S6' && !dialogue
              ? `
                <section class="story-panel complete-panel pr-a-complete" aria-labelledby="scn03-complete-title">
                  <span class="eyebrow">${DEBUG_UI ? 'S6 · SCN-G01-03' : '首项任务完成'}</span>
                  <h2 id="scn03-complete-title">货舱压力恢复</h2>
                  <p>裂口、测压证据与修复步骤已写入任务日志。导航星图室已经开放。</p>
                  <p data-evidence-summary="leak,pressure,repair">已恢复记录：漏气调查、测压读数与正确修复步骤。</p>
                  <button class="secondary-action" data-action="enter-scn04">前往导航星图室</button>
                  <div class="completion-stats">
                    <span><b>4</b> 维修物</span>
                    <span><b>${Number(this.#session.flags.g01_scn03_soft_failure_count ?? 0)}</b> 安全回退</span>
                    <span><b>0</b> 序章星核</span>
                  </div>
                </section>
              `
              : ''
          }

          ${
            isScn04 && this.#session.sceneState === 'S6' && !dialogue
              ? `
                <section class="story-panel complete-panel pr-a-complete" aria-labelledby="scn04-complete-title">
                  <span class="eyebrow">坐标已锁定</span>
                  <h2 id="scn04-complete-title">锈环星异常信号</h2>
                  <p>三片星图已嵌回，十二星门环完成校准。七码只分析了本场取得的证据。</p>
                  <p data-evidence-summary="star-map,anomaly,coordinate">证据：修复星图、十二处异常、锈环星自删除信号。</p>
                  <button class="secondary-action" data-action="enter-scn05">前往驾驶舱规划航线</button>
                </section>
              `
              : ''
          }

          ${
            isScn05 && this.#session.sceneState === 'S6' && !dialogue
              ? `
                <section class="story-panel complete-panel pr-a-complete" aria-labelledby="scn05-complete-title">
                  <span class="eyebrow">垃圾雨航线完成</span>
                  <h2 id="scn05-complete-title">安全落点已保存</h2>
                  <p>两个安全节点、旁路板和短时窗口已经连成完整路线。</p>
                  <p data-next-boundary="scn-g01-06">下一边界：锈环星求救信号。本PR未加载求救信号、能力授权或后续剧情。</p>
                  <div class="completion-stats"><span><b>0</b> 序章星核</span><span><b>6</b> 永久能力仍锁定</span></div>
                </section>
              `
              : ''
          }

          ${
            isCargoRecovery
              ? this.#cargoRecoveryTemplate(sceneArt)
              : isPrBRecovery
                ? this.#prBRecoveryTemplate(sceneArt)
              : ''
          }

          <div class="scene-counter" aria-live="polite">
            ${
              remainingCurrentItems.length
                ? `<span>当前待发现</span><strong>${remainingCurrentItems.length}</strong>`
                : `<span>${escapeHtml(scene.playerTitle)}状态</span><strong>${escapeHtml(state.title)}</strong>`
            }
          </div>

          ${
            isScn03 &&
            !isCargoRecovery &&
            ['S1', 'S2', 'S3', 'S4'].includes(this.#session.sceneState)
              ? `
                <div class="cargo-danger-status" aria-live="polite">
                  <span>货舱氧压安全窗</span>
                  <strong>${this.#cargoSecondsRemaining()} 秒</strong>
                </div>
              `
              : ''
          }

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

        ${this.#cabinetOpen ? this.#activeZoomTemplate() : ''}
        ${this.#puzzleOpen ? this.#activePuzzleTemplate() : ''}
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
    if (isScn01 && this.#session.sceneState === 'S5') {
      this.#scheduleBootSequence()
    } else if (this.#bootTimer) {
      window.clearTimeout(this.#bootTimer)
      this.#bootTimer = undefined
    }
    if (
      isScn01 &&
      this.#session.sceneState === 'S6' &&
      this.#session.characterStates['CHAR-QIMA'] === 'normal' &&
      !this.#session.dialogue.active &&
      !this.#session.dialogue.readDialogueIds.includes('DLG-G01-0004')
    ) {
      this.#scheduleRecoveryDialogue()
    }
    if (
      isScn03 &&
      ['S1', 'S2', 'S3', 'S4'].includes(this.#session.sceneState) &&
      this.#session.activeRuntimeNodeId !== 'SCN-G01-03:cargo-safety-door'
    ) {
      this.#scheduleCargoDanger()
    } else if (this.#cargoDangerTimer) {
      window.clearTimeout(this.#cargoDangerTimer)
      this.#cargoDangerTimer = undefined
    }
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
        ${hotspot.zoomId ? `data-zoom-id="${hotspot.zoomId}"` : ''}
        ${hotspot.kind === 'use-target' ? `data-drop-target="${hotspot.id}"` : ''}
        aria-label="${escapeHtml(hotspot.ariaLabel)}"
      ><span class="sr-only">${escapeHtml(hotspot.ariaLabel)}</span></button>
    `
  }

  #collectibleLayersTemplate(scope: 'scene' | 'zoom'): string {
    return this.engine.currentSceneDefinition.items
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
    if (
      this.#session.currentSceneId === 'SCN-G01-03' &&
      ['S1', 'S2', 'S3', 'S4'].includes(this.#session.sceneState) &&
      this.#session.activeRuntimeNodeId !== 'SCN-G01-03:cargo-safety-door'
    ) {
      return `
        <button
          class="scene-hotspot danger-soft-fail-hotspot"
          style="left:73%;top:5%;width:10%;height:15%"
          data-action="trigger-cargo-soft-fail"
          aria-label="在氧压临界时继续检查裂口"
        ><span class="sr-only">触发氧压临界安全回退</span></button>
      `
    }
    if (
      ['SCN-G01-04', 'SCN-G01-05'].includes(this.#session.currentSceneId) &&
      ['S1', 'S2', 'S3', 'S4'].includes(this.#session.sceneState) &&
      !this.#session.safeRecovery
    ) {
      return `
        <button
          class="scene-hotspot danger-soft-fail-hotspot"
          style="left:88%;top:5%;width:9%;height:14%"
          data-action="trigger-pr-b-soft-fail"
          aria-label="触发当前危险窗口的安全回退"
        ><span class="sr-only">触发安全回退</span></button>
      `
    }
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
      [
        'ITM-G01-002',
        'ITM-G01-003',
        'RUNTIME-ITM-G01-SCN00-GLOVE',
        'RUNTIME-ITM-G01-SCN00-LABEL',
      ].includes(item.id),
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

  #activeZoomTemplate(): string {
    if (this.#session.currentSceneId === 'SCN-G01-00') return this.#cabinetTemplate()
    if (this.#session.currentSceneId === 'SCN-G01-01') return this.#qimaHosTemplate()
    if (this.#session.currentSceneId === 'SCN-G01-02') return this.#shipMapCloseupTemplate()
    if (this.#session.currentSceneId === 'SCN-G01-03') return this.#cargoHosTemplate()
    if (this.#session.currentSceneId === 'SCN-G01-04') return this.#starMapHosTemplate()
    return ''
  }

  #activePuzzleTemplate(): string {
    if (this.#session.currentSceneId === 'SCN-G01-02') {
      return this.#taskDependencyPuzzleTemplate()
    }
    if (this.#session.currentSceneId === 'SCN-G01-03') {
      return this.#pressurePuzzleTemplate()
    }
    if (this.#session.currentSceneId === 'SCN-G01-04') {
      return this.#starMapPuzzleTemplate()
    }
    return this.#chipPuzzleTemplate()
  }

  #prBSceneLayersTemplate(): string {
    const layers =
      this.#session.currentSceneId === 'SCN-G01-04'
        ? [
            ['g01_star_map_calibrated', '/assets/g01/pr-b/scn-g01-04/states/star-map-calibrated.png'],
            ['g01_scn04_evidence_anomaly', '/assets/g01/pr-b/scn-g01-04/states/anomaly-signal.png'],
            ['g01_star_map_coordinate_locked', '/assets/g01/pr-b/scn-g01-04/states/coordinate-locked.png'],
          ]
        : [
            ['g01_scn05_node_a', '/assets/g01/pr-b/scn-g01-05/states/route-node-a.png'],
            ['g01_scn05_node_b', '/assets/g01/pr-b/scn-g01-05/states/route-node-b.png'],
            ['g01_scn05_bypass_installed', '/assets/g01/pr-b/scn-g01-05/states/bypass-installed.png'],
            ['g01_scn05_window_confirmed', '/assets/g01/pr-b/scn-g01-05/states/route-window-open.png'],
            ['g01_route_complete', '/assets/g01/pr-b/scn-g01-05/states/safe-landing.png'],
          ]
    return layers
      .filter(([flag]) => this.#session.flags[flag] === true)
      .map(([, path]) => `<img class="pr-a-state-layer" src="${path}" alt="" aria-hidden="true">`)
      .join('')
  }

  #prASceneLayersTemplate(): string {
    if (this.#session.currentSceneId === 'SCN-G01-02') {
      const layers = [
        {
          visible: this.#session.sceneState !== 'S0',
          path: '/assets/g01/pr-a/scn-g01-02/states/task-screen-active.png',
        },
        {
          visible:
            this.#session.completedHotspotIds.includes(
              'RUNTIME-HS-G01-02-MAP-KEY',
            ) || ['S5', 'S6'].includes(this.#session.sceneState),
          path: '/assets/g01/pr-a/scn-g01-02/states/ship-map-active.png',
        },
        {
          visible: this.#session.completedHotspotIds.includes('HS-G01-0011'),
          path: '/assets/g01/pr-a/scn-g01-02/states/task-chain-archived.png',
        },
      ]
      return `
        ${scn02Art.clue_search.distractors
          .map(
            (item) => `
              <img
                class="pr-a-scene-object pr-a-distractor"
                src="/${item.runtime_path.replace(/^public\//, '')}"
                style="${areaStyle(item.position)}"
                alt=""
                aria-hidden="true"
              >
            `,
          )
          .join('')}
        ${layers
          .filter((layer) => layer.visible)
          .map(
            (layer) =>
              `<img class="pr-a-state-layer" src="${layer.path}" alt="" aria-hidden="true">`,
          )
          .join('')}
      `
    }

    if (this.#session.currentSceneId === 'SCN-G01-03') {
      const layers = [
        {
          visible: this.#session.usedItemIds.includes('ITM-G01-009'),
          path: '/assets/g01/pr-a/scn-g01-03/states/pressure-gauge-installed.png',
        },
        {
          visible: this.#session.completedHotspotIds.includes('HS-G01-0015-PATCH'),
          path: '/assets/g01/pr-a/scn-g01-03/states/metal-patch-installed.png',
        },
        {
          visible: this.#session.completedHotspotIds.includes('HS-G01-0015-TAPE'),
          path: '/assets/g01/pr-a/scn-g01-03/states/sealing-tape-installed.png',
        },
        {
          visible: this.#session.sceneState === 'S6',
          path: '/assets/g01/pr-a/scn-g01-03/states/cargo-repressurized.png',
        },
      ]
      return layers
        .filter((layer) => layer.visible)
        .map(
          (layer) =>
            `<img class="pr-a-state-layer" src="${layer.path}" alt="" aria-hidden="true">`,
        )
        .join('')
    }
    return ''
  }

  #shipMapCloseupTemplate(): string {
    const mapAsset = `/${scn02Art.closeups[1].runtime_path.replace(/^public\//, '')}`
    return `
      <div class="modal-backdrop" data-action="close-cabinet"></div>
      <section class="zoom-modal pr-a-detail-modal" role="dialog" aria-modal="true" aria-labelledby="ship-map-title">
        <header>
          <div>
            <span class="eyebrow">${DEBUG_UI ? 'HS-G01-0010 · 局部放大' : '船内地图 · 局部放大'}</span>
            <h2 id="ship-map-title">确认货舱路径</h2>
          </div>
          <button class="icon-button" data-action="close-cabinet" aria-label="关闭船内地图">×</button>
        </header>
        <div class="pr-a-detail-art" style="background-image:url('${mapAsset}')" role="img" aria-label="拾光号船内地图台近景"></div>
        <div class="pr-a-detail-copy">
          <strong>已探索：导航核心舱、中控任务台</strong>
          <p>货舱路径仍需星图钥片解锁。后续舱段保持未探索状态。</p>
          <button class="primary-action" data-action="close-cabinet">记下路径</button>
        </div>
      </section>
    `
  }

  #cargoHosTemplate(): string {
    const targets = scn03Art.hos.targets
    const foundCount = targets.filter((target) =>
      this.#session.foundItemIds.includes(target.item_id),
    ).length
    const background = `/${scn03Art.hos.background_asset.replace(/^public\//, '')}`
    const activeTargets = this.engine
      .activeHotspots()
      .filter(
        (hotspot) =>
          hotspot.hosId === 'HOS-G01-003' &&
          hotspot.itemId &&
          !this.#session.foundItemIds.includes(hotspot.itemId),
      )
    return `
      <div class="modal-backdrop" data-action="close-cabinet"></div>
      <section class="zoom-modal pr-a-hos-modal" role="dialog" aria-modal="true" aria-labelledby="cargo-hos-title">
        <header>
          <div>
            <span class="eyebrow">${DEBUG_UI ? 'HOS-G01-003 · 局部放大' : '应急工具箱 · 局部放大'}</span>
            <h2 id="cargo-hos-title">找出可用的维修物</h2>
          </div>
          <div class="zoom-progress">${foundCount} / ${targets.length}</div>
          <button class="icon-button" data-action="close-cabinet" aria-label="关闭货舱应急工具箱">×</button>
        </header>
        <div class="qima-hos-content">
          <div class="qima-hos-art pr-a-hos-art" style="background-image:url('${background}')" role="img" aria-label="货舱应急箱与散落的维修零件">
            ${this.#collectibleLayersTemplate('zoom')}
            ${scn03Art.hos.distractors
              .map(
                (item) => `
                  <img
                    class="hos-distractor-object"
                    src="/${item.runtime_path.replace(/^public\//, '')}"
                    style="${areaStyle(item.position)}"
                    alt=""
                    aria-hidden="true"
                  >
                  <button
                    class="scene-hotspot hos-distractor-hotspot"
                    style="${hotspotStyle({ area: item.position } as HotspotDefinition)}"
                    data-action="cargo-distractor"
                    aria-label="检查${escapeHtml(item.name)}"
                  ><span class="sr-only">${escapeHtml(item.name)}</span></button>
                `,
              )
              .join('')}
            <img
              class="hos-raster-occlusion"
              src="/${scn03Art.hos.foreground_occlusion_asset.replace(/^public\//, '')}"
              alt=""
              aria-hidden="true"
            >
            ${activeTargets.map((hotspot) => this.#hotspotTemplate(hotspot)).join('')}
          </div>
          <aside class="hos-list qima-hos-list">
            <span>${DEBUG_UI ? '正式目标 · HOS-G01-003' : '应急维修物'}</span>
            <h3>观察磨损和接口</h3>
            <ul>
              ${targets
                .map(
                  (target) => `
                    <li class="${this.#session.foundItemIds.includes(target.item_id) ? 'is-found' : ''}">
                      <i aria-hidden="true"></i>
                      ${escapeHtml(target.name)}
                      <small>关键</small>
                    </li>
                  `,
                )
                .join('')}
            </ul>
            <p>普通胶带和破压力表不能用于修复。正确物件拾取后会从场景中独立消失。</p>
          </aside>
        </div>
      </section>
    `
  }

  #starMapHosTemplate(): string {
    const targets = prBArt.hos.targets
    const foundCount = targets.filter((target) =>
      this.#session.foundItemIds.includes(target.item_id),
    ).length
    const activeTargets = this.engine
      .activeHotspots()
      .filter(
        (hotspot) =>
          hotspot.hosId === 'HOS-G01-004' &&
          hotspot.itemId &&
          !this.#session.foundItemIds.includes(hotspot.itemId),
      )
    return `
      <div class="modal-backdrop" data-action="close-cabinet"></div>
      <section class="zoom-modal pr-a-hos-modal" role="dialog" aria-modal="true" aria-labelledby="star-map-hos-title">
        <header>
          <div><span class="eyebrow">星图台 · 局部放大</span><h2 id="star-map-hos-title">找回星图缺失部件</h2></div>
          <div class="zoom-progress">${foundCount} / ${targets.length}</div>
          <button class="icon-button" data-action="close-cabinet" aria-label="关闭星图台近景">×</button>
        </header>
        <div class="qima-hos-content">
          <div class="qima-hos-art pr-b-star-map-hos" role="img" aria-label="散落透明星图板和导航零件的破损星图台">
            ${this.#collectibleLayersTemplate('zoom')}
            ${prBArt.hos.distractors
              .map(
                (item) => `
                  <img class="hos-distractor-object" src="/${item.runtime_path.replace(/^public\//, '')}" style="${areaStyle(
                    item.name === '普通星图页'
                      ? { x: 52, y: 18, width: 16, height: 24 }
                      : { x: 12, y: 64, width: 14, height: 22 },
                    item.name === '普通星图页' ? 9 : -14,
                  )}" alt="" aria-hidden="true">
                  <button class="scene-hotspot hos-distractor-hotspot" style="${hotspotStyle({
                    area:
                      item.name === '普通星图页'
                        ? { x: 52, y: 18, width: 16, height: 24 }
                        : { x: 12, y: 64, width: 14, height: 22 },
                  } as HotspotDefinition)}" data-action="star-map-distractor" aria-label="检查${escapeHtml(item.name)}"><span class="sr-only">${escapeHtml(item.name)}</span></button>
                `,
              )
              .join('')}
            ${activeTargets.map((hotspot) => this.#hotspotTemplate(hotspot)).join('')}
          </div>
          <aside class="hos-list qima-hos-list">
            <span>星图台清单</span><h3>观察边缘与坐标材质</h3>
            <ul>${targets
              .map(
                (target) => `<li class="${this.#session.foundItemIds.includes(target.item_id) ? 'is-found' : ''}"><i aria-hidden="true"></i>${escapeHtml(target.name)}<small>关键</small></li>`,
              )
              .join('')}</ul>
            <p>普通星图页和错误坐标标签会保留。目标物拾取后独立消失并进入背包。</p>
          </aside>
        </div>
      </section>
    `
  }

  #starMapPuzzleTemplate(): string {
    return `
      <div class="modal-backdrop"></div>
      <section class="zoom-modal pr-a-puzzle-modal" role="dialog" aria-modal="true" aria-labelledby="star-map-puzzle-title">
        <header><div><span class="eyebrow">十二星门环 · 近景</span><h2 id="star-map-puzzle-title">校准碎片来源</h2></div>
          <button class="icon-button" data-action="close-puzzle" aria-label="关闭星图校准">×</button>
        </header>
        <div class="pr-b-star-map-puzzle" role="img" aria-label="三片星图已经嵌入机械星门环">
          <img src="/assets/g01/pr-b/scn-g01-04/items/fragment-a_inventory.png" alt="">
          <img src="/assets/g01/pr-b/scn-g01-04/items/fragment-b_inventory.png" alt="">
          <img src="/assets/g01/pr-b/scn-g01-04/items/fragment-c_inventory.png" alt="">
        </div>
        <div class="pr-a-detail-copy"><p>依次比对缺口边缘、同心环和锈环星坐标源。完成一步不会跳过后续分析。</p>
          <button class="primary-action" data-action="calibrate-star-map">锁定十二星门环</button>
        </div>
      </section>
    `
  }

  #taskDependencyPuzzleTemplate(): string {
    const step = Number(this.#session.puzzleProgress.task_dependency_step ?? 0)
    const tasks = ['测量货舱压力', '封堵外壳裂口', '启动货舱复压']
    return `
      <div class="modal-backdrop"></div>
      <section class="zoom-modal pr-a-puzzle-modal" role="dialog" aria-modal="true" aria-labelledby="task-puzzle-title">
        <header>
          <div>
            <span class="eyebrow">${DEBUG_UI ? 'RUNTIME-PUZ-G01-TASK-DEPENDENCY' : '任务屏近景'}</span>
            <h2 id="task-puzzle-title">排列维修依赖</h2>
          </div>
          <button class="icon-button" data-action="close-puzzle" aria-label="关闭任务依赖谜题">×</button>
        </header>
        <div class="pr-a-puzzle-stage task-chain-stage">
          ${tasks
            .map(
              (task, index) => `
                <button
                  class="task-chain-node ${index < step ? 'is-complete' : ''}"
                  data-action="task-chain-step"
                  data-step-index="${index}"
                  ${index < step ? 'disabled' : ''}
                >
                  <span>${index + 1}</span>
                  <strong>${escapeHtml(task)}</strong>
                </button>
              `,
            )
            .join('')}
        </div>
        <div class="pr-a-detail-copy">
          <p>选择下一项必须先满足的任务。错误选择只会清空本次排序，不影响背包或存档。</p>
          <button class="secondary-action" data-action="reset-task-chain">重新排列</button>
        </div>
      </section>
    `
  }

  #pressurePuzzleTemplate(): string {
    const step = Number(this.#session.puzzleProgress.pressure_calibration_step ?? 0)
    const steps = ['隔离外舱读数', '读取裂口压差', '锁定安全时间窗']
    return `
      <div class="modal-backdrop"></div>
      <section class="zoom-modal pr-a-puzzle-modal" role="dialog" aria-modal="true" aria-labelledby="pressure-puzzle-title">
        <header>
          <div>
            <span class="eyebrow">${DEBUG_UI ? 'RUNTIME-PUZ-G01-PRESSURE-CALIBRATION' : '压力表近景'}</span>
            <h2 id="pressure-puzzle-title">完成三段测压</h2>
          </div>
          <button class="icon-button" data-action="close-puzzle" aria-label="关闭压力校准谜题">×</button>
        </header>
        <div class="pr-a-puzzle-stage pressure-stage">
          <img src="/assets/g01/pr-a/scn-g01-03/items/pressure-gauge_inventory.png" alt="安装后的压力表">
          <div class="pressure-steps">
            ${steps
              .map(
                (label, index) => `
                  <button
                    class="${index < step ? 'is-complete' : ''}"
                    data-action="pressure-step"
                    data-step-index="${index}"
                    ${index < step ? 'disabled' : ''}
                  >
                    <i></i><span>${escapeHtml(label)}</span>
                  </button>
                `,
              )
              .join('')}
          </div>
        </div>
        <div class="pr-a-detail-copy">
          <p>依次隔离基准、读取压差、锁定安全窗。完成后，测压证据会写入存档。</p>
        </div>
      </section>
    `
  }

  #cargoRecoveryTemplate(sceneArt: string): string {
    const recovery = this.#session.safeRecovery
    if (!recovery) return ''
    const patchKept = this.#session.completedHotspotIds.includes('HS-G01-0015-PATCH')
    const leakEvidence =
      this.#session.flags.g01_scn03_evidence_leak_confirmed === true
        ? '已取得并保留'
        : '尚未取得'
    const pressureEvidence =
      this.#session.flags.g01_scn03_evidence_pressure_reading === true
        ? '已取得并保留'
        : '尚未取得'
    return `
      <section
        class="cargo-safe-recovery-node"
        data-safe-recovery-node="SCN-G01-03:cargo-safety-door"
        data-pre-failure-state="${recovery.preFailureState}"
        style="--safe-node-art:url('${sceneArt}')"
        aria-labelledby="cargo-recovery-title"
      >
        <div class="cargo-recovery-panel">
          <span class="eyebrow">安全恢复节点 · 已保留失败前状态</span>
          <h2 id="cargo-recovery-title">已退回货舱安全门</h2>
          <p>氧压临界警报已关闭内门。这里只显示真实取得的证据；关键物与正确修复步骤按失败前快照保留。</p>
          <ul>
            <li>关键物：${this.#session.inventoryItemIds.length} 件保留</li>
            <li>漏气证据：${leakEvidence}</li>
            <li>测压证据：${pressureEvidence}</li>
            <li>金属补片：${patchKept ? '已安装并保留' : '未安装'}</li>
            <li>恢复目标：${recovery.preFailureState}</li>
            <li>场景重置：未发生</li>
          </ul>
          <button class="primary-action" data-action="resume-cargo">从 ${recovery.preFailureState} 保留进度继续</button>
        </div>
      </section>
    `
  }

  #prBRecoveryTemplate(sceneArt: string): string {
    const recovery = this.#session.safeRecovery
    if (!recovery) return ''
    const evidenceCount = Object.entries(this.#session.flags).filter(
      ([key, value]) => key.includes('evidence') && value === true,
    ).length
    return `
      <section class="cargo-safe-recovery-node" data-safe-recovery-node="${escapeHtml(recovery.nodeId)}"
        data-pre-failure-state="${recovery.preFailureState}" style="--safe-node-art:url('${sceneArt}')"
        aria-labelledby="pr-b-recovery-title">
        <div class="cargo-recovery-panel">
          <span class="eyebrow">安全恢复节点 · 失败前 ${recovery.preFailureState}</span>
          <h2 id="pr-b-recovery-title">${recovery.sceneId === 'SCN-G01-04' ? '已退回星图台安全位置' : '已退回最近航线安全节点'}</h2>
          <p>危险只中断当前确认动作；背包、找物、谜题、证据和正确步骤均保持失败前状态。</p>
          <ul><li>关键物：${this.#session.inventoryItemIds.length} 件保留</li><li>证据：${evidenceCount} 条保留</li><li>已确认热点：${this.#session.completedHotspotIds.length} 个</li><li>场景重置：未发生</li></ul>
          <button class="primary-action" data-action="resume-pr-b">保留进度继续</button>
        </div>
      </section>
    `
  }

  #scn01SceneLayersTemplate(): string {
    const qimaState =
      this.#session.characterStates['CHAR-QIMA'] ??
      (this.#session.sceneState === 'S0' ? 'offline' : 'damaged')
    const installedLayers = [
      {
        hotspotId: 'HS-G01-0007-CONTACT',
        path: '/assets/g01/scn-g01-01/states/SCN-G01-01_contact_plate_installed.png',
      },
      {
        hotspotId: 'HS-G01-0007-FUSE',
        path: '/assets/g01/scn-g01-01/states/SCN-G01-01_fuse_installed.png',
      },
      {
        hotspotId: 'HS-G01-0008',
        path: '/assets/g01/scn-g01-01/states/SCN-G01-01_chip_installed.png',
      },
      {
        hotspotId: 'RUNTIME-HS-G01-0008-BUCKLE',
        path: '/assets/g01/scn-g01-01/states/SCN-G01-01_buckle_locked.png',
      },
    ]
    const effect =
      qimaState === 'booting'
        ? '/assets/g01/scn-g01-01/states/SCN-G01-01_qima_booting_effect.png'
        : qimaState === 'normal' ||
            qimaState === 'question' ||
            qimaState === 'proud'
          ? '/assets/g01/scn-g01-01/states/SCN-G01-01_qima_normal_effect.png'
          : null

    return `
      <div class="qima-cradle-character" data-qima-state="${escapeHtml(qimaState)}">
        ${this.#portrait.render('CHAR-QIMA', qimaState, 'qima-scene-portrait')}
        ${effect ? `<img class="qima-scene-effect" src="${effect}" alt="" aria-hidden="true">` : ''}
      </div>
      ${installedLayers
        .filter((layer) => this.#session.completedHotspotIds.includes(layer.hotspotId))
        .map(
          (layer) =>
            `<img class="scn01-installed-layer" src="${layer.path}" alt="" aria-hidden="true">`,
        )
        .join('')}
    `
  }

  #qimaHosTemplate(): string {
    const targets = hosManifest.targets
    const foundCount = targets.filter((target) =>
      this.#session.foundItemIds.includes(target.item_id),
    ).length
    const background = `/${hosManifest.background_asset.path.replace(/^public\//, '')}`
    const foreground = `/${hosManifest.foreground_occlusion_asset.path.replace(/^public\//, '')}`

    return `
      <div class="modal-backdrop" data-action="close-cabinet"></div>
      <section class="zoom-modal qima-hos-modal" role="dialog" aria-modal="true" aria-labelledby="qima-hos-title">
        <header>
          <div>
            <span class="eyebrow">${DEBUG_UI ? 'HOS-G01-002 · 局部放大' : '导航零件堆 · 局部放大'}</span>
            <h2 id="qima-hos-title">找回七码的维修组件</h2>
          </div>
          <div class="zoom-progress">${foundCount} / ${targets.length}</div>
          <button class="icon-button" data-action="close-cabinet" aria-label="关闭导航零件堆特写">×</button>
        </header>
        <div class="qima-hos-content">
          <div
            class="qima-hos-art"
            style="background-image:url('${background}')"
            role="img"
            aria-label="线缆、工具袋和导航零件混杂的工作台"
          >
            ${this.#collectibleLayersTemplate('zoom')}
            ${hosManifest.distractors
              .map((distractor) => {
                const path = `/${distractor.runtime_path.replace(/^public\//, '')}`
                return `
                  <img
                    class="hos-distractor-object"
                    src="${path}"
                    style="${areaStyle(distractor.position, 0)}"
                    alt=""
                    aria-hidden="true"
                  >
                  <button
                    class="scene-hotspot hos-distractor-hotspot"
                    style="${hotspotStyle({ area: distractor.position } as HotspotDefinition)}"
                    data-action="hos-distractor"
                    aria-label="检查${escapeHtml(distractor.name)}"
                  ><span class="sr-only">${escapeHtml(distractor.name)}</span></button>
                `
              })
              .join('')}
            ${this.engine
              .activeHotspots()
              .filter(
                (hotspot) =>
                  hotspot.scope === 'zoom' &&
                  hotspot.itemId &&
                  !this.#session.foundItemIds.includes(hotspot.itemId),
              )
              .map((hotspot) => this.#hotspotTemplate(hotspot))
              .join('')}
            <img class="hos-raster-occlusion" src="${foreground}" alt="" aria-hidden="true">
          </div>
          <aside class="hos-list qima-hos-list">
            <span>${DEBUG_UI ? '目标物数据来自 data/source/g01' : '维修组件'}</span>
            <h3>观察形状与材质</h3>
            <ul>
              ${targets
                .map(
                  (target) => `
                    <li class="${this.#session.foundItemIds.includes(target.item_id) ? 'is-found' : ''}">
                      <i aria-hidden="true"></i>
                      ${escapeHtml(target.name)}
                      <small>关键</small>
                    </li>
                  `,
                )
                .join('')}
            </ul>
            <p>干扰物会保留在零件堆中。找到的组件会独立消失并进入背包。</p>
          </aside>
        </div>
      </section>
    `
  }

  #chipPuzzleTemplate(): string {
    const rotation = Number(this.#session.puzzleProgress.chip_rotation ?? 90)
    const chip = this.engine.allItems.find((item) => item.id === 'ITM-G01-004')
    return `
      <div class="modal-backdrop"></div>
      <section class="zoom-modal chip-puzzle-modal" role="dialog" aria-modal="true" aria-labelledby="chip-puzzle-title">
        <header>
          <div>
            <span class="eyebrow">${DEBUG_UI ? 'PUZ-G01-CHIP-ORIENTATION' : '芯片局部检查'}</span>
            <h2 id="chip-puzzle-title">校正触点方向</h2>
          </div>
          <button class="icon-button" data-action="close-puzzle" aria-label="关闭芯片检查">×</button>
        </header>
        <div class="chip-puzzle-stage">
          <div class="chip-socket" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
          <img
            src="${chip?.inventoryIcon ?? ''}"
            alt="七码芯片"
            style="transform:rotate(${rotation}deg)"
            data-chip-rotation="${rotation}"
          >
        </div>
        <div class="chip-puzzle-controls">
          <p>观察芯片下方触点，让它与插槽的四个导向角一致。</p>
          <button class="secondary-action" data-action="rotate-chip">旋转 90°</button>
          <button class="primary-action" data-action="confirm-chip">确认方向</button>
        </div>
      </section>
    `
  }

  #cargoSecondsRemaining(): number {
    const raw = this.#session.flags.g01_scn03_danger_started_at
    const startedAt =
      typeof raw === 'string' && Number.isFinite(Date.parse(raw))
        ? Date.parse(raw)
        : Date.now()
    return Math.max(0, 90 - Math.floor((Date.now() - startedAt) / 1_000))
  }

  #scheduleCargoDanger(): void {
    if (this.#cargoDangerTimer) return
    this.#cargoDangerTimer = window.setTimeout(() => {
      this.#cargoDangerTimer = undefined
      if (
        this.#session.currentSceneId !== 'SCN-G01-03' ||
        !['S1', 'S2', 'S3', 'S4'].includes(this.#session.sceneState) ||
        this.#session.activeRuntimeNodeId === 'SCN-G01-03:cargo-safety-door'
      ) {
        return
      }
      if (this.#cargoSecondsRemaining() <= 0) {
        this.#handleResult(
          this.engine.triggerCargoSoftFailure('oxygen-pressure-timeout'),
        )
        return
      }
      const countdown = this.root.querySelector<HTMLElement>(
        '.cargo-danger-status strong',
      )
      if (countdown) {
        countdown.textContent = `${this.#cargoSecondsRemaining()} 秒`
      }
      this.#scheduleCargoDanger()
    }, 1_000)
  }

  #scheduleBootSequence(): void {
    if (this.#bootTimer) return
    this.#bootTimer = window.setTimeout(() => {
      this.#bootTimer = undefined
      if (
        this.#session.currentSceneId !== 'SCN-G01-01' ||
        this.#session.sceneState !== 'S5'
      ) {
        return
      }
      const result = this.engine.completePuzzle('PUZ-G01-QIMA-BOOT')
      if (!result.ok) {
        this.#handleResult(result)
        return
      }
      this.engine.updateStory((draft) => {
        draft.characterStates['CHAR-QIMA'] = 'normal'
        draft.flags.g01_scn01_complete = true
        draft.flags.g01_qima_online = true
        draft.flags.world_star_core_count = 0
        draft.characterDiscoveries['CHAR-QIMA'] = [
          '在导航核心舱完成离线、受损、启动中到正常的恢复',
          '启动记录显示离线四分十二秒',
        ]
      })
    }, 3_200)
  }

  #scheduleRecoveryDialogue(): void {
    if (this.#recoveryDialogueTimer) return
    this.#recoveryDialogueTimer = window.setTimeout(() => {
      this.#recoveryDialogueTimer = undefined
      if (
        this.#session.currentSceneId === 'SCN-G01-01' &&
        this.#session.sceneState === 'S6' &&
        !this.#session.dialogue.readDialogueIds.includes('DLG-G01-0004')
      ) {
        this.#dialogueRunner.start('DLG-G01-0004')
      }
    }, 700)
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
          if (
            result.ok &&
            ['SCN-G01-03', 'SCN-G01-04'].includes(this.#session.currentSceneId) &&
            this.#session.sceneState !== 'S1'
          ) {
            this.#cabinetOpen = false
            this.#activeZoomId = null
            this.#render()
          }
        }
        break
      }
      case 'advance-dialogue':
        this.#dialogueRunner.advance()
        break
      case 'enter-scn01':
        this.#selectedItemId = null
        this.#cabinetOpen = false
        this.#puzzleOpen = false
        this.#handleResult(this.engine.enterScene('SCN-G01-01'))
        break
      case 'enter-scn02':
        this.#selectedItemId = null
        this.#cabinetOpen = false
        this.#puzzleOpen = false
        this.#activeZoomId = null
        this.#handleResult(this.engine.enterScene('SCN-G01-02'))
        break
      case 'enter-scn03':
        this.#selectedItemId = null
        this.#cabinetOpen = false
        this.#puzzleOpen = false
        this.#activeZoomId = null
        this.#handleResult(this.engine.enterScene('SCN-G01-03'))
        if (!this.#session.dialogue.readDialogueIds.includes('DLG-G01-0009')) {
          this.#dialogueRunner.startTrigger('SCN-G01-03', '进入货舱')
        }
        break
      case 'enter-scn04':
        this.#selectedItemId = null
        this.#cabinetOpen = false
        this.#puzzleOpen = false
        this.#activeZoomId = null
        this.#handleResult(this.engine.enterScene('SCN-G01-04'))
        this.#dialogueRunner.startTrigger('SCN-G01-04', '进入星图室')
        break
      case 'enter-scn05':
        this.#selectedItemId = null
        this.#cabinetOpen = false
        this.#puzzleOpen = false
        this.#activeZoomId = null
        this.#handleResult(this.engine.enterScene('SCN-G01-05'))
        this.#dialogueRunner.startTrigger('SCN-G01-05', '进入驾驶舱')
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
        this.#activeZoomId = actionElement.dataset.zoomId ?? null
        if (
          [
            'PUZ-G01-CHIP-ORIENTATION',
            'RUNTIME-PUZ-G01-TASK-DEPENDENCY',
            'RUNTIME-PUZ-G01-PRESSURE-CALIBRATION',
            'TUT-MECH-002',
          ].includes(this.#activeZoomId ?? '')
        ) {
          this.#puzzleOpen = true
        } else {
          this.#cabinetOpen = true
        }
        this.#render()
        break
      case 'close-cabinet':
        this.#cabinetOpen = false
        this.#activeZoomId = null
        this.#render()
        break
      case 'close-puzzle':
        this.#puzzleOpen = false
        this.#render()
        break
      case 'rotate-chip': {
        const rotation = (Number(this.#session.puzzleProgress.chip_rotation ?? 90) + 90) % 360
        this.engine.updateStory((draft) => {
          draft.puzzleProgress.chip_rotation = rotation
        })
        break
      }
      case 'confirm-chip': {
        const rotation = Number(this.#session.puzzleProgress.chip_rotation ?? 90)
        if (rotation !== 180) {
          this.#showToast('触点方向还没有对齐。旋转芯片后再观察导向角。')
          break
        }
        this.#puzzleOpen = false
        this.#handleResult(this.engine.completePuzzle('PUZ-G01-CHIP-ORIENTATION'))
        break
      }
      case 'task-chain-step': {
        const selected = Number(actionElement.dataset.stepIndex)
        const expected = Number(this.#session.puzzleProgress.task_dependency_step ?? 0)
        if (selected !== expected) {
          this.engine.updateStory((draft) => {
            draft.puzzleProgress.task_dependency_step = 0
          })
          this.#showToast('这项任务还有前置依赖，排序已回到第一步。')
          break
        }
        const nextStep = expected + 1
        this.engine.updateStory((draft) => {
          draft.puzzleProgress.task_dependency_step = nextStep
        })
        if (nextStep === 3) {
          this.#puzzleOpen = false
          this.engine.updateStory((draft) => {
            draft.puzzleProgress.task_dependency_order =
              'pressure>patch>repress'
          })
          this.#handleResult(
            this.engine.completePuzzle('RUNTIME-PUZ-G01-TASK-DEPENDENCY'),
          )
        }
        break
      }
      case 'reset-task-chain':
        this.engine.updateStory((draft) => {
          draft.puzzleProgress.task_dependency_step = 0
        })
        this.#showToast('任务依赖已清空，可以重新排列。')
        break
      case 'pressure-step': {
        const selected = Number(actionElement.dataset.stepIndex)
        const expected = Number(
          this.#session.puzzleProgress.pressure_calibration_step ?? 0,
        )
        if (selected !== expected) {
          this.#showToast('测压顺序不正确；工具和已确认记录没有丢失。')
          break
        }
        const nextStep = expected + 1
        this.engine.updateStory((draft) => {
          draft.puzzleProgress.pressure_calibration_step = nextStep
        })
        if (nextStep === 3) {
          this.#puzzleOpen = false
          this.#handleResult(
            this.engine.completePuzzle(
              'RUNTIME-PUZ-G01-PRESSURE-CALIBRATION',
            ),
          )
        }
        break
      }
      case 'calibrate-star-map':
        this.#puzzleOpen = false
        this.#handleResult(this.engine.completePuzzle('TUT-MECH-002'))
        break
      case 'dismiss-complete':
        this.#completionPanelDismissed = true
        this.#render()
        break
      case 'cabinet-distractor':
        this.#showToast('这是干扰物，不需要收进背包。')
        break
      case 'hos-distractor':
        this.#showToast('这件零件与七码的接口不匹配，留在原处。')
        break
      case 'cargo-distractor':
        this.#showToast('这件物品已经损坏或接口不匹配，留在工具箱里。')
        break
      case 'star-map-distractor':
        this.#showToast('边缘与缺口不匹配，这不是本次修复目标。')
        break
      case 'inspect': {
        const hotspotId = actionElement.dataset.hotspotId
        if (hotspotId) {
          if (
            this.#session.currentSceneId === 'SCN-G01-02' &&
            hotspotId === 'RUNTIME-HS-G01-02-CARGO-ENTRY'
          ) {
            this.#handleResult(this.engine.enterScene('SCN-G01-03'))
            this.#dialogueRunner.startTrigger('SCN-G01-03', '进入货舱')
            break
          }
          const result = this.engine.inspect(hotspotId)
          this.#handleResult(result)
          if (
            result.ok &&
            this.#session.currentSceneId === 'SCN-G01-01' &&
            hotspotId === 'HS-G01-0005'
          ) {
            this.engine.updateStory((draft) => {
              draft.characterStates['CHAR-QIMA'] = 'damaged'
            })
          }
          if (
            result.ok &&
            this.#session.currentSceneId === 'SCN-G01-02' &&
            hotspotId === 'HS-G01-0009'
          ) {
            this.engine.updateStory((draft) => {
              draft.flags.g01_task_log_unlocked = true
            })
            this.#dialogueRunner.startTrigger('SCN-G01-02', '打开任务屏')
          }
          if (
            result.ok &&
            this.#session.currentSceneId === 'SCN-G01-02' &&
            hotspotId === 'HS-G01-0010'
          ) {
            this.#activeZoomId = 'RUNTIME-CLOSEUP-G01-02-MAP'
            this.#cabinetOpen = true
            this.#render()
          }
          if (
            result.ok &&
            this.#session.currentSceneId === 'SCN-G01-03' &&
            hotspotId === 'HS-G01-0013'
          ) {
            this.#dialogueRunner.startTrigger('SCN-G01-03', '进入货舱')
          }
          if (
            result.ok &&
            this.#session.currentSceneId === 'SCN-G01-04' &&
            hotspotId === 'HS-G01-0017'
          ) {
            this.#activeZoomId = 'HOS-G01-004'
            this.#cabinetOpen = true
            this.#render()
          }
          if (
            result.ok &&
            this.#session.currentSceneId === 'SCN-G01-04' &&
            hotspotId === 'HS-G01-0019'
          ) {
            this.#dialogueRunner.startTrigger('SCN-G01-04', '完成异常分析')
          }
          if (
            result.ok &&
            this.#session.currentSceneId === 'SCN-G01-05' &&
            hotspotId === 'HS-G01-0024'
          ) {
            this.#showToast('时间窗口已确认，安全落点保持可用。')
          }
        }
        break
      }
      case 'trigger-cargo-soft-fail':
        this.#handleResult(
          this.engine.triggerCargoSoftFailure('oxygen-pressure-critical'),
        )
        break
      case 'resume-cargo':
        this.#handleResult(this.engine.resumeCargoAfterSoftFailure())
        break
      case 'trigger-pr-b-soft-fail':
        this.#handleResult(
          this.engine.triggerPrBSoftFailure(
            this.#session.currentSceneId === 'SCN-G01-04'
              ? 'star-map-data-glitch'
              : 'garbage-route-window-closed',
          ),
        )
        break
      case 'resume-pr-b':
        this.#handleResult(this.engine.resumePrBAfterSoftFailure())
        break
      case 'hint':
        this.#requestHint()
        break
      case 'restart':
        this.#selectedItemId = null
        this.#cabinetOpen = false
        this.#puzzleOpen = false
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
    if (result.ok) {
      this.#selectedItemId = null
      if (
        this.#session.currentSceneId === 'SCN-G01-01' &&
        this.#session.sceneState === 'S5'
      ) {
        this.engine.updateStory((draft) => {
          draft.characterStates['CHAR-QIMA'] = 'booting'
          draft.puzzleProgress.qima_boot_sequence = 'running'
        })
      }
      if (this.#session.currentSceneId === 'SCN-G01-02') {
        this.engine.updateStory((draft) => {
          if (targetId === 'RUNTIME-HS-G01-02-MAP-KEY') {
            draft.flags.g01_map_unlocked = true
          }
          if (targetId === 'HS-G01-0011') {
            draft.flags.g01_task_log_unlocked = true
            draft.flags.g01_scn02_complete = true
            draft.puzzleProgress.task_chain =
              'measure-pressure>seal-breach>repress-cargo'
          }
        })
        if (
          targetId === 'HS-G01-0011' &&
          !this.#session.dialogue.readDialogueIds.includes('DLG-G01-0008')
        ) {
          this.#dialogueRunner.startTrigger('SCN-G01-02', '任务链建立')
        }
      }
      if (this.#session.currentSceneId === 'SCN-G01-03') {
        this.engine.updateStory((draft) => {
          if (targetId === 'HS-G01-0014') {
            draft.flags.g01_scn03_evidence_pressure_gauge_installed = true
          } else if (targetId === 'HS-G01-0015-PATCH') {
            draft.flags.g01_scn03_patch_installed = true
          } else if (targetId === 'HS-G01-0015-TAPE') {
            draft.flags.g01_scn03_tape_sealed = true
          } else if (targetId === 'HS-G01-0016') {
            draft.flags.g01_cargo_sealed = true
            draft.flags.g01_scn03_complete = true
          }
        })
        if (
          targetId === 'HS-G01-0014' &&
          !this.#session.dialogue.readDialogueIds.includes('DLG-G01-0010')
        ) {
          this.#dialogueRunner.startTrigger('SCN-G01-03', '安装压力表')
        }
        if (
          targetId === 'HS-G01-0016' &&
          !this.#session.dialogue.readDialogueIds.includes('DLG-G01-0011')
        ) {
          this.#dialogueRunner.startTrigger('SCN-G01-03', '复压完成')
        }
      }
    }
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

    if (result.level === 3 && this.#session.currentSceneId !== 'SCN-G01-00') {
      if (result.hotspot.kind === 'hidden-item' && result.hotspot.itemId) {
        window.setTimeout(() => this.#handleResult(this.engine.findItem(result.hotspot.itemId!)), 450)
      } else if (
        result.hotspot.kind === 'use-target' &&
        result.hotspot.requiredItemId
      ) {
        window.setTimeout(
          () =>
            this.#useItem(
              result.hotspot.requiredItemId!,
              result.hotspot.id,
            ),
          450,
        )
      } else if (result.hotspot.kind === 'inspect') {
        window.setTimeout(
          () => this.#handleResult(this.engine.inspect(result.hotspot.id)),
          450,
        )
      } else if (result.hotspot.zoomId === 'PUZ-G01-CHIP-ORIENTATION') {
        this.#puzzleOpen = true
        this.engine.updateStory((draft) => {
          draft.puzzleProgress.chip_rotation = 180
        })
      } else if (
        result.hotspot.zoomId === 'RUNTIME-PUZ-G01-TASK-DEPENDENCY'
      ) {
        this.#puzzleOpen = true
        this.engine.updateStory((draft) => {
          draft.puzzleProgress.task_dependency_step = Math.max(
            1,
            Number(draft.puzzleProgress.task_dependency_step ?? 0),
          )
        })
      } else if (
        result.hotspot.zoomId === 'RUNTIME-PUZ-G01-PRESSURE-CALIBRATION'
      ) {
        this.#puzzleOpen = true
        this.engine.updateStory((draft) => {
          draft.puzzleProgress.pressure_calibration_step = Math.max(
            1,
            Number(draft.puzzleProgress.pressure_calibration_step ?? 0),
          )
        })
      }
    }

    if (this.#hintTimer) window.clearTimeout(this.#hintTimer)
    this.#hintTimer = window.setTimeout(() => {
      this.#hintedHotspotId = null
      this.#render()
    }, 3_800)
    window.setTimeout(() => this.#render(), 7_000)
  }

  #hintCopy(result: HintResult): string {
    const { hotspot, level } = result
    if (this.#session.currentSceneId === 'SCN-G01-04') {
      if (level === 1) return '一级提示：先观察碎片边缘与十二星门环的机械编号。'
      if (level === 2) return '二级提示：锈环星坐标位于反复删除自身的信号源。'
      return '三级提示：七码会替你完成当前星图任务的一步。'
    }
    if (this.#session.currentSceneId === 'SCN-G01-05') {
      if (level === 1) return '一级提示：先连接两个已经确认的安全节点。'
      if (level === 2) return '二级提示：第三航段需要驾驶舱工具槽中的旁路板。'
      return '三级提示：七码会替你完成第一段航线确认。'
    }
    const horizontal =
      hotspot.area.x < 34 ? '左侧' : hotspot.area.x > 66 ? '右侧' : '中央区域'
    const vertical =
      hotspot.area.y < 34 ? '上方' : hotspot.area.y > 66 ? '下方' : '中部'
    const areaNames: Record<string, { scene: string; zoom: string }> = {
      'SCN-G01-00': { scene: '领航舱', zoom: '维修柜' },
      'SCN-G01-01': { scene: '导航核心舱', zoom: '导航零件堆' },
      'SCN-G01-02': { scene: '中控任务台', zoom: '任务屏近景' },
      'SCN-G01-03': { scene: '漏气货舱', zoom: '应急工具箱' },
    }
    const currentArea = areaNames[this.#session.currentSceneId] ?? {
      scene: '当前舱段',
      zoom: '局部近景',
    }
    const areaName = hotspot.scope === 'zoom' ? currentArea.zoom : currentArea.scene
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
