import type {
  ActionResult,
  ChapterDefinition,
  GameEvent,
  HintResult,
  GameSession,
  HotspotDefinition,
  ItemDefinition,
  SceneDefinition,
  SceneStateId,
} from './types'
import type { SaveRepository } from './save'

type Listener = (session: GameSession) => void

const now = () => new Date().toISOString()
const clone = (session: GameSession): GameSession => structuredClone(session)

const createSession = (chapter: ChapterDefinition): GameSession => ({
  schemaVersion: 2,
  chapterId: chapter.id,
  currentSceneId: 'SCN-G01-00',
  sceneState: chapter.initialState,
  sceneStates: { 'SCN-G01-00': chapter.initialState },
  foundItemIds: [],
  inventoryItemIds: [],
  usedItemIds: [],
  completedHotspotIds: [],
  completedPuzzleIds: [],
  hosProgress: {},
  puzzleProgress: {},
  hintCount: 0,
  hintLevels: {},
  flags: {
    g01_chapter_complete: false,
    g01_handoff_to_g02: false,
    g01_qima_online: false,
    world_star_core_count: 0,
  },
  dialogue: {
    currentDialogueId: null,
    active: false,
    readDialogueIds: [],
  },
  dialogueHistory: [],
  characterStates: {
    'CHAR-XINGYU': 'normal',
    'CHAR-QIMA': 'offline',
  },
  unlockedCharacterIds: [],
  characterDiscoveries: {},
  transitionLog: [],
  updatedAt: now(),
})

export class GameEngine {
  readonly #listeners = new Set<Listener>()
  #session: GameSession

  constructor(
    readonly chapter: ChapterDefinition,
    private readonly saves: SaveRepository,
  ) {
    const restored = saves.load()
    this.#session = restored?.chapterId === chapter.id ? restored : createSession(chapter)

    if (!this.currentSceneDefinition.states[this.#session.sceneState]) {
      this.#session = createSession(chapter)
    }

    if (!this.saves.loadCheckpoint()) {
      this.saves.saveCheckpoint(this.#session)
    }
    this.saves.save(this.#session)
  }

  get snapshot(): GameSession {
    return clone(this.#session)
  }

  get stateDefinition() {
    return this.currentSceneDefinition.states[this.#session.sceneState]
  }

  get currentSceneDefinition(): SceneDefinition {
    if (this.#session.currentSceneId === 'SCN-G01-00') {
      return {
        id: 'SCN-G01-00',
        title: this.chapter.sceneTitle,
        playerTitle: '拾光号熄灯',
        art: '/assets/g01-cockpit.png',
        initialState: this.chapter.initialState,
        states: this.chapter.states,
        items: this.chapter.items,
        hotspots: this.chapter.hotspots,
        transitions: this.chapter.transitions,
      }
    }
    const scene = this.chapter.scenes?.find(
      (candidate) => candidate.id === this.#session.currentSceneId,
    )
    if (!scene) throw new Error(`Unknown scene ${this.#session.currentSceneId}`)
    return scene
  }

  get allItems(): ItemDefinition[] {
    const items = [
      ...this.chapter.items,
      ...(this.chapter.scenes ?? []).flatMap((scene) => scene.items),
    ]
    return [...new Map(items.map((item) => [item.id, item])).values()]
  }

  enterScene(sceneId: string): ActionResult {
    const scene =
      sceneId === 'SCN-G01-00'
        ? {
            id: 'SCN-G01-00',
            initialState: this.chapter.initialState,
            states: this.chapter.states,
          }
        : this.chapter.scenes?.find((candidate) => candidate.id === sceneId)
    if (!scene) return { ok: false, message: '目标舱段尚未开放。' }

    const next = this.#nextSession()
    next.currentSceneId = sceneId
    next.sceneState = next.sceneStates[sceneId] ?? scene.initialState
    next.sceneStates[sceneId] = next.sceneState
    if (sceneId === 'SCN-G01-01') {
      next.characterStates['CHAR-QIMA'] = 'offline'
      next.flags.g01_scn01_entered = true
    }
    this.#commit(next)
    this.saves.saveCheckpoint(next)
    return { ok: true, message: '星宇进入导航核心舱。' }
  }

  subscribe(listener: Listener): () => void {
    this.#listeners.add(listener)
    listener(this.snapshot)
    return () => this.#listeners.delete(listener)
  }

  updateStory(updater: (draft: GameSession) => void): void {
    const next = this.#nextSession()
    updater(next)
    next.flags.world_star_core_count = 0
    next.sceneStates[next.currentSceneId] = next.sceneState
    this.#commit(next)
  }

  activeHotspots(): HotspotDefinition[] {
    return this.currentSceneDefinition.hotspots.filter(
      (hotspot) =>
        hotspot.activeStates.includes(this.#session.sceneState) &&
        (hotspot.requiredCompletedHotspotIds ?? []).every((id) =>
          this.#session.completedHotspotIds.includes(id),
        ),
    )
  }

  start(): ActionResult {
    return this.#dispatch('start', '星宇接管了拾光号的应急权限。')
  }

  findItem(itemId: string): ActionResult {
    if (this.#session.foundItemIds.includes(itemId)) {
      return { ok: false, message: '这件物品已经收进背包。' }
    }

    const hotspot = this.activeHotspots().find(
      (candidate) => candidate.kind === 'hidden-item' && candidate.itemId === itemId,
    )
    const item = this.currentSceneDefinition.items.find(
      (candidate) => candidate.id === itemId,
    )

    if (!hotspot || !item) {
      return { ok: false, message: '这里暂时没有可收集的物品。' }
    }

    const next = this.#nextSession()
    next.foundItemIds.push(itemId)
    if (hotspot.scope === 'zoom') {
      const hosId = hotspot.id.startsWith('HOS-G01-002')
        ? 'HOS-G01-002'
        : 'HOS-G01-001'
      next.hosProgress[hosId] = [
        ...new Set([...(next.hosProgress[hosId] ?? []), itemId]),
      ]
    }
    if (!next.completedHotspotIds.includes(hotspot.id)) {
      next.completedHotspotIds.push(hotspot.id)
    }
    if (item.collectToInventory !== false) next.inventoryItemIds.push(itemId)

    const remaining = this.activeHotspots().filter(
      (candidate) =>
        candidate.kind === 'hidden-item' &&
        candidate.itemId &&
        !next.foundItemIds.includes(candidate.itemId),
    )

    if (remaining.length === 0) {
      this.#applyTransition(next, 'found:all')
    }

    this.#commit(next)
    return { ok: true, message: `${item.name}已放入背包。` }
  }

  useItem(itemId: string, targetId: string): ActionResult {
    if (!this.#session.inventoryItemIds.includes(itemId)) {
      return { ok: false, message: '背包里没有这件物品。' }
    }

    const target = this.activeHotspots().find(
      (hotspot) => hotspot.kind === 'use-target' && hotspot.id === targetId,
    )

    if (!target) {
      return { ok: false, message: '现在还不能在这里使用道具。' }
    }

    if (target.requiredItemId !== itemId) {
      return { ok: false, message: '接口不匹配，再观察一下周围。' }
    }

    const next = this.#nextSession()
    if (target.consumeItem !== false) {
      next.inventoryItemIds = next.inventoryItemIds.filter((id) => id !== itemId)
    }
    if (!next.usedItemIds.includes(itemId)) next.usedItemIds.push(itemId)
    if (!next.completedHotspotIds.includes(target.id)) {
      next.completedHotspotIds.push(target.id)
    }

    const transitioned = this.#applyTransition(next, `use:${itemId}:${targetId}`)
    if (!transitioned) {
      return { ok: false, message: '道具已匹配，但场景规则缺少后续状态。' }
    }

    this.#commit(next)
    return { ok: true, message: '机关响应了，场景状态已改变。' }
  }

  completePuzzle(puzzleId: string): ActionResult {
    if (this.#session.completedPuzzleIds.includes(puzzleId)) {
      return { ok: false, message: '这项谜题已经完成。' }
    }

    const next = this.#nextSession()
    next.completedPuzzleIds.push(puzzleId)
    const transitioned = this.#applyTransition(next, `puzzle:${puzzleId}`)

    if (!transitioned) {
      return { ok: false, message: '谜题完成，但没有配置后续场景状态。' }
    }

    this.#commit(next)
    return { ok: true, message: '电路稳定，新的舱段权限已解锁。' }
  }

  inspect(hotspotId: string): ActionResult {
    const hotspot = this.activeHotspots().find((candidate) => candidate.id === hotspotId)
    if (!hotspot) return { ok: false, message: '这里暂时没有更多线索。' }
    return this.#dispatch(`inspect:${hotspotId}`, '星宇记下了这处异常。')
  }

  requestHint(scope: 'scene' | 'zoom' = 'scene'): HintResult | null {
    const candidates = this.activeHotspots().filter((hotspot) => {
      if ((hotspot.scope ?? 'scene') !== scope) return false
      if (hotspot.kind === 'hidden-item') {
        return Boolean(hotspot.itemId && !this.#session.foundItemIds.includes(hotspot.itemId))
      }
      if (hotspot.kind === 'use-target') {
        return Boolean(
          hotspot.requiredItemId && this.#session.inventoryItemIds.includes(hotspot.requiredItemId),
        )
      }
      return hotspot.kind === 'zoom'
    })

    if (candidates.length === 0) return null

    const next = this.#nextSession()
    const hint = candidates[0]
    if (!hint) return null
    const previousLevel = next.hintLevels[hint.id] ?? 0
    const level = Math.min(3, previousLevel + 1) as 1 | 2 | 3
    next.hintLevels[hint.id] = level
    next.hintCount += 1
    this.#commit(next)
    return { hotspot: hint, level }
  }

  rollbackToCheckpoint(): ActionResult {
    const checkpoint = this.saves.loadCheckpoint()
    if (!checkpoint || checkpoint.chapterId !== this.chapter.id) {
      return { ok: false, message: '没有可用的安全节点。' }
    }
    this.#session = clone(checkpoint)
    this.#session.updatedAt = now()
    this.saves.save(this.#session)
    this.#notify()
    return { ok: true, message: '已回退到最近的安全位置。' }
  }

  reset(): void {
    this.saves.clear()
    this.#session = createSession(this.chapter)
    this.saves.save(this.#session)
    this.saves.saveCheckpoint(this.#session)
    this.#notify()
  }

  #dispatch(event: GameEvent, message: string): ActionResult {
    const next = this.#nextSession()
    if (!this.#applyTransition(next, event)) {
      return { ok: false, message: '当前状态无法执行这个动作。' }
    }
    this.#commit(next)
    return { ok: true, message }
  }

  #nextSession(): GameSession {
    const next = clone(this.#session)
    next.updatedAt = now()
    return next
  }

  #applyTransition(next: GameSession, event: GameEvent): boolean {
    const transition = this.currentSceneDefinition.transitions.find(
      (candidate) => candidate.from === next.sceneState && candidate.event === event,
    )
    if (!transition) return false

    const from = next.sceneState
    next.sceneState = transition.to
    next.sceneStates[next.currentSceneId] = transition.to
    next.transitionLog = [
      ...next.transitionLog.slice(-19),
      { from, to: transition.to, event, at: now() },
    ]
    return true
  }

  #commit(next: GameSession): void {
    next.flags.world_star_core_count = 0
    this.#session = next
    this.saves.save(this.#session)
    if (this.currentSceneDefinition.states[this.#session.sceneState].safeCheckpoint) {
      this.saves.saveCheckpoint(this.#session)
    }
    this.#notify()
  }

  #notify(): void {
    const snapshot = this.snapshot
    this.#listeners.forEach((listener) => listener(snapshot))
  }
}

export const sceneStateOrder: SceneStateId[] = ['S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6']
