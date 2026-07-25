import type { GameSession } from './types'

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface SaveRepository {
  load(): GameSession | null
  save(session: GameSession): void
  loadCheckpoint(): GameSession | null
  saveCheckpoint(session: GameSession): void
  clear(): void
}

const clone = (session: GameSession): GameSession => structuredClone(session)
export const SAVE_SCHEMA_VERSION = 2

type LegacySession = Omit<Partial<GameSession>, 'schemaVersion'> & {
  schemaVersion?: number
  version?: number
}

const parseSession = (value: string | null): GameSession | null => {
  if (!value) return null

  try {
    const parsed = JSON.parse(value) as LegacySession
    if (![1, SAVE_SCHEMA_VERSION].includes(parsed.schemaVersion ?? parsed.version ?? -1)) return null
    if (typeof parsed.chapterId !== 'string') return null
    if (typeof parsed.sceneState !== 'string' || typeof parsed.updatedAt !== 'string') return null
    if (!Array.isArray(parsed.inventoryItemIds) || !Array.isArray(parsed.foundItemIds)) return null
    const currentSceneId =
      typeof parsed.currentSceneId === 'string' ? parsed.currentSceneId : 'SCN-G01-00'
    return {
      schemaVersion: SAVE_SCHEMA_VERSION,
      chapterId: parsed.chapterId,
      currentSceneId,
      sceneState: parsed.sceneState,
      sceneProgress: parsed.sceneProgress ?? { [currentSceneId]: parsed.sceneState },
      foundItemIds: parsed.foundItemIds,
      inventoryItemIds: parsed.inventoryItemIds,
      usedItemIds: parsed.usedItemIds ?? [],
      completedPuzzleIds: parsed.completedPuzzleIds ?? [],
      puzzleProgress: parsed.puzzleProgress ?? {},
      hintCount: parsed.hintCount ?? 0,
      hintLevels: parsed.hintLevels ?? {},
      flags: {
        ...(parsed.flags ?? {}),
        world_star_core_count: 0,
      },
      currentDialogueId: parsed.currentDialogueId ?? null,
      currentDialogueSequenceId: parsed.currentDialogueSequenceId ?? null,
      readDialogueIds: parsed.readDialogueIds ?? [],
      skippedDialogueIds: parsed.skippedDialogueIds ?? [],
      dialogueHistoryIds: parsed.dialogueHistoryIds ?? [],
      completedDialogueSequenceIds: parsed.completedDialogueSequenceIds ?? [],
      unlockedCharacterIds: parsed.unlockedCharacterIds ?? [],
      shownCharacterProfileIds: parsed.shownCharacterProfileIds ?? [],
      characterStates: parsed.characterStates ?? {
        xingyu: 'normal',
        qima: 'offline',
      },
      transitionLog: (parsed.transitionLog ?? []).map((record) => ({
        ...record,
        sceneId: record.sceneId ?? currentSceneId,
      })),
      updatedAt: parsed.updatedAt,
    }
  } catch {
    return null
  }
}

export class LocalSaveRepository implements SaveRepository {
  readonly #saveKey: string
  readonly #checkpointKey: string
  readonly #legacySaveKey: string
  readonly #legacyCheckpointKey: string

  constructor(
    chapterId: string,
    private readonly storage: StorageLike = window.localStorage,
  ) {
    this.#saveKey = `starwreck:save:${chapterId}:v2`
    this.#checkpointKey = `starwreck:checkpoint:${chapterId}:v2`
    this.#legacySaveKey = `starwreck:save:${chapterId}:v1`
    this.#legacyCheckpointKey = `starwreck:checkpoint:${chapterId}:v1`
  }

  load(): GameSession | null {
    return (
      parseSession(this.storage.getItem(this.#saveKey)) ??
      parseSession(this.storage.getItem(this.#legacySaveKey))
    )
  }

  save(session: GameSession): void {
    this.storage.setItem(this.#saveKey, JSON.stringify(clone(session)))
  }

  loadCheckpoint(): GameSession | null {
    return (
      parseSession(this.storage.getItem(this.#checkpointKey)) ??
      parseSession(this.storage.getItem(this.#legacyCheckpointKey))
    )
  }

  saveCheckpoint(session: GameSession): void {
    this.storage.setItem(this.#checkpointKey, JSON.stringify(clone(session)))
  }

  clear(): void {
    this.storage.removeItem(this.#saveKey)
    this.storage.removeItem(this.#checkpointKey)
    this.storage.removeItem(this.#legacySaveKey)
    this.storage.removeItem(this.#legacyCheckpointKey)
  }
}

export class MemorySaveRepository implements SaveRepository {
  #save: GameSession | null = null
  #checkpoint: GameSession | null = null

  load(): GameSession | null {
    return this.#save ? clone(this.#save) : null
  }

  save(session: GameSession): void {
    this.#save = clone(session)
  }

  loadCheckpoint(): GameSession | null {
    return this.#checkpoint ? clone(this.#checkpoint) : null
  }

  saveCheckpoint(session: GameSession): void {
    this.#checkpoint = clone(session)
  }

  clear(): void {
    this.#save = null
    this.#checkpoint = null
  }
}
