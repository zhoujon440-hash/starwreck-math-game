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

const parseSession = (value: string | null): GameSession | null => {
  if (!value) return null

  try {
    const parsed = JSON.parse(value) as Partial<GameSession>
    if (parsed.version !== 1 || typeof parsed.chapterId !== 'string') return null
    if (typeof parsed.sceneState !== 'string' || typeof parsed.updatedAt !== 'string') return null
    if (!Array.isArray(parsed.inventoryItemIds) || !Array.isArray(parsed.foundItemIds)) return null
    return parsed as GameSession
  } catch {
    return null
  }
}

export class LocalSaveRepository implements SaveRepository {
  readonly #saveKey: string
  readonly #checkpointKey: string

  constructor(
    chapterId: string,
    private readonly storage: StorageLike = window.localStorage,
  ) {
    this.#saveKey = `starwreck:save:${chapterId}:v1`
    this.#checkpointKey = `starwreck:checkpoint:${chapterId}:v1`
  }

  load(): GameSession | null {
    return parseSession(this.storage.getItem(this.#saveKey))
  }

  save(session: GameSession): void {
    this.storage.setItem(this.#saveKey, JSON.stringify(clone(session)))
  }

  loadCheckpoint(): GameSession | null {
    return parseSession(this.storage.getItem(this.#checkpointKey))
  }

  saveCheckpoint(session: GameSession): void {
    this.storage.setItem(this.#checkpointKey, JSON.stringify(clone(session)))
  }

  clear(): void {
    this.storage.removeItem(this.#saveKey)
    this.storage.removeItem(this.#checkpointKey)
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

