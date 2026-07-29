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
  activeRuntimeNodeId: null,
  safeRecovery: null,
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
    this.#normalizeRestoredSession()

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
    if (next.safeRecovery?.sceneId !== sceneId) {
      next.activeRuntimeNodeId = null
      next.safeRecovery = null
    }
    if (sceneId === 'SCN-G01-01') {
      next.characterStates['CHAR-QIMA'] = 'offline'
      next.flags.g01_scn01_entered = true
    } else if (sceneId === 'SCN-G01-02') {
      next.flags.g01_task_log_unlocked = false
      next.flags.g01_map_unlocked = false
      next.flags.g01_scn02_entered = true
    } else if (sceneId === 'SCN-G01-03') {
      next.flags.g01_scn03_entered = true
      if (!next.safeRecovery) {
        next.flags.g01_scn03_safe_recovery_active = false
        next.flags.g01_scn03_danger_started_at = now()
      }
    }
    this.#commit(next)
    this.saves.saveCheckpoint(next)
    const messages: Record<string, string> = {
      'SCN-G01-00': '星宇返回领航舱。',
      'SCN-G01-01': '星宇进入导航核心舱。',
      'SCN-G01-02': '星宇和七码来到中控任务台。',
      'SCN-G01-03': '星宇从安全舱门进入漏气货舱。',
    }
    return { ok: true, message: messages[sceneId] ?? '已进入目标舱段。' }
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
    if (this.#session.safeRecovery) return []
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
      const hosId =
        hotspot.hosId ??
        (hotspot.id.startsWith('HOS-G01-003')
          ? 'HOS-G01-003'
          : hotspot.id.startsWith('HOS-G01-002')
            ? 'HOS-G01-002'
            : 'HOS-G01-001')
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
    if (puzzleId === 'RUNTIME-PUZ-G01-PRESSURE-CALIBRATION') {
      next.flags.g01_scn03_evidence_pressure_reading = true
      next.puzzleProgress.pressure_reading = 'safe-window-90s'
    }
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
    const next = this.#nextSession()
    if (!this.#applyTransition(next, `inspect:${hotspotId}`)) {
      return { ok: false, message: '当前状态无法执行这个动作。' }
    }
    if (hotspotId === 'HS-G01-0013') {
      next.flags.g01_scn03_evidence_leak_confirmed = true
      next.flags.g01_scn03_danger_started_at = now()
    }
    this.#commit(next)
    return { ok: true, message: '星宇记下了这处异常。' }
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

  triggerCargoSoftFailure(reason: string): ActionResult {
    if (
      this.#session.currentSceneId !== 'SCN-G01-03' ||
      !['S1', 'S2', 'S3', 'S4'].includes(this.#session.sceneState)
    ) {
      return { ok: false, message: '当前没有需要执行的货舱安全回退。' }
    }

    const next = this.#nextSession()
    const preFailureState = next.sceneState as Extract<
      SceneStateId,
      'S1' | 'S2' | 'S3' | 'S4'
    >
    next.safeRecovery = {
      nodeId: 'SCN-G01-03:cargo-safety-door',
      sceneId: 'SCN-G01-03',
      preFailureState,
      reason,
      enteredAt: now(),
    }
    next.activeRuntimeNodeId = next.safeRecovery.nodeId
    next.flags.g01_scn03_safe_recovery_active = true
    next.flags.g01_scn03_last_soft_failure = reason
    next.flags.g01_scn03_soft_failure_count =
      Number(next.flags.g01_scn03_soft_failure_count ?? 0) + 1
    next.flags.world_star_core_count = 0
    this.#commit(next)
    this.saves.saveCheckpoint(next)
    return {
      ok: true,
      message: '氧压警报触发。星宇退回安全舱门；已取得的工具、证据和正确修复步骤全部保留。',
    }
  }

  resumeCargoAfterSoftFailure(): ActionResult {
    if (
      this.#session.currentSceneId !== 'SCN-G01-03' ||
      this.#session.activeRuntimeNodeId !== 'SCN-G01-03:cargo-safety-door' ||
      !this.#session.safeRecovery
    ) {
      return { ok: false, message: '当前不在货舱安全恢复节点。' }
    }
    const recovery = this.#session.safeRecovery
    const next = this.#nextSession()
    const preFailureState = recovery.preFailureState
    next.sceneState = preFailureState
    next.sceneStates['SCN-G01-03'] = preFailureState
    next.activeRuntimeNodeId = null
    next.safeRecovery = null
    next.flags.g01_scn03_safe_recovery_active = false
    next.flags.g01_scn03_retry_available = true
    next.flags.g01_scn03_danger_started_at = now()
    this.#commit(next)
    return { ok: true, message: '安全门已重新开启，可以从保留的进度继续修复。' }
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

  #normalizeRestoredSession(): void {
    this.#session.activeRuntimeNodeId ??= null
    this.#session.safeRecovery ??= null

    const leakWasInvestigated =
      this.#session.completedHotspotIds.includes('HS-G01-0013') ||
      this.#session.transitionLog.some(
        (entry) => entry.event === 'inspect:HS-G01-0013',
      )
    const pressureWasMeasured = this.#session.completedPuzzleIds.includes(
      'RUNTIME-PUZ-G01-PRESSURE-CALIBRATION',
    )
    if (!leakWasInvestigated) {
      this.#session.flags.g01_scn03_evidence_leak_confirmed = false
    }
    if (!pressureWasMeasured) {
      this.#session.flags.g01_scn03_evidence_pressure_reading = false
      delete this.#session.puzzleProgress.pressure_reading
    }

    if (
      this.#session.currentSceneId === 'SCN-G01-03' &&
      this.#session.flags.g01_scn03_safe_recovery_active === true &&
      !this.#session.safeRecovery &&
      ['S1', 'S2', 'S3', 'S4'].includes(this.#session.sceneState)
    ) {
      const preFailureState = this.#session.sceneState as Extract<
        SceneStateId,
        'S1' | 'S2' | 'S3' | 'S4'
      >
      this.#session.safeRecovery = {
        nodeId: 'SCN-G01-03:cargo-safety-door',
        sceneId: 'SCN-G01-03',
        preFailureState,
        reason: 'legacy-save-migration',
        enteredAt: this.#session.updatedAt,
      }
      this.#session.activeRuntimeNodeId = this.#session.safeRecovery.nodeId
    }
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
    next.flags.g01_chapter_complete = false
    next.flags.g01_handoff_to_g02 = false
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
