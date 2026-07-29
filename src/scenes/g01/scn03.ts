import artManifest from '../../../data/source/g01/pr-a/scn-g01-03-art-manifest.json'
import type { ItemDefinition, SceneDefinition } from '../../game/types'

const publicPath = (path: string): string => `/${path.replace(/^public\//, '')}`

const hosItems: ItemDefinition[] = artManifest.hos.targets.map((target) => ({
  id: target.item_id,
  name: target.name,
  description:
    target.name === '密封胶带'
      ? '用于覆盖金属补片边缘的低温密封胶带。'
      : target.name === '金属补片'
        ? '与货舱外壳曲率相近的冷压金属补片。'
        : target.name === '压力表'
          ? '测量裂口周围氧压的机械压力表，安装后仍保留。'
          : '开启货舱复压阀的机械钥匙。',
  inventoryIcon: publicPath(target.inventory_asset),
  collectibleLayer: {
    source: publicPath(target.scene_asset),
    scope: 'zoom',
    area: target.position,
    rotation:
      target.name === '密封胶带'
        ? -11
        : target.name === '金属补片'
          ? 8
          : target.name === '压力表'
            ? -7
            : 16,
  },
}))

export const G01_SCN03: SceneDefinition = {
  id: 'SCN-G01-03',
  title: '拾光号货舱',
  playerTitle: '漏气的货舱',
  art: publicPath(artManifest.scene_asset.runtime_path),
  initialState: 'S0',
  states: {
    S0: {
      id: 'S0',
      title: '安全舱门',
      objective: '从左侧安全门调查货舱裂口',
      narrative: '货舱里凝着薄霜，右侧裂口正把空气持续抽向船外。',
      safeCheckpoint: true,
    },
    S1: {
      id: 'S1',
      title: '应急工具箱',
      objective: '打开左下应急箱，找出四件维修物',
      narrative: '七码标出九十秒安全窗口。工具箱里混着还能用和已经损坏的零件。',
    },
    S2: {
      id: 'S2',
      title: '安装压力表',
      objective: '把压力表拖到裂口左侧的圆形接口',
      narrative: '先读出压差，才能确定补片承受的方向。',
      safeCheckpoint: true,
    },
    S3: {
      id: 'S3',
      title: '校准测压',
      objective: '在压力表近景中完成三段压力校准',
      narrative: '七码正在记录裂口证据。正确读数会成为后续修复的安全节点。',
      safeCheckpoint: true,
    },
    S4: {
      id: 'S4',
      title: '封堵裂口',
      objective: '先安装金属补片，再覆盖密封胶带',
      narrative: '错误顺序不会消耗关键物。氧压过低时只退回安全门，并保留正确步骤。',
      safeCheckpoint: true,
    },
    S5: {
      id: 'S5',
      title: '货舱复压',
      objective: '把复压钥拖到右侧阀门并恢复压力',
      narrative: '裂口已经封住。复压阀可以让货舱重新建立稳定压力。',
    },
    S6: {
      id: 'S6',
      title: '货舱稳定',
      objective: '确认首项任务完成',
      narrative: '货舱压力恢复，工具、证据和任务日志均已自动保存。后续舱段仅保留边界。',
      safeCheckpoint: true,
    },
  },
  items: hosItems,
  hotspots: [
    {
      id: 'HS-G01-0013',
      kind: 'inspect',
      ariaLabel: '调查货舱右侧的漏气裂口',
      area: { x: 65, y: 6, width: 17, height: 58 },
      activeStates: ['S0'],
      scope: 'scene',
    },
    {
      id: 'RUNTIME-HS-G01-03-EMERGENCY-BOX',
      kind: 'zoom',
      ariaLabel: '打开左下货舱应急工具箱',
      area: { x: 0, y: 53, width: 30, height: 36 },
      activeStates: ['S1'],
      zoomId: 'HOS-G01-003',
      scope: 'scene',
    },
    ...hosItems.map((item, index) => ({
      id: `HOS-G01-003-${String(index + 1).padStart(2, '0')}`,
      kind: 'hidden-item' as const,
      ariaLabel: `在货舱应急箱中找到${item.name}`,
      area: item.collectibleLayer?.area ?? { x: 0, y: 0, width: 1, height: 1 },
      activeStates: ['S1' as const],
      itemId: item.id,
      hosId: 'HOS-G01-003',
      scope: 'zoom' as const,
    })),
    {
      id: 'HS-G01-0014',
      kind: 'use-target',
      ariaLabel: '裂口左侧的压力表接口',
      area: { x: 58, y: 23, width: 11, height: 22 },
      activeStates: ['S2'],
      requiredItemId: 'ITM-G01-009',
      consumeItem: false,
      scope: 'scene',
    },
    {
      id: 'RUNTIME-HS-G01-03-GAUGE-PUZZLE',
      kind: 'zoom',
      ariaLabel: '打开压力表校准近景',
      area: { x: 57, y: 21, width: 13, height: 26 },
      activeStates: ['S3'],
      zoomId: 'RUNTIME-PUZ-G01-PRESSURE-CALIBRATION',
      scope: 'scene',
    },
    {
      id: 'HS-G01-0015-PATCH',
      kind: 'use-target',
      ariaLabel: '裂口的金属补片安装区',
      area: { x: 69, y: 23, width: 14, height: 35 },
      activeStates: ['S4'],
      requiredItemId: 'ITM-G01-008',
      scope: 'scene',
    },
    {
      id: 'HS-G01-0015-TAPE',
      kind: 'use-target',
      ariaLabel: '金属补片边缘的密封胶带覆盖区',
      area: { x: 68, y: 22, width: 16, height: 38 },
      activeStates: ['S4'],
      requiredCompletedHotspotIds: ['HS-G01-0015-PATCH'],
      requiredItemId: 'ITM-G01-007',
      scope: 'scene',
    },
    {
      id: 'HS-G01-0016',
      kind: 'use-target',
      ariaLabel: '右侧货舱复压阀',
      area: { x: 84, y: 43, width: 14, height: 34 },
      activeStates: ['S5'],
      requiredItemId: 'RUNTIME-ITM-G01-REPRESS-KEY',
      scope: 'scene',
    },
  ],
  transitions: [
    { from: 'S0', event: 'inspect:HS-G01-0013', to: 'S1' },
    { from: 'S1', event: 'found:all', to: 'S2' },
    { from: 'S2', event: 'use:ITM-G01-009:HS-G01-0014', to: 'S3' },
    {
      from: 'S3',
      event: 'puzzle:RUNTIME-PUZ-G01-PRESSURE-CALIBRATION',
      to: 'S4',
    },
    {
      from: 'S4',
      event: 'use:ITM-G01-008:HS-G01-0015-PATCH',
      to: 'S4',
    },
    {
      from: 'S4',
      event: 'use:ITM-G01-007:HS-G01-0015-TAPE',
      to: 'S5',
    },
    {
      from: 'S5',
      event: 'use:RUNTIME-ITM-G01-REPRESS-KEY:HS-G01-0016',
      to: 'S6',
    },
  ],
}
