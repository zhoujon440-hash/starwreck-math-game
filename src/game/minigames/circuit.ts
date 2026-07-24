import type { MiniGameController, MiniGameSnapshot } from './types'

export class CircuitRoutingGame implements MiniGameController<string> {
  readonly #solution: string[]
  readonly #maxMistakes: number
  #status: MiniGameSnapshot['status'] = 'idle'
  #mistakes = 0
  #path: string[] = []

  constructor(solution: string[], maxMistakes = 3) {
    if (solution.length < 2) throw new Error('Circuit solution needs at least two nodes')
    this.#solution = [...solution]
    this.#maxMistakes = maxMistakes
  }

  get path(): string[] {
    return [...this.#path]
  }

  get snapshot(): MiniGameSnapshot {
    return {
      status: this.#status,
      mistakes: this.#mistakes,
      progress: this.#path.length,
      total: this.#solution.length,
    }
  }

  start(): void {
    this.#status = 'playing'
    this.#mistakes = 0
    this.#path = []
  }

  act(nodeId: string): MiniGameSnapshot {
    if (this.#status === 'idle') this.start()
    if (this.#status !== 'playing') return this.snapshot

    const expected = this.#solution[this.#path.length]
    if (nodeId === expected) {
      this.#path.push(nodeId)
      if (this.#path.length === this.#solution.length) this.#status = 'solved'
      return this.snapshot
    }

    this.#mistakes += 1
    this.#path = []
    if (this.#mistakes >= this.#maxMistakes) this.#status = 'failed'
    return this.snapshot
  }

  reset(): void {
    this.#status = 'idle'
    this.#mistakes = 0
    this.#path = []
  }
}

