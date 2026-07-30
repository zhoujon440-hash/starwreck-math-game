import manifest from '../../../data/source/g01/pr-c/runtime-art-manifest.json'
import type { ItemDefinition, SceneDefinition } from '../../game/types'

const asset = (suffix: string) => `/assets/g01/pr-c/scn-g01-06/${suffix}`
const runtimeHos = manifest.hos

const items: ItemDefinition[] = runtimeHos.targets.map((target) => ({
  id: target.item_id,
  name: target.name,
  description:
    target.item_id === 'ITM-G01-013'
      ? '从锈环星弱信号中复原的求救记录，是前往旧屏幕谷的关键证据。'
      : `${target.name}属于求救接收器的临时校准组件，取得后直接用于波形解析。`,
  inventoryIcon: target.inventory_asset
    ? `/${target.inventory_asset.replace(/^public\//, '')}`
    : undefined,
  collectToInventory: target.item_id === 'ITM-G01-013',
  collectibleLayer: {
    source: `/${target.scene_asset.replace(/^public\//, '')}`,
    scope: 'zoom',
    area: target.position,
    rotation: target.rotation,
  },
}))

export const G01_SCN06: SceneDefinition = {
  id: 'SCN-G01-06',
  title: '拾光号远距观测舱',
  playerTitle: '锈环星求救信号',
  art: asset('background/SCENE-G01-007_long_range_observation.webp'),
  initialState: 'S0',
  states: {
    S0: {
      id: 'S0',
      title: '远距观测窗',
      objective: '调查中央接收器上反复中断的弱信号',
      narrative: '锈环星悬在碎骸带之后。四路接收器中，只有一道波形在重复删除自己。',
      safeCheckpoint: true,
    },
    S1: {
      id: 'S1',
      title: '破碎波形',
      objective: '在接收器近景中找齐四件信号校准组件',
      narrative: '记录棱镜、线圈与相位钥散落在旧零件间，错误外壳会留在原处。',
    },
    S2: {
      id: 'S2',
      title: '求救记录',
      objective: '调整频段、相位和增益，复原完整求救内容',
      narrative: '求救记录已进入证据档案。只有完成校准，才能确认它没有被伪造。',
      safeCheckpoint: true,
    },
    S3: {
      id: 'S3',
      title: '授权准备',
      objective: '在左侧实体槽确认七码搜寻权限',
      narrative: '能力授权片已经装入控制台。每个权限都要由独立的机械触点确认。',
    },
    S4: {
      id: 'S4',
      title: '权限核验',
      objective: '依次确认分析与已探索节点寻路',
      narrative: '分析只处理已取得证据；寻路只连接已经探索且开放的节点。',
    },
    S5: {
      id: 'S5',
      title: '边界确认',
      objective: '锁定三项基础能力并保存远距观测记录',
      narrative: '七码已明确确认：瞬移、缩小与复制体仍未授权。',
      safeCheckpoint: true,
    },
    S6: {
      id: 'S6',
      title: '求救源锁定',
      objective: '前往锈环星近地轨道扫描旧屏幕谷外缘',
      narrative: '求救、证据和三项授权已经写入自动存档，锈环星落点进入观测范围。',
      safeCheckpoint: true,
    },
  },
  items,
  hotspots: [
    {
      id: 'HS-G01-0025',
      kind: 'inspect',
      ariaLabel: '调查中央求救信号接收器',
      area: { x: 35, y: 54, width: 42, height: 37 },
      activeStates: ['S0'],
      scope: 'scene',
    },
    ...items.map((item, index) => ({
      id: `RUNTIME-HOS-G01-06-${String(index + 1).padStart(2, '0')}`,
      kind: 'hidden-item' as const,
      ariaLabel: `在求救信号接收器中找到${item.name}`,
      area: item.collectibleLayer!.area,
      activeStates: ['S1' as const],
      itemId: item.id,
      hosId: 'RUNTIME-HOS-G01-06-SIGNAL-TRACE',
      scope: 'zoom' as const,
    })),
    {
      id: 'RUNTIME-HS-G01-06-SIGNAL-ALIGNMENT',
      kind: 'zoom',
      ariaLabel: '打开求救波形频段校准近景',
      area: { x: 41, y: 57, width: 31, height: 27 },
      activeStates: ['S2'],
      zoomId: 'RUNTIME-PUZ-G01-SIGNAL-ALIGNMENT',
      scope: 'scene',
    },
    {
      id: 'HS-G01-0026',
      kind: 'inspect',
      ariaLabel: '按下左侧七码搜寻授权槽',
      area: { x: 40, y: 69, width: 11, height: 17 },
      activeStates: ['S3'],
      scope: 'scene',
    },
    {
      id: 'HS-G01-0027',
      kind: 'inspect',
      ariaLabel: '按下中央分析授权槽',
      area: { x: 52, y: 69, width: 11, height: 17 },
      activeStates: ['S4'],
      scope: 'scene',
    },
    {
      id: 'HS-G01-0028',
      kind: 'inspect',
      ariaLabel: '按下右侧已探索节点寻路授权槽',
      area: { x: 64, y: 69, width: 11, height: 17 },
      activeStates: ['S4'],
      requiredCompletedHotspotIds: ['HS-G01-0027'],
      scope: 'scene',
    },
    {
      id: 'RUNTIME-HS-G01-06-SAVE-OBSERVATION',
      kind: 'inspect',
      ariaLabel: '合上观测记录存档拨杆',
      area: { x: 76, y: 61, width: 9, height: 20 },
      activeStates: ['S5'],
      scope: 'scene',
    },
  ],
  transitions: [
    { from: 'S0', event: 'inspect:HS-G01-0025', to: 'S1' },
    { from: 'S1', event: 'found:all', to: 'S2' },
    {
      from: 'S2',
      event: 'puzzle:RUNTIME-PUZ-G01-SIGNAL-ALIGNMENT',
      to: 'S3',
    },
    { from: 'S3', event: 'inspect:HS-G01-0026', to: 'S4' },
    { from: 'S4', event: 'inspect:HS-G01-0027', to: 'S4' },
    { from: 'S4', event: 'inspect:HS-G01-0028', to: 'S5' },
    {
      from: 'S5',
      event: 'inspect:RUNTIME-HS-G01-06-SAVE-OBSERVATION',
      to: 'S6',
    },
  ],
}
