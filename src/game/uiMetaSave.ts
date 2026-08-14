import type { StorageLike } from './save'

export const UI_META_VERSION = 1
export const UI_META_STORAGE_KEY = 'starwreck:ui-meta:v1'

export type FontSizeSetting = 'standard' | 'large' | 'extra-large'
export type DialogueSpeedSetting = 'relaxed' | 'standard' | 'quick'

export type TrialUiSettings = {
  fontSize: FontSizeSetting
  dialogueSpeed: DialogueSpeedSetting
  reducedMotion: boolean
}

export type TrialUiMeta = {
  version: 1
  introSeen: boolean
  g02RecapSeen: boolean
  seenCharacterCards: string[]
  seenItemCards: string[]
  settings: TrialUiSettings
  updatedAt: string
}

export interface UiMetaRepository {
  load(): TrialUiMeta
  save(meta: TrialUiMeta): void
  resetProgress(): TrialUiMeta
  clear(): void
  readonly recoveredFromCorruption: boolean
}

const now = () => new Date().toISOString()

export const createDefaultUiMeta = (): TrialUiMeta => ({
  version: UI_META_VERSION,
  introSeen: false,
  g02RecapSeen: false,
  seenCharacterCards: [],
  seenItemCards: [],
  settings: {
    fontSize: 'standard',
    dialogueSpeed: 'standard',
    reducedMotion: false,
  },
  updatedAt: now(),
})

const fontSizes: FontSizeSetting[] = ['standard', 'large', 'extra-large']
const dialogueSpeeds: DialogueSpeedSetting[] = ['relaxed', 'standard', 'quick']

const parseMeta = (raw: string | null): TrialUiMeta | null => {
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as Partial<TrialUiMeta>
    if (value.version !== UI_META_VERSION || typeof value.updatedAt !== 'string') return null
    if (!Array.isArray(value.seenCharacterCards) || !Array.isArray(value.seenItemCards)) {
      return null
    }
    const settings = value.settings
    if (
      !settings ||
      !fontSizes.includes(settings.fontSize) ||
      !dialogueSpeeds.includes(settings.dialogueSpeed) ||
      typeof settings.reducedMotion !== 'boolean'
    ) {
      return null
    }
    return {
      version: UI_META_VERSION,
      introSeen: value.introSeen === true,
      g02RecapSeen: value.g02RecapSeen === true,
      seenCharacterCards: [...new Set(value.seenCharacterCards.filter((id): id is string => typeof id === 'string'))],
      seenItemCards: [...new Set(value.seenItemCards.filter((id): id is string => typeof id === 'string'))],
      settings: { ...settings },
      updatedAt: value.updatedAt,
    }
  } catch {
    return null
  }
}

export class LocalUiMetaRepository implements UiMetaRepository {
  #recoveredFromCorruption = false

  constructor(private readonly storage: StorageLike = window.localStorage) {}

  get recoveredFromCorruption(): boolean {
    return this.#recoveredFromCorruption
  }

  load(): TrialUiMeta {
    const raw = this.storage.getItem(UI_META_STORAGE_KEY)
    const parsed = parseMeta(raw)
    if (parsed) return structuredClone(parsed)
    this.#recoveredFromCorruption = raw !== null
    return createDefaultUiMeta()
  }

  save(meta: TrialUiMeta): void {
    this.#recoveredFromCorruption = false
    this.storage.setItem(
      UI_META_STORAGE_KEY,
      JSON.stringify({ ...structuredClone(meta), version: UI_META_VERSION, updatedAt: now() }),
    )
  }

  resetProgress(): TrialUiMeta {
    const previous = this.load()
    const next = createDefaultUiMeta()
    next.settings = { ...previous.settings }
    this.save(next)
    return next
  }

  clear(): void {
    this.storage.removeItem(UI_META_STORAGE_KEY)
    this.#recoveredFromCorruption = false
  }
}

export class MemoryUiMetaRepository implements UiMetaRepository {
  #meta: TrialUiMeta = createDefaultUiMeta()
  #corrupt = false

  get recoveredFromCorruption(): boolean {
    return this.#corrupt
  }

  load(): TrialUiMeta {
    return structuredClone(this.#meta)
  }

  save(meta: TrialUiMeta): void {
    this.#meta = structuredClone(meta)
    this.#corrupt = false
  }

  resetProgress(): TrialUiMeta {
    const settings = { ...this.#meta.settings }
    this.#meta = createDefaultUiMeta()
    this.#meta.settings = settings
    return this.load()
  }

  clear(): void {
    this.#meta = createDefaultUiMeta()
  }
}

export const applyUiSettings = (settings: TrialUiSettings): void => {
  document.documentElement.dataset.fontSize = settings.fontSize
  document.documentElement.dataset.dialogueSpeed = settings.dialogueSpeed
  document.documentElement.dataset.reducedMotion = String(settings.reducedMotion)
}
