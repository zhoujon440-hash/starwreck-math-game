export type DropFeedback = 'snap' | 'bounce'

export class InteractionController {
  #feedbackTimer: number | undefined

  constructor(private readonly root: HTMLElement) {}

  #targets(): HTMLElement[] {
    const shell = this.root.querySelector<HTMLElement>('.game-shell')
    return shell ? [this.root, shell] : [this.root]
  }

  #set(name: 'dragActive' | 'objectInteraction' | 'dropCandidate' | 'dropFeedback', value: string): void {
    for (const target of this.#targets()) target.dataset[name] = value
  }

  #delete(...names: Array<'dragActive' | 'objectInteraction' | 'dropCandidate' | 'dropFeedback'>): void {
    for (const target of this.#targets()) for (const name of names) delete target.dataset[name]
  }

  begin(itemId: string): void {
    this.#set('dragActive', itemId)
    this.#set('objectInteraction', 'dragging')
  }

  hoverTarget(targetId: string | null): void {
    if (targetId) this.#set('dropCandidate', targetId)
    else this.#delete('dropCandidate')
  }

  finish(success: boolean): DropFeedback {
    this.#delete('dragActive', 'dropCandidate')
    const feedback: DropFeedback = success ? 'snap' : 'bounce'
    this.#set('dropFeedback', feedback)
    this.#set('objectInteraction', success ? 'installed' : 'error')
    if (this.#feedbackTimer) window.clearTimeout(this.#feedbackTimer)
    this.#feedbackTimer = window.setTimeout(() => {
      this.#delete('dropFeedback', 'objectInteraction')
    }, success ? 1200 : 900)
    return feedback
  }

  cancel(): void {
    this.#delete('dragActive', 'dropCandidate', 'objectInteraction')
  }

  destroy(): void {
    if (this.#feedbackTimer) window.clearTimeout(this.#feedbackTimer)
    this.cancel()
  }
}
