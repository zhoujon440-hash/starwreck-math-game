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
}

export type ItemDefinition = {
  id: string
  name: string
  description: string
  inventoryCrop?: InventoryCrop
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

export type TransitionRecord = {
  from: SceneStateId
  to: SceneStateId
  event: GameEvent
  at: string
}

export type GameSession = {
  version: 1
  chapterId: string
  sceneState: SceneStateId
  foundItemIds: string[]
  inventoryItemIds: string[]
  usedItemIds: string[]
  completedPuzzleIds: string[]
  hintCount: number
  flags: Record<string, boolean>
  transitionLog: TransitionRecord[]
  updatedAt: string
}

export type ActionResult = {
  ok: boolean
  message: string
}

