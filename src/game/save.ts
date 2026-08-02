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

type LegacySession = Partial<GameSession> & { version?: number }

const parseSession = (value: string | null): GameSession | null => {
  if (!value) return null

  try {
    const parsed = JSON.parse(value) as LegacySession
    if (![1, SAVE_SCHEMA_VERSION].includes(parsed.schemaVersion ?? parsed.version ?? -1)) return null
    if (typeof parsed.chapterId !== 'string') return null
    if (typeof parsed.sceneState !== 'string' || typeof parsed.updatedAt !== 'string') return null
    if (!Array.isArray(parsed.inventoryItemIds) || !Array.isArray(parsed.foundItemIds)) return null
    const restoredFlags = parsed.flags ?? {}
    const qimaSearch =
      restoredFlags.g01_scn06_search_authorized === true &&
      restoredFlags.ability_qima_search === true
    const analysis =
      qimaSearch &&
      restoredFlags.g01_scn06_analysis_authorized === true &&
      restoredFlags.ability_analysis === true
    const pathfinding =
      analysis &&
      restoredFlags.g01_scn06_pathfinding_authorized === true &&
      restoredFlags.ability_pathfinding === true
    const restoredSceneId = parsed.currentSceneId ?? 'SCN-G01-00'
    const reachedG02Boundary =
      (restoredSceneId === 'G02-BOUNDARY' ||
        restoredSceneId.startsWith('SCN-G02-') ||
        restoredSceneId === 'RUNTIME-G02-ENERGY-SEARCH-BOUNDARY') &&
      restoredFlags.g01_scn07_complete === true &&
      restoredFlags.g01_landing_scanned === true
    const g02ResourceLabels = Number(restoredFlags.g02_resource_labels ?? 0)

    return {
      schemaVersion: SAVE_SCHEMA_VERSION,
      chapterId: parsed.chapterId,
      currentSceneId: parsed.currentSceneId ?? 'SCN-G01-00',
      sceneState: parsed.sceneState,
      sceneStates: parsed.sceneStates ?? {
        [parsed.currentSceneId ?? 'SCN-G01-00']: parsed.sceneState,
      },
      activeRuntimeNodeId: parsed.activeRuntimeNodeId ?? null,
      safeRecovery: parsed.safeRecovery ?? null,
      foundItemIds: parsed.foundItemIds,
      inventoryItemIds: parsed.inventoryItemIds,
      usedItemIds: parsed.usedItemIds ?? [],
      completedHotspotIds: parsed.completedHotspotIds ?? [],
      completedPuzzleIds: parsed.completedPuzzleIds ?? [],
      hosProgress: parsed.hosProgress ?? {},
      puzzleProgress: parsed.puzzleProgress ?? {},
      hintCount: parsed.hintCount ?? 0,
      hintLevels: parsed.hintLevels ?? {},
      flags: {
        ...restoredFlags,
        g01_chapter_complete: reachedG02Boundary,
        g01_handoff_to_g02: reachedG02Boundary,
        world_star_core_count: 0,
        ability_qima_search: qimaSearch,
        ability_analysis: analysis,
        ability_pathfinding: pathfinding,
        ability_teleport: false,
        ability_shrink: false,
        ability_clone: false,
        g02_intro_scan_done: restoredFlags.g02_intro_scan_done === true,
        g02_almao_rescued: restoredFlags.g02_almao_rescued === true,
        g02_resource_labels: Number.isFinite(g02ResourceLabels)
          ? Math.max(0, Math.min(3, Math.trunc(g02ResourceLabels)))
          : 0,
        g02_archive_restored: restoredFlags.g02_archive_restored === true,
        g02_magnetic_glove_owned: false,
        g02_admin_unlocked: false,
        g02_chapter_complete: false,
      },
      dialogue: parsed.dialogue ?? {
        currentDialogueId: null,
        active: false,
        readDialogueIds: [],
      },
      dialogueHistory: parsed.dialogueHistory ?? [],
      characterStates: parsed.characterStates ?? {
        'CHAR-XINGYU': 'normal',
        'CHAR-QIMA': 'offline',
      },
      unlockedCharacterIds: parsed.unlockedCharacterIds ?? [],
      characterDiscoveries: parsed.characterDiscoveries ?? {},
      transitionLog: parsed.transitionLog ?? [],
      updatedAt: parsed.updatedAt,
    }
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

  get hasStoredSave(): boolean {
    return this.storage.getItem(this.#saveKey) !== null
  }

  get recoveredFromCorruption(): boolean {
    return this.hasStoredSave && parseSession(this.storage.getItem(this.#saveKey)) === null
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
