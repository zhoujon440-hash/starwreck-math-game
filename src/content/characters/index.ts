import { QIMA } from './qima'
import { XINGYU } from './xingyu'

export * from './qima'
export * from './types'
export * from './xingyu'

export const G01_CHARACTERS = {
  xingyu: XINGYU,
  qima: QIMA,
} as const

export type G01CharacterKey = keyof typeof G01_CHARACTERS

