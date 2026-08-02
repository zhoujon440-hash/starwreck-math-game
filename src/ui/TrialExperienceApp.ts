import type { ChapterDefinition, GameSession } from '../game/types'
import { GameEngine } from '../game/engine'
import type { SaveRepository } from '../game/save'
import {
  applyUiSettings,
  type DialogueSpeedSetting,
  type FontSizeSetting,
  type TrialUiMeta,
  type UiMetaRepository,
} from '../game/uiMetaSave'
import { CHAPTER_GUIDES, STORY_INTRO_CARDS } from '../data/trial/story'
import { trialCharacterById } from '../data/trial/characters'
import { trialItemById } from '../data/trial/items'
import { GameView } from './GameView'
import { TitleScreen } from './TitleScreen'
import { StoryIntro } from './StoryIntro'
import { ArchiveView, type ArchiveTab } from './ArchiveView'
import { SettingsView } from './SettingsView'
import { CharacterIntroCard } from './CharacterIntroCard'
import { ItemDetailCard } from './ItemDetailCard'
import { assetPath } from './assetPath'

type ExtendedSaveRepository = SaveRepository & {
  readonly hasStoredSave?: boolean
  readonly recoveredFromCorruption?: boolean
}

type InstallPromptEvent = Event & {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type PendingCard =
  | { kind: 'character'; id: string }
  | { kind: 'item'; id: string; firstPickup: boolean }

const cloneSession = (session: GameSession): GameSession => structuredClone(session)
const ACTIVE_RUNTIME_SESSION_KEY = 'starwreck:trial:runtime-active'
const isG02Context = (sceneId: string): boolean =>
  sceneId === 'G02-BOUNDARY' || sceneId.startsWith('SCN-G02-') || sceneId.includes('G02-ENERGY')

export class TrialExperienceApp {
  readonly #titleScreen = new TitleScreen()
  readonly #storyIntro = new StoryIntro()
  readonly #archiveView = new ArchiveView()
  readonly #settingsView = new SettingsView()
  readonly #characterCard = new CharacterIntroCard()
  readonly #itemCard = new ItemDetailCard()
  #meta: TrialUiMeta
  #storedSession: GameSession | null
  #engine: GameEngine | null = null
  #gameView: GameView | null = null
  #gameSubscription: (() => void) | null = null
  #lastGameSession: GameSession | null = null
  #installPrompt: InstallPromptEvent | null = null
  #screen: 'title' | 'intro' | 'chapter' | 'chapters' | 'archive' | 'settings' | 'credits' | 'confirm-new' | 'game' = 'title'
  #introIndex = 0
  #introReplay = false
  #archiveTab: ArchiveTab = 'world'
  #resetStage = 0
  #libraryOverlay: 'archive' | 'settings' | null = null
  #pendingCards: PendingCard[] = []
  #activeCard: PendingCard | null = null

  constructor(
    private readonly root: HTMLElement,
    private readonly chapter: ChapterDefinition,
    private readonly saves: ExtendedSaveRepository,
    private readonly uiMeta: UiMetaRepository,
  ) {
    this.#storedSession = saves.load()
    this.#meta = uiMeta.load()
  }

  mount(): void {
    this.root.addEventListener('click', this.#handleClick)
    window.addEventListener('beforeinstallprompt', this.#handleInstallPrompt)
    window.addEventListener('appinstalled', this.#handleInstalled)
    this.#migrateLegacyUiMeta()
    applyUiSettings(this.#meta.settings)
    if (sessionStorage.getItem(ACTIVE_RUNTIME_SESSION_KEY) === 'true' && this.#storedSession) {
      this.#startGame()
    } else {
      this.#showTitle()
    }
  }

  destroy(): void {
    this.#destroyGame()
    this.root.removeEventListener('click', this.#handleClick)
    window.removeEventListener('beforeinstallprompt', this.#handleInstallPrompt)
    window.removeEventListener('appinstalled', this.#handleInstalled)
  }

  #migrateLegacyUiMeta(): void {
    const session = this.#storedSession
    if (!session) return
    const legacyUiMissing =
      !this.#meta.introSeen &&
      this.#meta.seenCharacterCards.length === 0 &&
      this.#meta.seenItemCards.length === 0
    if (!legacyUiMissing) return
    this.#meta.introSeen = true
    this.#meta.seenCharacterCards = [
      ...new Set(['CHAR-XINGYU', 'CHAR-QIMA', ...session.unlockedCharacterIds]),
    ]
    this.#meta.seenItemCards = [
      ...new Set([...session.foundItemIds, ...session.inventoryItemIds, ...session.usedItemIds]),
    ]
    this.#meta.g02RecapSeen = isG02Context(session.currentSceneId)
    this.uiMeta.save(this.#meta)
  }

  #showTitle(): void {
    sessionStorage.removeItem(ACTIVE_RUNTIME_SESSION_KEY)
    this.#destroyGame()
    this.#storedSession = this.saves.load()
    this.#screen = 'title'
    this.#libraryOverlay = null
    this.root.innerHTML = this.#titleScreen.render({
      session: this.#storedSession,
      pwaInstallAvailable: Boolean(this.#installPrompt),
      fullscreenAvailable: document.fullscreenEnabled === true,
      saveRecoveredSafely: this.saves.recoveredFromCorruption === true,
      uiMetaRecoveredSafely: this.uiMeta.recoveredFromCorruption,
    })
  }

  #beginIntro(replay = false): void {
    this.#destroyGame()
    this.#screen = 'intro'
    this.#introIndex = 0
    this.#introReplay = replay
    this.#renderIntro()
  }

  #renderIntro(): void {
    this.root.innerHTML = this.#storyIntro.renderCard(
      STORY_INTRO_CARDS[this.#introIndex],
      this.#introIndex,
      STORY_INTRO_CARDS.length,
      this.#introReplay,
    )
  }

  #completeIntro(): void {
    this.#meta.introSeen = true
    this.#meta.seenCharacterCards = [
      ...new Set([...this.#meta.seenCharacterCards, 'CHAR-XINGYU', 'CHAR-QIMA']),
    ]
    this.uiMeta.save(this.#meta)
    if (this.#introReplay) {
      this.#showArchive(false)
      return
    }
    this.#showChapterGuide('G01', 'start')
  }

  #showChapterGuide(chapterId: 'G01' | 'G02', mode: 'start' | 'review' | 'handoff'): void {
    const markup = this.#storyIntro.renderChapter(CHAPTER_GUIDES[chapterId], mode)
    if (mode === 'handoff' && this.#screen === 'game') {
      const overlay = this.#overlayHost()
      overlay.innerHTML = markup
      return
    }
    this.#destroyGame()
    this.#screen = 'chapter'
    this.root.innerHTML = markup
  }

  #showChapters(): void {
    this.#destroyGame()
    this.#screen = 'chapters'
    const g02Unlocked = this.#storedSession?.flags.g01_handoff_to_g02 === true
    this.root.innerHTML = `
      <main class="trial-library-screen chapter-select-screen" data-trial-view="chapters">
        <header><div><span>合法旅程入口</span><h2>章节选择</h2></div><button data-trial-action="title">返回标题页</button></header>
        <div class="chapter-select-grid">
          ${this.#chapterSelectCard('G01', true)}
          ${this.#chapterSelectCard('G02', g02Unlocked)}
          <article class="chapter-select-locked"><span>信号之外</span><h3>后续路线尚未开放</h3><p>七码仍在确认四组能量信号。当前旅程不会越过安全区。</p><button disabled>等待路线确认</button></article>
        </div>
      </main>`
  }

  #chapterSelectCard(chapterId: 'G01' | 'G02', unlocked: boolean): string {
    const guide = CHAPTER_GUIDES[chapterId]
    return `<article class="chapter-select-card ${unlocked ? '' : 'is-locked'}" style="--chapter-card-image:url('${assetPath(guide.image)}')">
      <div></div><span>${guide.label}</span><h3>${guide.title}</h3>
      <p>${unlocked ? guide.summary : '完成拾光号序章并抵达旧屏幕谷外缘后解锁。'}</p>
      <button data-trial-action="chapter-review" data-chapter="${chapterId}" ${unlocked ? '' : 'disabled'}>${unlocked ? '查看章节介绍' : '尚未解锁'}</button>
    </article>`
  }

  #showArchive(overlay: boolean, tab: ArchiveTab = this.#archiveTab): void {
    this.#archiveTab = tab
    const session = this.#engine?.snapshot ?? this.saves.load()
    const markup = this.#archiveView.render(session, this.#meta, tab, overlay)
    if (overlay && this.#screen === 'game') {
      this.#libraryOverlay = 'archive'
      this.#overlayHost().innerHTML = markup
      return
    }
    this.#destroyGame()
    this.#screen = 'archive'
    this.root.innerHTML = markup
  }

  #showSettings(overlay: boolean): void {
    const markup = this.#settingsView.render(this.#meta.settings, this.#resetStage, overlay)
    if (overlay && this.#screen === 'game') {
      this.#libraryOverlay = 'settings'
      this.#overlayHost().innerHTML = markup
      return
    }
    this.#destroyGame()
    this.#screen = 'settings'
    this.root.innerHTML = markup
  }

  #showCredits(): void {
    this.#destroyGame()
    this.#screen = 'credits'
    this.root.innerHTML = `
      <main class="trial-library-screen credits-screen" data-trial-view="credits">
        <header><div><span>制作记录</span><h2>《星骸拾荒者：十二星门》</h2></div><button data-trial-action="title">返回标题页</button></header>
        <div class="credits-grid">
          <article><h3>项目方向</h3><p>互动式图像解谜与冒险游戏。通过找物、背包使用、局部放大和机关谜题推动剧情。</p></article>
          <article><h3>当前旅程</h3><p>G01序章《拾光号：坠落之前》与G02旧屏幕谷前三个任务。</p></article>
          <article><h3>正式资料</h3><p>剧情、角色、场景、道具与运行时资产均来自仓库内已登记的冻结资料和项目负责人授权制作记录。</p></article>
          <article><h3>本机存档</h3><p>本作不建立虚假联网账号。玩家档案、设置和进度保存在当前浏览器设备。</p></article>
        </div>
        <p class="credits-version">STARWRECK-TRIAL-0.2.0</p>
      </main>`
  }

  #showNewGameConfirmation(): void {
    this.#screen = 'confirm-new'
    this.root.innerHTML = `
      <main class="trial-confirm-screen" data-trial-view="new-game-confirm">
        <section><span>新游戏确认</span><h2>覆盖当前本机旅程？</h2>
          <p>继续会清除现有场景、背包、证据与对白进度，然后从故事背景开始。PWA离线资源和显示设置会保留。</p>
          <div><button data-trial-action="title">取消，保留存档</button><button class="danger-action" data-trial-action="new-game-confirm">确认并开始新游戏</button></div>
        </section>
      </main>`
  }

  #startNewGame(): void {
    this.saves.clear()
    this.#meta = this.uiMeta.resetProgress()
    applyUiSettings(this.#meta.settings)
    this.#storedSession = null
    this.#beginIntro(false)
  }

  #startGame(): void {
    this.#destroyGame()
    this.#screen = 'game'
    sessionStorage.setItem(ACTIVE_RUNTIME_SESSION_KEY, 'true')
    this.root.innerHTML = '<main class="trial-game-host" data-trial-view="game"><div data-game-root></div><div class="trial-overlay-host" data-trial-overlay-host></div></main>'
    const gameRoot = this.root.querySelector<HTMLElement>('[data-game-root]')
    if (!gameRoot) throw new Error('Missing game runtime host')
    this.#engine = new GameEngine(this.chapter, this.saves)
    this.#gameView = new GameView(gameRoot, this.#engine, {
      onReturnToTitle: () => this.#showTitle(),
      onOpenArchive: () => this.#showArchive(true),
      onOpenSettings: () => this.#showSettings(true),
      onViewItem: (itemId) => this.#showItemCard(itemId, false),
      onRequestG02Recap: () => {
        if (this.#meta.g02RecapSeen) return false
        this.#showChapterGuide('G02', 'handoff')
        return true
      },
    })
    this.#gameView.mount()
    this.#lastGameSession = this.#engine.snapshot
    this.#gameSubscription = this.#engine.subscribe((session) => this.#observeGameSession(session))
  }

  #observeGameSession(session: GameSession): void {
    const previous = this.#lastGameSession
    this.#lastGameSession = cloneSession(session)
    if (!previous) return

    const priorItems = new Set([...previous.foundItemIds, ...previous.inventoryItemIds, ...previous.usedItemIds])
    const currentItems = [...new Set([...session.foundItemIds, ...session.inventoryItemIds, ...session.usedItemIds])]
    for (const itemId of currentItems) {
      if (!priorItems.has(itemId) && !this.#meta.seenItemCards.includes(itemId) && trialItemById(itemId)) {
        this.#pendingCards.push({ kind: 'item', id: itemId, firstPickup: true })
      }
    }

    for (const characterId of session.unlockedCharacterIds) {
      if (
        !previous.unlockedCharacterIds.includes(characterId) &&
        !this.#meta.seenCharacterCards.includes(characterId) &&
        trialCharacterById(characterId)
      ) {
        this.#pendingCards.push({ kind: 'character', id: characterId })
      }
    }
    this.#showNextCard()
  }

  #showItemCard(itemId: string, firstPickup: boolean): void {
    const item = trialItemById(itemId)
    if (!item) return
    this.#activeCard = { kind: 'item', id: itemId, firstPickup }
    this.#overlayHost().innerHTML = this.#itemCard.render(item, this.#engine?.snapshot ?? this.saves.load(), firstPickup)
  }

  #showCharacterCard(characterId: string): void {
    const character = trialCharacterById(characterId)
    if (!character) return
    this.#activeCard = { kind: 'character', id: characterId }
    this.#overlayHost().innerHTML = this.#characterCard.render(character)
  }

  #showNextCard(): void {
    if (this.#activeCard || this.#libraryOverlay || this.#pendingCards.length === 0) return
    const next = this.#pendingCards.shift()
    if (!next) return
    if (next.kind === 'item') this.#showItemCard(next.id, next.firstPickup)
    else this.#showCharacterCard(next.id)
  }

  #dismissCard(): void {
    if (!this.#activeCard) return
    if (this.#activeCard.kind === 'item') {
      this.#meta.seenItemCards = [...new Set([...this.#meta.seenItemCards, this.#activeCard.id])]
    } else {
      this.#meta.seenCharacterCards = [...new Set([...this.#meta.seenCharacterCards, this.#activeCard.id])]
    }
    this.uiMeta.save(this.#meta)
    this.#activeCard = null
    if (this.#libraryOverlay === 'archive' && this.#screen === 'game') {
      this.#showArchive(true, this.#archiveTab)
    } else if (this.#libraryOverlay === 'settings' && this.#screen === 'game') {
      this.#showSettings(true)
    } else {
      this.#overlayHost().innerHTML = ''
    }
    this.#showNextCard()
  }

  #overlayHost(): HTMLElement {
    let host = this.root.querySelector<HTMLElement>('[data-trial-overlay-host]')
    if (!host) {
      host = document.createElement('div')
      host.className = 'trial-overlay-host'
      host.dataset.trialOverlayHost = ''
      this.root.append(host)
    }
    return host
  }

  #closeLibraryOverlay(): void {
    this.#libraryOverlay = null
    this.#resetStage = 0
    const host = this.root.querySelector<HTMLElement>('[data-trial-overlay-host]')
    if (host) host.innerHTML = ''
    this.#showNextCard()
  }

  #destroyGame(): void {
    this.#gameSubscription?.()
    this.#gameSubscription = null
    this.#gameView?.destroy()
    this.#gameView = null
    this.#engine = null
    this.#lastGameSession = null
    this.#pendingCards = []
    this.#activeCard = null
  }

  #saveMeta(): void {
    this.uiMeta.save(this.#meta)
    applyUiSettings(this.#meta.settings)
  }

  #handleInstallPrompt = (event: Event): void => {
    event.preventDefault()
    this.#installPrompt = event as InstallPromptEvent
    if (this.#screen === 'title') this.#showTitle()
  }

  #handleInstalled = (): void => {
    this.#installPrompt = null
    if (this.#screen === 'title') this.#showTitle()
  }

  #handleClick = (event: MouseEvent): void => {
    const element = (event.target as HTMLElement).closest<HTMLElement>('[data-trial-action]')
    const action = element?.dataset.trialAction
    if (!element || !action || element.matches(':disabled')) return

    switch (action) {
      case 'title': this.#showTitle(); break
      case 'continue': if (this.saves.load()) this.#startGame(); break
      case 'new-game': this.saves.load() ? this.#showNewGameConfirmation() : this.#startNewGame(); break
      case 'new-game-confirm': this.#startNewGame(); break
      case 'chapters': this.#showChapters(); break
      case 'archive': this.#showArchive(false); break
      case 'settings': this.#resetStage = 0; this.#showSettings(false); break
      case 'credits': this.#showCredits(); break
      case 'intro-previous': this.#introIndex = Math.max(0, this.#introIndex - 1); this.#renderIntro(); break
      case 'intro-next':
        if (this.#introIndex >= STORY_INTRO_CARDS.length - 1) this.#completeIntro()
        else { this.#introIndex += 1; this.#renderIntro() }
        break
      case 'intro-skip': this.#completeIntro(); break
      case 'chapter-start': this.#startGame(); break
      case 'chapter-back': this.#showChapters(); break
      case 'chapter-review': {
        const id = element.dataset.chapter
        if (id === 'G01' || id === 'G02') this.#showChapterGuide(id, 'review')
        break
      }
      case 'archive-tab': {
        const tab = element.dataset.tab as ArchiveTab
        if (['world', 'chapters', 'characters', 'items', 'evidence', 'dialogue'].includes(tab)) {
          this.#showArchive(this.#screen === 'game', tab)
        }
        break
      }
      case 'archive-close':
      case 'settings-close':
        if (this.#screen === 'game') this.#closeLibraryOverlay()
        else this.#showTitle()
        break
      case 'replay-intro': this.#beginIntro(true); break
      case 'view-item': if (element.dataset.itemId) this.#showItemCard(element.dataset.itemId, false); break
      case 'view-character': if (element.dataset.characterId) this.#showCharacterCard(element.dataset.characterId); break
      case 'dismiss-card': this.#dismissCard(); break
      case 'setting-font': {
        const value = element.dataset.value as FontSizeSetting
        if (['standard', 'large', 'extra-large'].includes(value)) this.#meta.settings.fontSize = value
        this.#saveMeta(); this.#showSettings(this.#screen === 'game'); break
      }
      case 'setting-dialogue': {
        const value = element.dataset.value as DialogueSpeedSetting
        if (['relaxed', 'standard', 'quick'].includes(value)) this.#meta.settings.dialogueSpeed = value
        this.#saveMeta(); this.#showSettings(this.#screen === 'game'); break
      }
      case 'setting-motion': this.#meta.settings.reducedMotion = !this.#meta.settings.reducedMotion; this.#saveMeta(); this.#showSettings(this.#screen === 'game'); break
      case 'reset-stage-one': this.#resetStage = 1; this.#showSettings(this.#screen === 'game'); break
      case 'reset-stage-two': this.#resetStage = 2; this.#showSettings(this.#screen === 'game'); break
      case 'reset-cancel': this.#resetStage = 0; this.#showSettings(this.#screen === 'game'); break
      case 'reset-confirm':
        this.saves.clear(); this.#meta = this.uiMeta.resetProgress(); this.#resetStage = 0; this.#showTitle(); break
      case 'fullscreen':
        if (!document.fullscreenElement) void document.documentElement.requestFullscreen?.()
        else void document.exitFullscreen?.()
        break
      case 'install-pwa':
        if (this.#installPrompt) { void this.#installPrompt.prompt(); void this.#installPrompt.userChoice.finally(() => { this.#installPrompt = null }) }
        break
      case 'g02-recap-continue':
        this.#meta.g02RecapSeen = true; this.uiMeta.save(this.#meta); this.#closeLibraryOverlay(); this.#gameView?.enterG02Slice(); break
      default: break
    }
  }
}
