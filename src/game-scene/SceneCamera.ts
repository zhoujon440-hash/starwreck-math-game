import type { SceneCameraMode, SceneFocus } from './types'

export class SceneCamera {
  #mode: SceneCameraMode = 'scene'
  #targetId: string | null = null
  #focus: SceneFocus = { x: 50, y: 50, scale: 1 }

  get mode(): SceneCameraMode {
    return this.#mode
  }

  get targetId(): string | null {
    return this.#targetId
  }

  get focus(): SceneFocus {
    return this.#focus
  }

  focusOn(targetId: string, focus: SceneFocus, mechanic = false): void {
    this.#targetId = targetId
    this.#focus = focus
    this.#mode = mechanic ? 'mechanic' : 'focus'
  }

  showMechanic(): void {
    if (this.#targetId) this.#mode = 'mechanic'
  }

  showSuccess(): void {
    this.#mode = 'success'
  }

  returnToScene(): void {
    this.#mode = 'scene'
    this.#targetId = null
    this.#focus = { x: 50, y: 50, scale: 1 }
  }

  style(): string {
    return `--camera-x:${this.#focus.x}%;--camera-y:${this.#focus.y}%;--camera-scale:${this.#focus.scale}`
  }
}
