import hosManifest from '../../data/source/g01/scn-g01-01/hos_manifest.json'
import sceneManifest from '../../data/source/g01/scn-g01-01/scene_manifest.json'
import type {
  ChapterDefinition,
  ItemDefinition,
  SceneDefinition,
} from '../game/types'
import { G01_SCN02 } from '../scenes/g01/scn02'
import { G01_SCN03 } from '../scenes/g01/scn03'
import { G01_SCN04 } from '../scenes/g01/scn04'
import { G01_SCN05 } from '../scenes/g01/scn05'
import { G01_SCN06 } from '../scenes/g01/scn06'
import { G01_SCN07, G02_BOUNDARY } from '../scenes/g01/scn07'

const publicPath = (path: string): string => `/${path.replace(/^public\//, '')}`

const scn01Items: ItemDefinition[] = hosManifest.targets.map((target) => ({
  id: target.item_id,
  name: target.name,
  description:
    target.name === '七码芯片'
      ? '七码的导航记忆芯片，需要校正方向后装回芯片槽。'
      : target.name === '接线片'
        ? '用于重接供电回路的铜质接线片。'
        : target.name === '保险丝'
          ? '保护七码供电回路的陶瓷保险丝。'
          : '锁定七码托架的机械固定扣。',
  inventoryIcon: publicPath(target.inventory_asset),
  collectibleLayer: {
    source: publicPath(target.scene_asset),
    scope: 'zoom',
    area: target.position,
    rotation:
      target.name === '七码芯片'
        ? -11
        : target.name === '接线片'
          ? 18
          : target.name === '保险丝'
            ? 78
            : -8,
  },
}))

export const G01_SCN01: SceneDefinition = {
  id: 'SCN-G01-01',
  title: '导航核心舱',
  playerTitle: '找回七码',
  art: publicPath(sceneManifest.runtime_path),
  initialState: 'S0',
  states: {
    S0: {
      id: 'S0',
      title: '信号尽头',
      objective: '进入导航核心舱，确认微弱信号的来源',
      narrative: '舱灯止步于一间受损的导航核心舱，右侧维修托架里没有回应。',
      safeCheckpoint: true,
    },
    S1: {
      id: 'S1',
      title: '七码离线',
      objective: '检查维修托架中的七码',
      narrative: '星宇认出托架里失去供电的搭档。七码的外壳受损，核心仍有微弱信号。',
    },
    S2: {
      id: 'S2',
      title: '搜集维修组件',
      objective: '在左侧导航零件堆中找回四件维修组件',
      narrative: '芯片、接线片、保险丝与固定扣散落在坠落后的零件堆里。',
    },
    S3: {
      id: 'S3',
      title: '校正芯片方向',
      objective: '局部放大七码芯片，将触点旋转到正确方向',
      narrative: '供电组件已经找齐。芯片方向不正确时不能强行插入。',
      safeCheckpoint: true,
    },
    S4: {
      id: 'S4',
      title: '修复核心托架',
      objective: '按接线片、保险丝、芯片、固定扣的顺序修复七码',
      narrative: '错误接口会退回道具，但不会消耗关键组件或改变正确进度。',
    },
    S5: {
      id: 'S5',
      title: '启动校验',
      objective: '等待七码完成不可跳过的启动校验',
      narrative: '托架开始供电。七码正在逐段恢复感知与导航核心。',
      safeCheckpoint: true,
    },
    S6: {
      id: 'S6',
      title: '搭档恢复',
      objective: '听完七码恢复后的第一段对话',
      narrative: '七码恢复在线。G01序章仍不计入十二颗主星核。',
      safeCheckpoint: true,
    },
  },
  items: scn01Items,
  hotspots: [
    {
      id: 'RUNTIME-HS-G01-01-ENTRY',
      kind: 'inspect',
      ariaLabel: '走近右侧的七码维修托架',
      area: { x: 61, y: 35, width: 25, height: 52 },
      activeStates: ['S0'],
      scope: 'scene',
    },
    {
      id: 'HS-G01-0005',
      kind: 'inspect',
      ariaLabel: '检查离线的七码',
      area: { x: 64, y: 37, width: 20, height: 48 },
      activeStates: ['S1'],
      scope: 'scene',
    },
    {
      id: 'HS-G01-0006',
      kind: 'zoom',
      ariaLabel: '放大检查左侧导航零件堆',
      area: { x: 1, y: 37, width: 37, height: 57 },
      activeStates: ['S2'],
      zoomId: 'HOS-G01-002',
      scope: 'scene',
    },
    ...scn01Items.map((item, index) => ({
      id: `HOS-G01-002-${String(index + 1).padStart(2, '0')}`,
      kind: 'hidden-item' as const,
      ariaLabel: `在导航零件堆中找到${item.name}`,
      area: item.collectibleLayer?.area ?? { x: 0, y: 0, width: 1, height: 1 },
      activeStates: ['S2' as const],
      itemId: item.id,
      scope: 'zoom' as const,
    })),
    {
      id: 'PUZ-G01-CHIP-ORIENTATION-HOTSPOT',
      kind: 'zoom',
      ariaLabel: '检查七码芯片的触点方向',
      area: { x: 45, y: 34, width: 13, height: 25 },
      activeStates: ['S3'],
      zoomId: 'PUZ-G01-CHIP-ORIENTATION',
      scope: 'scene',
    },
    {
      id: 'HS-G01-0007-CONTACT',
      kind: 'use-target',
      ariaLabel: '七码托架的接线槽',
      area: { x: 67, y: 48, width: 9, height: 12 },
      activeStates: ['S4'],
      requiredItemId: 'ITM-G01-005',
      scope: 'scene',
    },
    {
      id: 'HS-G01-0007-FUSE',
      kind: 'use-target',
      ariaLabel: '七码托架的保险丝槽',
      area: { x: 75, y: 52, width: 7, height: 13 },
      activeStates: ['S4'],
      requiredCompletedHotspotIds: ['HS-G01-0007-CONTACT'],
      requiredItemId: 'ITM-G01-006',
      scope: 'scene',
    },
    {
      id: 'HS-G01-0008',
      kind: 'use-target',
      ariaLabel: '七码托架的芯片槽',
      area: { x: 67, y: 57, width: 8, height: 14 },
      activeStates: ['S4'],
      requiredCompletedHotspotIds: ['HS-G01-0007-FUSE'],
      requiredItemId: 'ITM-G01-004',
      scope: 'scene',
    },
    {
      id: 'RUNTIME-HS-G01-0008-BUCKLE',
      kind: 'use-target',
      ariaLabel: '七码托架的固定扣',
      area: { x: 74, y: 68, width: 9, height: 13 },
      activeStates: ['S4'],
      requiredCompletedHotspotIds: ['HS-G01-0008'],
      requiredItemId: 'RUNTIME-ITM-G01-FIXED-BUCKLE',
      scope: 'scene',
    },
  ],
  transitions: [
    { from: 'S0', event: 'inspect:RUNTIME-HS-G01-01-ENTRY', to: 'S1' },
    { from: 'S1', event: 'inspect:HS-G01-0005', to: 'S2' },
    { from: 'S2', event: 'found:all', to: 'S3' },
    { from: 'S3', event: 'puzzle:PUZ-G01-CHIP-ORIENTATION', to: 'S4' },
    {
      from: 'S4',
      event: 'use:ITM-G01-005:HS-G01-0007-CONTACT',
      to: 'S4',
    },
    {
      from: 'S4',
      event: 'use:ITM-G01-006:HS-G01-0007-FUSE',
      to: 'S4',
    },
    { from: 'S4', event: 'use:ITM-G01-004:HS-G01-0008', to: 'S4' },
    {
      from: 'S4',
      event: 'use:RUNTIME-ITM-G01-FIXED-BUCKLE:RUNTIME-HS-G01-0008-BUCKLE',
      to: 'S5',
    },
    { from: 'S5', event: 'puzzle:PUZ-G01-QIMA-BOOT', to: 'S6' },
  ],
}

export const G01: ChapterDefinition = {
  id: 'G01',
  title: '拾光号：坠落之前',
  sceneTitle: 'SCN-G01-00 · 拾光号熄灯',
  protagonist: '星宇',
  initialState: 'S0',
  states: {
    S0: {
      id: 'S0',
      title: '断电红光',
      objective: '在熄灭的领航舱中找到应急手灯',
      narrative: '七码失去回应。导航核心离线，只有应急红光还在闪烁。',
      safeCheckpoint: true,
    },
    S1: {
      id: 'S1',
      title: '调查熔断点',
      objective: '选择应急手灯，照亮中央控制台左侧的熔断配电盒',
      narrative: '星宇：先找光，再找故障。',
    },
    S2: {
      id: 'S2',
      title: '维修柜开启',
      objective: '打开右侧维修柜特写，完成柜内找物',
      narrative: '配电盒的故障灯指向维修柜。柜门锁已经解除。',
    },
    S3: {
      id: 'S3',
      title: '更换临时保险丝',
      objective: '把临时保险丝拖到中央控制台的应急照明槽',
      narrative: '完整保险丝已进入背包。错误接口不会消耗关键道具。',
      safeCheckpoint: true,
    },
    S4: {
      id: 'S4',
      title: '解除短路保护',
      objective: '合上应急照明槽旁的保护开关',
      narrative: '保险丝接入成功，最后一步是重新闭合照明回路。',
    },
    S5: {
      id: 'S5',
      title: '应急照明恢复',
      objective: '沿船尾通道继续寻找失联的七码',
      narrative: '系统：维修舱应急照明已恢复。七码的信号仍然中断。',
      safeCheckpoint: true,
    },
    S6: {
      id: 'S6',
      title: '追寻失联信号',
      objective: '跟随恢复的舱灯，继续寻找七码',
      narrative: '星宇沿着刚恢复的舱灯走向船尾，黑暗里传来一段微弱的回波。',
      safeCheckpoint: true,
    },
  },
  items: [
    {
      id: 'ITM-G01-001',
      name: '应急手灯',
      description: '独立供电的维修手灯，可照清熔断配电盒。',
      inventoryIcon: '/assets/items/ITM-G01-001-layer-v2.png',
      collectibleLayer: {
        source: '/assets/items/ITM-G01-001-layer-v2.png',
        scope: 'scene',
        area: { x: 10.2, y: 49.2, width: 9.8, height: 9.8 },
        rotation: -14,
      },
    },
    {
      id: 'ITM-G01-002',
      name: '临时保险丝',
      description: '带浅青色环带的完整陶瓷保险丝，关键道具。',
      inventoryIcon: '/assets/items/ITM-G01-002-layer.png',
      collectibleLayer: {
        source: '/assets/items/ITM-G01-002-layer.png',
        scope: 'zoom',
        area: { x: 37, y: 18.5, width: 10, height: 6.5 },
        rotation: 13,
      },
    },
    {
      id: 'ITM-G01-003',
      name: '旧扳手',
      description: '磨损严重的维修扳手，本场景无需带走。',
      collectToInventory: false,
      collectibleLayer: {
        source: '/assets/items/ITM-G01-003-layer.png',
        scope: 'zoom',
        area: { x: 48, y: 57, width: 15, height: 10 },
        rotation: 19,
      },
    },
    {
      id: 'RUNTIME-ITM-G01-SCN00-GLOVE',
      name: '绝缘手套',
      description: '一副厚重的绝缘工作手套。',
      collectToInventory: false,
      collectibleLayer: {
        source: '/assets/items/ITM-G01-004-layer.png',
        scope: 'zoom',
        area: { x: 18, y: 52, width: 12, height: 17 },
        rotation: -17,
      },
    },
    {
      id: 'RUNTIME-ITM-G01-SCN00-LABEL',
      name: '线号标签',
      description: '没有可读文字的旧线号标签。',
      collectToInventory: false,
      collectibleLayer: {
        source: '/assets/items/ITM-G01-005-layer.png',
        scope: 'zoom',
        area: { x: 68, y: 39, width: 8.5, height: 14 },
        rotation: 27,
      },
    },
  ],
  hotspots: [
    {
      id: 'HS-G01-0001',
      kind: 'hidden-item',
      ariaLabel: '检查左侧工作台上的应急手灯',
      area: { x: 10.2, y: 49.2, width: 9.8, height: 9.8 },
      activeStates: ['S0'],
      itemId: 'ITM-G01-001',
      scope: 'scene',
    },
    {
      id: 'HS-G01-0002',
      kind: 'use-target',
      ariaLabel: '熔断配电盒',
      area: { x: 30, y: 37, width: 10, height: 18 },
      activeStates: ['S1'],
      requiredItemId: 'ITM-G01-001',
      consumeItem: false,
      scope: 'scene',
    },
    {
      id: 'HS-G01-0003',
      kind: 'zoom',
      ariaLabel: '打开右侧维修柜局部特写',
      area: { x: 77, y: 18, width: 18, height: 48 },
      activeStates: ['S2'],
      zoomId: 'HOS-G01-001',
      scope: 'scene',
    },
    {
      id: 'HOS-G01-001-01',
      kind: 'hidden-item',
      ariaLabel: '维修柜中的完整临时保险丝',
      area: { x: 37, y: 18.5, width: 10, height: 6.5 },
      activeStates: ['S2'],
      itemId: 'ITM-G01-002',
      scope: 'zoom',
    },
    {
      id: 'HOS-G01-001-02',
      kind: 'hidden-item',
      ariaLabel: '维修柜中的旧扳手',
      area: { x: 48, y: 57, width: 15, height: 10 },
      activeStates: ['S2'],
      itemId: 'ITM-G01-003',
      scope: 'zoom',
    },
    {
      id: 'HOS-G01-001-03',
      kind: 'hidden-item',
      ariaLabel: '维修柜中的绝缘手套',
      area: { x: 18, y: 52, width: 12, height: 17 },
      activeStates: ['S2'],
      itemId: 'RUNTIME-ITM-G01-SCN00-GLOVE',
      scope: 'zoom',
    },
    {
      id: 'HOS-G01-001-04',
      kind: 'hidden-item',
      ariaLabel: '维修柜中的线号标签',
      area: { x: 68, y: 39, width: 8.5, height: 14 },
      activeStates: ['S2'],
      itemId: 'RUNTIME-ITM-G01-SCN00-LABEL',
      scope: 'zoom',
    },
    {
      id: 'HS-G01-0004',
      kind: 'use-target',
      ariaLabel: '应急照明槽',
      area: { x: 51, y: 36, width: 7, height: 17 },
      activeStates: ['S3'],
      requiredItemId: 'ITM-G01-002',
      scope: 'scene',
    },
    {
      id: 'HS-G01-0005',
      kind: 'inspect',
      ariaLabel: '合上应急照明保护开关',
      area: { x: 58, y: 36, width: 6, height: 17 },
      activeStates: ['S4'],
      scope: 'scene',
    },
    {
      id: 'HS-G01-0006',
      kind: 'inspect',
      ariaLabel: '进入寻找七码的下一场景入口',
      area: { x: 77, y: 18, width: 18, height: 48 },
      activeStates: ['S5'],
      scope: 'scene',
    },
  ],
  transitions: [
    { from: 'S0', event: 'found:all', to: 'S1' },
    { from: 'S1', event: 'use:ITM-G01-001:HS-G01-0002', to: 'S2' },
    { from: 'S2', event: 'found:all', to: 'S3' },
    { from: 'S3', event: 'use:ITM-G01-002:HS-G01-0004', to: 'S4' },
    { from: 'S4', event: 'inspect:HS-G01-0005', to: 'S5' },
    { from: 'S5', event: 'inspect:HS-G01-0006', to: 'S6' },
  ],
  scenes: [
    G01_SCN01,
    G01_SCN02,
    G01_SCN03,
    G01_SCN04,
    G01_SCN05,
    G01_SCN06,
    G01_SCN07,
    G02_BOUNDARY,
  ],
}

export const G01_SCENE_ART = '/assets/g01-cockpit.png'
export const G01_CLOSED_SCENE_ART = '/assets/g01-cockpit-cabinet-closed-v2.png'
export const G01_CABINET_ART = '/assets/g01-maintenance-cabinet-v2.png'
