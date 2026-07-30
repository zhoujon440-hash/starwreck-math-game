import type { SceneDefinition } from '../game/types'
import { G02_SCN00 } from '../scenes/g02/scn00'
import { G02_SCN01 } from '../scenes/g02/scn01'
import { G02_SCN02 } from '../scenes/g02/scn02'

const boundaryState = {
  id: 'S0' as const,
  title: '能源搜索边界',
  objective: '垂直切片已完成',
  narrative: '下一步将分流到发动机坑、电池洞穴、供暖棚或电线森林；本版本不开放这些玩法。',
  safeCheckpoint: true,
}

export const G02_ENERGY_SEARCH_BOUNDARY: SceneDefinition = {
  id: 'RUNTIME-G02-ENERGY-SEARCH-BOUNDARY',
  title: '旧屏幕谷能源搜索边界',
  playerTitle: '档案之后',
  art: '/assets/g02/slice-01/scn02/SCENE-G02-003_tv-wall-archive.webp',
  initialState: 'S0',
  states: {
    S0: boundaryState,
    S1: { ...boundaryState, id: 'S1' },
    S2: { ...boundaryState, id: 'S2' },
    S3: { ...boundaryState, id: 'S3' },
    S4: { ...boundaryState, id: 'S4' },
    S5: { ...boundaryState, id: 'S5' },
    S6: { ...boundaryState, id: 'S6' },
  },
  items: [],
  hotspots: [],
  transitions: [],
}

export const G02_SLICE_SCENES: SceneDefinition[] = [
  G02_SCN00,
  G02_SCN01,
  G02_SCN02,
  G02_ENERGY_SEARCH_BOUNDARY,
]
