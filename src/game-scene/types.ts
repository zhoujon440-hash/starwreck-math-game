export type SceneCameraMode = 'scene' | 'focus' | 'mechanic' | 'success'

export type SceneObjectState =
  | 'idle'
  | 'hover'
  | 'active'
  | 'dragging'
  | 'installed'
  | 'used'
  | 'completed'
  | 'error'

export type StageArea = {
  x: number
  y: number
  width: number
  height: number
}

export type SceneFocus = {
  x: number
  y: number
  scale: number
}

export type SceneDevicePresentation = {
  id: string
  label: string
  area: StageArea
  focus: SceneFocus
  interaction: 'inspect' | 'mechanic' | 'drop-target'
}

export type SceneWorldPresentation = {
  initial: string
  partial: string
  complete: string
  effect: 'power' | 'signal' | 'timeline' | 'airflow' | 'starmap' | 'route' | 'waveform' | 'horizon' | 'pulse' | 'crane' | 'archive'
}

export type ScenePresentation = {
  sceneId: string
  coordinateSpace: 'percent-16:9'
  device: SceneDevicePresentation
  pickupToastAnchor: { x: number; y: number }
  world: SceneWorldPresentation
}

export type SceneWorldVisualState = 'initial' | 'partial' | 'complete'
