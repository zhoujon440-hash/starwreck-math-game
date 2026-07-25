import type { DialogueEffect, DialogueLineDefinition } from '../content/dialogues'
import type {
  ActionResult,
  AdventureDefinition,
  ChapterDefinition,
  GameEvent,
  GameSession,
  HintResult,
  HotspotDefinition,
  SceneStateId,
} from './types'
import type { SaveRepository } from './save'

type Listener = (session: GameSession) => void
type GameContent = AdventureDefinition | ChapterDefinition

const now = () => new Date().toISOString()
const clone = (session: GameSession): GameSession => structuredClone(session)

const isAdventure = (content: GameContent): content is AdventureDefinition => 'scenes' in content

const normalizeAdventure = (content: GameContent): AdventureDefinition => {
  if (isAdventure(content)) return content
  const sceneId = content.id === 'G01' ? 'SCN-G01-00' : content.id
  return {
    id: content.id,
    title: content.title,
    initialSceneId: sceneId,
    scenes: { [sceneId]: content },
    characters: {},
    dialogues: [],
    dialogueSequences: [],
    storyScenes: [],
  }
}

const createSession = (adventure: AdventureDefinition): GameSession => {
  const initialScene = adventure.scenes[adventure.initialSceneId]
  if (!initialScene) throw new Error(`Missing initial scene: ${adventure.initialSceneId}`)
  return {
    schemaVersion: 2,
    chapterId: adventure.id,
    currentSceneId: adventure.initialSceneId,
    sceneState: initialScene.initialState,
    sceneProgress: { [adventure.initialSceneId]: initialScene.initialState },
    foundItemIds: [],
    inventoryItemIds: [],
    usedItemIds: [],
    completedPuzzleIds: [],
    puzzleProgress: {},
    hintCount: 0,
    hintLevels: {},
    flags: { world_star_core_count: 0 },
    currentDialogueId: null,
    currentDialogueSequenceId: null,
    readDialogueIds: [],
    skippedDialogueIds: [],
    dialogueHistoryIds: [],
    completedDialogueSequenceIds: [],
    unlockedCharacterIds: [],
    shownCharacterProfileIds: [],
    characterStates: { xingyu: 'normal', qima: 'offline' },
    transitionLog: [],
    updatedAt: now(),
  }
}

export class GameEngine {
  readonly #listeners = new Set<Listener>()
  readonly adventure: AdventureDefinition
  #session: GameSession

  constructor(
    content: GameContent,
    private readonly saves: SaveRepository,
  ) {
    this.adventure = normalizeAdventure(content)
    const restored = saves.load()
    this.#session =
      restored?.chapterId === this.adventure.id ? restored : createSession(this.adventure)

    const restoredScene = this.adventure.scenes[this.#session.currentSceneId]
    if (!restoredScene || !restoredScene.states[this.#session.sceneState]) {
      this.#session = createSession(this.adventure)
    }

    if (
      this.#session.currentDialogueId &&
      !this.adventure.dialogues.some(
        (dialogue) => dialogue.dialogueId === this.#session.currentDialogueId,
      )
    ) {
      this.#session.currentDialogueId = null
      this.#session.currentDialogueSequenceId = null
    }

    if (!this.saves.loadCheckpoint()) {
      this.saves.saveCheckpoint(this.#session)
    }
    this.#session.flags.world_star_core_count = 0
    this.saves.save(this.#session)
  }

  get snapshot(): GameSession {
    return clone(this.#session)
  }

  get chapter(): ChapterDefinition {
    const chapter = this.adventure.scenes[this.#session.currentSceneId]
    if (!chapter) throw new Error(`Missing current scene: ${this.#session.currentSceneId}`)
    return chapter
  }

  get stateDefinition() {
    return this.chapter.states[this.#session.sceneState]
  }

  get currentDialogue(): DialogueLineDefinition | null {
    if (!this.#session.currentDialogueId) return null
    return (
      this.adventure.dialogues.find(
        (dialogue) => dialogue.dialogueId === this.#session.currentDialogueId,
      ) ?? null
    )
  }

  get pendingCharacterProfileId(): string | null {
    return (
      this.#session.unlockedCharacterIds.find(
        (characterId) => !this.#session.shownCharacterProfileIds.includes(characterId),
      ) ?? null
    )
  }

  get dialogueHistory(): DialogueLineDefinition[] {
    return this.#session.dialogueHistoryIds
      .map((dialogueId) =>
        this.adventure.dialogues.find((dialogue) => dialogue.dialogueId === dialogueId),
      )
      .filter((dialogue): dialogue is DialogueLineDefinition => Boolean(dialogue))
  }

  subscribe(listener: Listener): () => void {
    this.#listeners.add(listener)
    listener(this.snapshot)
    return () => this.#listeners.delete(listener)
  }

  activeHotspots(): HotspotDefinition[] {
    return this.chapter.hotspots.filter((hotspot) =>
      hotspot.activeStates.includes(this.#session.sceneState),
    )
  }

  beginScene(): ActionResult {
    const next = this.#nextSession()
    if (!this.#openDialogueForTrigger(next, 'scene:begin')) {
      return { ok: false, message: '当前场景已经开始。' }
    }
    this.#commit(next)
    return { ok: true, message: '剧情演出开始。' }
  }

  start(): ActionResult {
    const transition = this.chapter.transitions.some(
      (candidate) => candidate.from === this.#session.sceneState && candidate.event === 'start',
    )
    if (transition) return this.#dispatch('start', '星宇接管了拾光号的应急权限。')
    return this.beginScene()
  }

  advanceDialogue(): ActionResult {
    const line = this.currentDialogue
    if (!line) return { ok: false, message: '当前没有进行中的对白。' }

    const next = this.#nextSession()
    if (!next.readDialogueIds.includes(line.dialogueId)) next.readDialogueIds.push(line.dialogueId)
    next.dialogueHistoryIds = [
      ...next.dialogueHistoryIds.filter((dialogueId) => dialogueId !== line.dialogueId),
      line.dialogueId,
    ].slice(-120)
    this.#applyDialogueEffects(next, line.effects)

    const sequence = this.adventure.dialogueSequences.find(
      (candidate) => candidate.sequenceId === line.sequenceId,
    )
    const currentIndex = sequence?.dialogueIds.indexOf(line.dialogueId) ?? -1
    const nextLine = sequence?.dialogueIds
      .slice(currentIndex + 1)
      .map((dialogueId) =>
        this.adventure.dialogues.find((dialogue) => dialogue.dialogueId === dialogueId),
      )
      .find(
        (dialogue): dialogue is DialogueLineDefinition =>
          Boolean(dialogue && this.#conditionMatches(next, dialogue)),
      )

    if (nextLine) {
      next.currentDialogueId = nextLine.dialogueId
    } else {
      next.currentDialogueId = null
      next.currentDialogueSequenceId = null
      if (
        sequence &&
        !next.completedDialogueSequenceIds.includes(sequence.sequenceId)
      ) {
        next.completedDialogueSequenceIds.push(sequence.sequenceId)
      }
    }

    this.#commit(next)
    return { ok: true, message: nextLine ? '继续对白。' : '对白结束。' }
  }

  skipDialogue(): ActionResult {
    const line = this.currentDialogue
    const sequence = this.adventure.dialogueSequences.find(
      (candidate) => candidate.sequenceId === this.#session.currentDialogueSequenceId,
    )
    if (!line || !sequence) return { ok: false, message: '当前没有可跳过的对白。' }

    const currentIndex = sequence.dialogueIds.indexOf(line.dialogueId)
    const remaining = sequence.dialogueIds
      .slice(Math.max(0, currentIndex))
      .map((dialogueId) =>
        this.adventure.dialogues.find((dialogue) => dialogue.dialogueId === dialogueId),
      )
      .filter(
        (dialogue): dialogue is DialogueLineDefinition =>
          Boolean(dialogue && this.#conditionMatches(this.#session, dialogue)),
      )
    const allRemainingRead = remaining.every((dialogue) =>
      this.#session.readDialogueIds.includes(dialogue.dialogueId),
    )
    if (sequence.requiredFirstPlay && !allRemainingRead) {
      return { ok: false, message: '首次关键剧情需要完整观看。' }
    }
    if (!allRemainingRead && remaining.some((dialogue) => !dialogue.skippable)) {
      return { ok: false, message: '这段关键对白不能略过。' }
    }

    const next = this.#nextSession()
    remaining.forEach((dialogue) => {
      if (!next.readDialogueIds.includes(dialogue.dialogueId)) {
        next.readDialogueIds.push(dialogue.dialogueId)
      }
      if (!next.skippedDialogueIds.includes(dialogue.dialogueId)) {
        next.skippedDialogueIds.push(dialogue.dialogueId)
      }
      next.dialogueHistoryIds.push(dialogue.dialogueId)
      this.#applyDialogueEffects(next, dialogue.effects)
    })
    next.dialogueHistoryIds = next.dialogueHistoryIds.slice(-120)
    next.currentDialogueId = null
    next.currentDialogueSequenceId = null
    if (!next.completedDialogueSequenceIds.includes(sequence.sequenceId)) {
      next.completedDialogueSequenceIds.push(sequence.sequenceId)
    }
    this.#commit(next)
    return { ok: true, message: '已略过可跳过对白。' }
  }

  acknowledgeCharacterProfile(characterId: string): ActionResult {
    if (!this.#session.unlockedCharacterIds.includes(characterId)) {
      return { ok: false, message: '该角色档案尚未解锁。' }
    }
    const next = this.#nextSession()
    if (!next.shownCharacterProfileIds.includes(characterId)) {
      next.shownCharacterProfileIds.push(characterId)
    }
    this.#openDialogueForTrigger(next, `profile:${characterId}:introduced`)
    this.#commit(next)
    return { ok: true, message: '角色档案已记录。' }
  }

  enterScene(sceneId: string): ActionResult {
    const target = this.adventure.scenes[sceneId]
    const storyScene = this.adventure.storyScenes.find((scene) => scene.sceneId === sceneId)
    if (!target || storyScene?.playable === false) {
      return { ok: false, message: '该舱段尚未开放。' }
    }
    if (
      storyScene &&
      Object.entries(storyScene.requiredFlags).some(
        ([key, expected]) => this.#session.flags[key] !== expected,
      )
    ) {
      return { ok: false, message: '还缺少进入该舱段的剧情条件。' }
    }

    const next = this.#nextSession()
    next.currentSceneId = sceneId
    next.sceneState = next.sceneProgress[sceneId] ?? target.initialState
    next.sceneProgress[sceneId] = next.sceneState
    next.currentDialogueId = null
    next.currentDialogueSequenceId = null
    if (sceneId === 'SCN-G01-01' && next.flags.qima_recovered !== true) {
      next.characterStates.qima = 'offline'
    }
    this.#openDialogueForTrigger(next, 'scene:begin')
    this.#commit(next)
    return { ok: true, message: `已进入${storyScene?.title ?? target.sceneTitle}。` }
  }

  findItem(itemId: string): ActionResult {
    if (this.#storyBlocked()) return { ok: false, message: '先完成当前剧情演出。' }
    if (this.#session.foundItemIds.includes(itemId)) {
      return { ok: false, message: '这件物品已经收进背包。' }
    }

    const hotspot = this.activeHotspots().find(
      (candidate) => candidate.kind === 'hidden-item' && candidate.itemId === itemId,
    )
    const item = this.chapter.items.find((candidate) => candidate.id === itemId)

    if (!hotspot || !item) {
      return { ok: false, message: '这里暂时没有可收集的物品。' }
    }

    const next = this.#nextSession()
    next.foundItemIds.push(itemId)
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
    const destination = item.collectToInventory === false ? '已找到' : '已放入背包'
    return { ok: true, message: `${item.name}${destination}。` }
  }

  useItem(itemId: string, targetId: string): ActionResult {
    if (this.#storyBlocked()) return { ok: false, message: '先完成当前剧情演出。' }
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

    const transitioned = this.#applyTransition(next, `use:${itemId}:${targetId}`)
    if (!transitioned) {
      return { ok: false, message: '道具已匹配，但场景规则缺少后续状态。' }
    }

    this.#commit(next)
    return { ok: true, message: '部件安装成功，检修状态已更新。' }
  }

  recordPuzzleProgress(puzzleId: string, value: boolean | number | string): void {
    const next = this.#nextSession()
    next.puzzleProgress[puzzleId] = value
    this.#commit(next)
  }

  completePuzzle(puzzleId: string, skipped = false): ActionResult {
    if (this.#storyBlocked()) return { ok: false, message: '先完成当前剧情演出。' }
    if (this.#session.completedPuzzleIds.includes(puzzleId)) {
      return { ok: false, message: '这项谜题已经完成。' }
    }

    const next = this.#nextSession()
    next.completedPuzzleIds.push(puzzleId)
    next.puzzleProgress[puzzleId] = 'solved'
    if (skipped) next.flags[`puzzle_${puzzleId}_assisted`] = true
    const transitioned = this.#applyTransition(next, `puzzle:${puzzleId}`)

    if (!transitioned) {
      return { ok: false, message: '谜题完成，但没有配置后续场景状态。' }
    }
    this.#openDialogueForTrigger(next, `puzzle:${puzzleId}`)

    this.#commit(next)
    return { ok: true, message: '线路稳定，启动序列继续。' }
  }

  inspect(hotspotId: string): ActionResult {
    if (this.#storyBlocked()) return { ok: false, message: '先完成当前剧情演出。' }
    const hotspot = this.activeHotspots().find((candidate) => candidate.id === hotspotId)
    if (!hotspot) return { ok: false, message: '这里暂时没有更多线索。' }
    return this.#dispatch(`inspect:${hotspotId}`, '星宇记下了这处异常。')
  }

  requestHint(scope: 'scene' | 'zoom' = 'scene'): HintResult | null {
    if (this.#storyBlocked()) return null
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
      return hotspot.kind === 'zoom' || hotspot.kind === 'inspect'
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
    if (!checkpoint || checkpoint.chapterId !== this.adventure.id) {
      return { ok: false, message: '没有可用的安全节点。' }
    }
    this.#session = clone(checkpoint)
    this.#session.flags.world_star_core_count = 0
    this.#session.updatedAt = now()
    this.saves.save(this.#session)
    this.#notify()
    return { ok: true, message: '已回退到最近的安全位置。' }
  }

  reset(): void {
    this.saves.clear()
    this.#session = createSession(this.adventure)
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
    const chapter = this.adventure.scenes[next.currentSceneId]
    const transition = chapter?.transitions.find(
      (candidate) => candidate.from === next.sceneState && candidate.event === event,
    )
    if (!transition) return false

    const from = next.sceneState
    next.sceneState = transition.to
    next.sceneProgress[next.currentSceneId] = transition.to
    next.transitionLog = [
      ...next.transitionLog.slice(-39),
      { sceneId: next.currentSceneId, from, to: transition.to, event, at: now() },
    ]
    this.#openDialogueForTrigger(next, `state:${transition.to}`)
    return true
  }

  #openDialogueForTrigger(next: GameSession, trigger: string): boolean {
    if (next.currentDialogueId) return false
    const sequence = this.adventure.dialogueSequences.find(
      (candidate) =>
        candidate.sceneId === next.currentSceneId &&
        candidate.trigger === trigger &&
        !next.completedDialogueSequenceIds.includes(candidate.sequenceId),
    )
    if (!sequence) return false
    const firstLine = sequence.dialogueIds
      .map((dialogueId) =>
        this.adventure.dialogues.find((dialogue) => dialogue.dialogueId === dialogueId),
      )
      .find(
        (dialogue): dialogue is DialogueLineDefinition =>
          Boolean(dialogue && this.#conditionMatches(next, dialogue)),
      )
    if (!firstLine) return false
    next.currentDialogueSequenceId = sequence.sequenceId
    next.currentDialogueId = firstLine.dialogueId
    return true
  }

  #conditionMatches(session: GameSession, dialogue: DialogueLineDefinition): boolean {
    if (!dialogue.condition) return true
    return session.flags[dialogue.condition.flag] === dialogue.condition.equals
  }

  #applyDialogueEffects(session: GameSession, effects: DialogueEffect[]): void {
    effects.forEach((effect) => {
      if (effect.type === 'set-flag') {
        session.flags[effect.key] =
          effect.key === 'world_star_core_count' ? 0 : effect.value
      }
      if (effect.type === 'unlock-profile') {
        if (!session.unlockedCharacterIds.includes(effect.characterId)) {
          session.unlockedCharacterIds.push(effect.characterId)
        }
        session.flags[`character_profile_${effect.characterId}_unlocked`] = true
      }
      if (effect.type === 'set-character-state') {
        session.characterStates[effect.characterId] = effect.portraitState
      }
    })
    session.flags.world_star_core_count = 0
  }

  #storyBlocked(): boolean {
    return Boolean(this.#session.currentDialogueId || this.pendingCharacterProfileId)
  }

  #commit(next: GameSession): void {
    next.flags.world_star_core_count = 0
    next.sceneProgress[next.currentSceneId] = next.sceneState
    this.#session = next
    this.saves.save(this.#session)
    const state = this.chapter.states[this.#session.sceneState]
    if (state.safeCheckpoint) {
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
