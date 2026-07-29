import artManifest from '../../../data/source/g01/pr-a/scn-g01-02-art-manifest.json'
import type { ItemDefinition, SceneDefinition } from '../../game/types'

const publicPath = (path: string): string => `/${path.replace(/^public\//, '')}`

const clueItems: ItemDefinition[] = artManifest.clue_search.targets.map((target) => ({
  id: target.asset_id,
  name: target.name,
  description:
    target.name === '维修清单'
      ? '坠落前留下的维修任务单。归档后可建立第一条任务依赖链。'
      : '可在船内地图台读取舱段连接关系的星图钥片。',
  inventoryIcon: publicPath(target.inventory_asset),
  collectibleLayer: {
    source: publicPath(target.scene_asset),
    scope: 'scene',
    area: target.position,
    rotation: target.name === '维修清单' ? -8 : 13,
  },
}))

export const G01_SCN02: SceneDefinition = {
  id: 'SCN-G01-02',
  title: '拾光号中控台',
  playerTitle: '船上第一张任务单',
  art: publicPath(artManifest.scene_asset.runtime_path),
  initialState: 'S0',
  states: {
    S0: {
      id: 'S0',
      title: '中控台重启',
      objective: '调查左侧中控任务屏',
      narrative: '七码恢复了中控台的最低供电。任务屏仍停在坠落前的维护记录。',
      safeCheckpoint: true,
    },
    S1: {
      id: 'S1',
      title: '清单缺页',
      objective: '在中控台周围找到维修清单和星图钥片',
      narrative: '任务屏只留下两个空白入口。缺失的实体记录散落在舱内杂物中。',
    },
    S2: {
      id: 'S2',
      title: '船内地图',
      objective: '打开右侧船内地图，确认货舱路径',
      narrative: '两个关键物已经收好。地图上只有已探索舱段能够稳定显示。',
      safeCheckpoint: true,
    },
    S3: {
      id: 'S3',
      title: '依赖排序',
      objective: '在任务屏近景中按依赖关系排列维修任务',
      narrative: '先处理会阻断后续工作的故障，再处理能够恢复通行的舱段。',
    },
    S4: {
      id: 'S4',
      title: '解锁地图',
      objective: '把星图钥片拖到船内地图台',
      narrative: '排序已经确认。星图钥片可以让中控台读取货舱路径。',
    },
    S5: {
      id: 'S5',
      title: '归档任务单',
      objective: '把维修清单拖入任务屏下方的归档槽',
      narrative: '路径已显示，最后需要把实体清单写入任务日志。',
      safeCheckpoint: true,
    },
    S6: {
      id: 'S6',
      title: '首条任务链',
      objective: '从右侧舱门前往漏气货舱',
      narrative: '中控台建立了第一条维修任务链：测压、修补、复压。',
      safeCheckpoint: true,
    },
  },
  items: clueItems,
  hotspots: [
    {
      id: 'HS-G01-0009',
      kind: 'inspect',
      ariaLabel: '调查中控任务屏',
      area: { x: 15, y: 20, width: 30, height: 39 },
      activeStates: ['S0'],
      scope: 'scene',
    },
    ...clueItems.map((item, index) => ({
      id: `RUNTIME-CLUE-G01-02-${String(index + 1).padStart(2, '0')}`,
      kind: 'hidden-item' as const,
      ariaLabel: `在中控台杂物中找到${item.name}`,
      area: item.collectibleLayer?.area ?? { x: 0, y: 0, width: 1, height: 1 },
      activeStates: ['S1' as const],
      itemId: item.id,
      scope: 'scene' as const,
    })),
    {
      id: 'HS-G01-0010',
      kind: 'inspect',
      ariaLabel: '打开右侧船内地图近景',
      area: { x: 49, y: 17, width: 24, height: 43 },
      activeStates: ['S2'],
      scope: 'scene',
    },
    {
      id: 'RUNTIME-HS-G01-02-TASK-PUZZLE',
      kind: 'zoom',
      ariaLabel: '打开任务依赖排序近景',
      area: { x: 16, y: 21, width: 29, height: 38 },
      activeStates: ['S3'],
      zoomId: 'RUNTIME-PUZ-G01-TASK-DEPENDENCY',
      scope: 'scene',
    },
    {
      id: 'RUNTIME-HS-G01-02-MAP-KEY',
      kind: 'use-target',
      ariaLabel: '船内地图台的钥片读取槽',
      area: { x: 54, y: 22, width: 15, height: 27 },
      activeStates: ['S4'],
      requiredItemId: 'RUNTIME-ITM-G01-STAR-MAP-KEY',
      scope: 'scene',
    },
    {
      id: 'HS-G01-0011',
      kind: 'use-target',
      ariaLabel: '任务屏下方的维修清单归档槽',
      area: { x: 27, y: 56, width: 19, height: 18 },
      activeStates: ['S5'],
      requiredItemId: 'RUNTIME-ITM-G01-MAINTENANCE-SHEET',
      scope: 'scene',
    },
    {
      id: 'RUNTIME-HS-G01-02-CARGO-ENTRY',
      kind: 'inspect',
      ariaLabel: '从已确认的维修路线前往漏气货舱',
      area: { x: 73, y: 11, width: 17, height: 63 },
      activeStates: ['S6'],
      scope: 'scene',
    },
  ],
  transitions: [
    { from: 'S0', event: 'inspect:HS-G01-0009', to: 'S1' },
    { from: 'S1', event: 'found:all', to: 'S2' },
    { from: 'S2', event: 'inspect:HS-G01-0010', to: 'S3' },
    {
      from: 'S3',
      event: 'puzzle:RUNTIME-PUZ-G01-TASK-DEPENDENCY',
      to: 'S4',
    },
    {
      from: 'S4',
      event:
        'use:RUNTIME-ITM-G01-STAR-MAP-KEY:RUNTIME-HS-G01-02-MAP-KEY',
      to: 'S5',
    },
    {
      from: 'S5',
      event:
        'use:RUNTIME-ITM-G01-MAINTENANCE-SHEET:HS-G01-0011',
      to: 'S6',
    },
  ],
}
