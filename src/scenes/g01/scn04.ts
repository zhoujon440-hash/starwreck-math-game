import manifest from '../../../data/source/g01/pr-b/runtime-art-manifest.json'
import type { ItemDefinition, SceneDefinition } from '../../game/types'

const asset = (suffix: string) => `/assets/g01/pr-b/scn-g01-04/${suffix}`

const targets = manifest.hos.targets
const items: ItemDefinition[] = targets.map((target) => ({
  id: target.item_id,
  name: target.name,
  description:
    target.item_id === 'ITM-G01-011'
      ? '用于锁定锈环星异常信号的坐标标记。'
      : 'ITM-G01-010星图碎片组的运行时子件，需嵌回十二星门环。',
  inventoryIcon: `/${target.inventory_asset.replace(/^public\//, '')}`,
  collectibleLayer: {
    source: `/${target.scene_asset.replace(/^public\//, '')}`,
    scope: 'zoom',
    area: target.position,
    rotation:
      target.item_id.endsWith('-A') ? -10 : target.item_id.endsWith('-B') ? 13 : 5,
  },
}))

export const G01_SCN04: SceneDefinition = {
  id: 'SCN-G01-04',
  title: '拾光号导航星图室',
  playerTitle: '星图缺口',
  art: asset('background/SCENE-G01-005_star_map_gap.webp'),
  initialState: 'S0',
  states: {
    S0: { id: 'S0', title: '星图室', objective: '调查中央破损星图台', narrative: '十二道机械环同时失准，三处星图缺口露出黑暗底舱。', safeCheckpoint: true },
    S1: { id: 'S1', title: '散落星图', objective: '在星图台近景中找齐四件目标物', narrative: '碎片与旧导航板混在一起，七码只能在这一小片区域受控搜寻。' },
    S2: { id: 'S2', title: '拼回来源', objective: '把三片星图碎片拖回对应缺口', narrative: '错误碎片会返回背包，不覆盖已确认槽位，也不会消耗。', safeCheckpoint: true },
    S3: { id: 'S3', title: '校准星门环', objective: '旋转并校准十二星门环', narrative: '七码正在比对缺口边缘与星门编号的机械咬合。' },
    S4: { id: 'S4', title: '数据毛刺', objective: '从安全节点恢复并确认校准结果', narrative: '异常数据会退回星图台安全节点，正确碎片和证据全部保留。' },
    S5: { id: 'S5', title: '异常信号', objective: '仅分析已取得的异常证据', narrative: '十二个异常点同时浮现，其中最弱的信号反复删除自身。', safeCheckpoint: true },
    S6: { id: 'S6', title: '锈环星坐标', objective: '前往驾驶舱规划垃圾雨航线', narrative: '锈环星坐标已锁定。星图、证据与背包状态均已自动保存。', safeCheckpoint: true },
  },
  items,
  hotspots: [
    { id: 'HS-G01-0017', kind: 'inspect', ariaLabel: '调查中央破损星图台', area: { x: 29, y: 24, width: 62, height: 59 }, activeStates: ['S0'], scope: 'scene' },
    ...items.map((item, index) => ({
      id: `HOS-G01-004-${String(index + 1).padStart(2, '0')}`,
      kind: 'hidden-item' as const,
      ariaLabel: `在星图台中找到${item.name}`,
      area: item.collectibleLayer!.area,
      activeStates: ['S1' as const],
      itemId: item.id,
      hosId: 'HOS-G01-004',
      scope: 'zoom' as const,
    })),
    { id: 'HS-G01-0018-A', kind: 'use-target', ariaLabel: '星门环左侧碎片槽', area: { x: 45, y: 38, width: 12, height: 20 }, activeStates: ['S2'], requiredItemId: 'RUNTIME-ITM-G01-010-A', scope: 'scene' },
    { id: 'HS-G01-0018-B', kind: 'use-target', ariaLabel: '星门环中央碎片槽', area: { x: 58, y: 44, width: 12, height: 19 }, activeStates: ['S2'], requiredItemId: 'RUNTIME-ITM-G01-010-B', scope: 'scene' },
    { id: 'HS-G01-0018-C', kind: 'use-target', ariaLabel: '星门环右侧碎片槽', area: { x: 69, y: 35, width: 12, height: 21 }, activeStates: ['S2'], requiredItemId: 'RUNTIME-ITM-G01-010-C', scope: 'scene' },
    { id: 'HS-G01-0018', kind: 'zoom', ariaLabel: '校准十二星门环', area: { x: 40, y: 29, width: 44, height: 43 }, activeStates: ['S3'], zoomId: 'TUT-MECH-002', scope: 'scene' },
    { id: 'HS-G01-0019', kind: 'inspect', ariaLabel: '分析星门环上的异常信号层', area: { x: 53, y: 26, width: 35, height: 45 }, activeStates: ['S4'], scope: 'scene' },
    { id: 'HS-G01-0020', kind: 'use-target', ariaLabel: '锈环星坐标槽', area: { x: 79, y: 55, width: 10, height: 17 }, activeStates: ['S5'], requiredItemId: 'ITM-G01-011', scope: 'scene' },
  ],
  transitions: [
    { from: 'S0', event: 'inspect:HS-G01-0017', to: 'S1' },
    { from: 'S1', event: 'found:all', to: 'S2' },
    { from: 'S2', event: 'use:RUNTIME-ITM-G01-010-A:HS-G01-0018-A', to: 'S2' },
    { from: 'S2', event: 'use:RUNTIME-ITM-G01-010-B:HS-G01-0018-B', to: 'S2' },
    { from: 'S2', event: 'use:RUNTIME-ITM-G01-010-C:HS-G01-0018-C', to: 'S2' },
    { from: 'S3', event: 'puzzle:TUT-MECH-002', to: 'S4' },
    { from: 'S4', event: 'inspect:HS-G01-0019', to: 'S5' },
    { from: 'S5', event: 'use:ITM-G01-011:HS-G01-0020', to: 'S6' },
  ],
}
