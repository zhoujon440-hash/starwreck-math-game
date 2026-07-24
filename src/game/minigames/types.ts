export type MiniGameStatus = 'idle' | 'playing' | 'solved' | 'failed'

export interface MiniGameSnapshot {
  status: MiniGameStatus
  mistakes: number
  progress: number
  total: number
}

export interface MiniGameController<Input> {
  get snapshot(): MiniGameSnapshot
  start(): void
  act(input: Input): MiniGameSnapshot
  reset(): void
}

