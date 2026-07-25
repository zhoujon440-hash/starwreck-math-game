import type { CharacterDefinition } from '../content/characters'
import type {
  DialogueLineDefinition,
  DialogueSequenceDefinition,
} from '../content/dialogues'
import type { G01StorySceneDefinition } from '../content/story/g01-scenes'

export type SceneStateId = 'S0' | 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6'

export type Rectangle = {
  x: number
  y: number
  width: number
  height: number
}

export type SceneStateDefinition = {
  id: SceneStateId
  title: string
  objective: string
  narrative: string
  safeCheckpoint?: boolean
}

export type InventoryCrop = {
  x: number
  y: number
  size: number
  source?: string
}

export type CollectibleLayerDefinition = {
  source: string
  scope: 'scene' | 'zoom'
  area: Rectangle
  rotation?: number
}

export type ItemDefinition = {
  id: string
  name: string
  description: string
  inventoryIcon?: string
  inventoryCrop?: InventoryCrop
  collectToInventory?: boolean
  collectibleLayer?: CollectibleLayerDefinition
}

export type HotspotKind = 'hidden-item' | 'use-target' | 'zoom' | 'inspect'

export type HotspotDefinition = {
  id: string
  kind: HotspotKind
  ariaLabel: string
  area: Rectangle
  activeStates: SceneStateId[]
  itemId?: string
  requiredItemId?: string
  consumeItem?: boolean
  zoomId?: string
  scope?: 'scene' | 'zoom'
}

export type GameEvent =
  | 'start'
  | 'found:all'
  | `use:${string}:${string}`
  | `puzzle:${string}`
  | `inspect:${string}`

export type StateTransition = {
  from: SceneStateId
  event: GameEvent
  to: SceneStateId
}

export type ChapterDefinition = {
  id: string
  title: string
  sceneTitle: string
  protagonist: string
  initialState: SceneStateId
  states: Record<SceneStateId, SceneStateDefinition>
  items: ItemDefinition[]
  hotspots: HotspotDefinition[]
  transitions: StateTransition[]
}

export type AdventureDefinition = {
  id: string
  title: string
  initialSceneId: string
  scenes: Record<string, ChapterDefinition>
  characters: Record<string, CharacterDefinition>
  dialogues: DialogueLineDefinition[]
  dialogueSequences: DialogueSequenceDefinition[]
  storyScenes: G01StorySceneDefinition[]
}

export type TransitionRecord = {
  sceneId: string
  from: SceneStateId
  to: SceneStateId
  event: GameEvent
  at: string
}

export type GameSession = {
  schemaVersion: 2
  chapterId: string
  currentSceneId: string
  sceneState: SceneStateId
  sceneProgress: Record<string, SceneStateId>
  foundItemIds: string[]
  inventoryItemIds: string[]
  usedItemIds: string[]
  completedPuzzleIds: string[]
  puzzleProgress: Record<string, boolean | number | string>
  hintCount: number
  hintLevels: Record<string, number>
  flags: Record<string, boolean | number | string>
  currentDialogueId: string | null
  currentDialogueSequenceId: string | null
  readDialogueIds: string[]
  skippedDialogueIds: string[]
  dialogueHistoryIds: string[]
  completedDialogueSequenceIds: string[]
  unlockedCharacterIds: string[]
  shownCharacterProfileIds: string[]
  characterStates: Record<string, string>
  transitionLog: TransitionRecord[]
  updatedAt: string
}

export type ActionResult = {
  ok: boolean
  message: string
}

export type HintResult = {
  hotspot: HotspotDefinition
  level: 1 | 2 | 3
}
