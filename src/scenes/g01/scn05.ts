import type { ItemDefinition, SceneDefinition } from '../../game/types'

const asset = (suffix: string) => `/assets/g01/pr-b/scn-g01-05/${suffix}`

const bypass: ItemDefinition = {
  id: 'ITM-G01-012',
  name: '旁路板',
  description: '从驾驶舱工具槽取出的航线旁路板，可打开第三航段短时窗口。',
  inventoryIcon: asset('items/bypass-plate_inventory.png'),
  collectibleLayer: {
    source: asset('items/bypass-plate_scene.png'),
    scope: 'scene',
    area: { x: 16, y: 66, width: 10, height: 16 },
    rotation: -9,
  },
}

export const G01_SCN05: SceneDefinition = {
  id: 'SCN-G01-05',
  title: '拾光号垃圾雨航线驾驶舱',
  playerTitle: '垃圾雨航线',
  art: asset('background/SCENE-G01-006_garbage_rain_route.webp'),
  initialState: 'S0',
  states: {
    S0: { id: 'S0', title: '垃圾雨前缘', objective: '确认第一个已探明安全节点', narrative: '碎船板与冰晶像暴雨一样切过舷窗，只有已探明节点可以操作。', safeCheckpoint: true },
    S1: { id: 'S1', title: '安全节点A', objective: '沿第一航段确认安全节点B', narrative: '第一航段已经保存。未访问的分支仍保持禁用。', safeCheckpoint: true },
    S2: { id: 'S2', title: '安全节点B', objective: '从左侧工具槽取得旁路板', narrative: '第二航段已经确认，第三段被锁在一扇短时窗口之后。', safeCheckpoint: true },
    S3: { id: 'S3', title: '旁路槽', objective: '把旁路板拖到中央航线旁路槽', narrative: '错误道具不会消耗；正确安装会打开极短的通行窗口。', safeCheckpoint: true },
    S4: { id: 'S4', title: '短时窗口', objective: '在窗口关闭前确认安全落点', narrative: '若窗口关闭，返回最近安全节点并保留全部正确路线。', safeCheckpoint: true },
    S5: { id: 'S5', title: '安全落点', objective: '确认着陆航线并保存', narrative: '半条安全路线已经接成完整通路，七码正在锁定着陆点。' },
    S6: { id: 'S6', title: '航线完成', objective: '等待锈环星求救信号边界', narrative: '垃圾雨航线已保存。下一舱段只保留入口边界，未加载后续剧情。', safeCheckpoint: true },
  },
  items: [bypass],
  hotspots: [
    { id: 'HS-G01-0021', kind: 'inspect', ariaLabel: '确认垃圾雨安全节点A', area: { x: 48, y: 37, width: 12, height: 16 }, activeStates: ['S0'], scope: 'scene' },
    { id: 'HS-G01-0022', kind: 'inspect', ariaLabel: '确认垃圾雨安全节点B', area: { x: 61, y: 28, width: 12, height: 17 }, activeStates: ['S1'], scope: 'scene' },
    { id: 'RUNTIME-HS-G01-05-BYPASS-TOOL-SLOT', kind: 'hidden-item', ariaLabel: '从驾驶舱左侧工具槽取出旁路板', area: { x: 16, y: 66, width: 10, height: 16 }, activeStates: ['S2'], itemId: 'ITM-G01-012', scope: 'scene' },
    { id: 'HS-G01-0023', kind: 'use-target', ariaLabel: '中央控制台旁路板插槽', area: { x: 52, y: 76, width: 13, height: 15 }, activeStates: ['S3'], requiredItemId: 'ITM-G01-012', scope: 'scene' },
    { id: 'HS-G01-0024', kind: 'inspect', ariaLabel: '确认舷窗右上方安全落点', area: { x: 77, y: 15, width: 13, height: 18 }, activeStates: ['S4'], scope: 'scene' },
    { id: 'RUNTIME-HS-G01-05-LANDING-CONFIRM', kind: 'inspect', ariaLabel: '锁定安全着陆航线', area: { x: 76, y: 14, width: 15, height: 21 }, activeStates: ['S5'], scope: 'scene' },
  ],
  transitions: [
    { from: 'S0', event: 'inspect:HS-G01-0021', to: 'S1' },
    { from: 'S1', event: 'inspect:HS-G01-0022', to: 'S2' },
    { from: 'S2', event: 'found:all', to: 'S3' },
    { from: 'S3', event: 'use:ITM-G01-012:HS-G01-0023', to: 'S4' },
    { from: 'S4', event: 'inspect:HS-G01-0024', to: 'S5' },
    { from: 'S5', event: 'inspect:RUNTIME-HS-G01-05-LANDING-CONFIRM', to: 'S6' },
  ],
}
