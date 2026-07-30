import type { SceneDefinition } from '../../game/types'

const asset = (suffix: string) => `/assets/g01/pr-c/scn-g01-07/${suffix}`

export const G01_SCN07: SceneDefinition = {
  id: 'SCN-G01-07',
  title: '锈环星近地轨道',
  playerTitle: '坠落之前',
  art: asset('background/SCENE-G01-008_old_screen_valley_descent.webp'),
  initialState: 'S0',
  states: {
    S0: {
      id: 'S0',
      title: '近地轨道',
      objective: '启动落点扫描，确认旧屏幕谷外缘',
      narrative: '拾光号穿出垃圾雨。旧屏幕谷像一片埋在锈沙里的黑色断层。',
      safeCheckpoint: true,
    },
    S1: {
      id: 'S1',
      title: '落点扫描',
      objective: '使用搜寻、分析和寻路完成三角定位',
      narrative: '搜寻缩小范围，分析比对已经取得的证据，寻路只连接已探索节点。',
    },
    S2: {
      id: 'S2',
      title: '落点记录',
      objective: '在舷窗中央确认安全着陆走廊',
      narrative: '落点扫描记录已经归档。旧屏幕谷外缘的三个安全节点全部可追溯。',
      safeCheckpoint: true,
    },
    S3: {
      id: 'S3',
      title: '垃圾雨冲击',
      objective: '按顺序稳定姿态、缓冲与着陆锁',
      narrative: '最后一片垃圾雨擦过船体。错误顺序会回到最近安全节点，不清空进度。',
    },
    S4: {
      id: 'S4',
      title: '着陆稳定',
      objective: '确认右侧自动存档信标',
      narrative: '姿态已经稳定，求救证据、能力授权和正确航线都保持完整。',
    },
    S5: {
      id: 'S5',
      title: '自动存档',
      objective: '打开左侧舱门，完成G01交接',
      narrative: '离舰前存档已经完成。此刻仍未进入G02玩法。',
      safeCheckpoint: true,
    },
    S6: {
      id: 'S6',
      title: '旧屏幕谷外缘',
      objective: '进入只读交接画面',
      narrative: '舱门外是锈环星旧屏幕谷。序章在交接落点正式结束。',
      safeCheckpoint: true,
    },
  },
  items: [],
  hotspots: [
    {
      id: 'HS-G01-0029',
      kind: 'inspect',
      ariaLabel: '启动中央垃圾雨落点扫描台',
      area: { x: 33, y: 55, width: 42, height: 38 },
      activeStates: ['S0'],
      scope: 'scene',
    },
    {
      id: 'RUNTIME-HS-G01-07-UNSAFE-CORRIDOR',
      kind: 'inspect',
      ariaLabel: '尝试穿过舷窗右上方的不稳定垃圾雨走廊',
      area: { x: 76, y: 13, width: 16, height: 22 },
      activeStates: ['S1', 'S2', 'S3', 'S4'],
      scope: 'scene',
    },
    {
      id: 'RUNTIME-HS-G01-07-LANDING-SCANNER',
      kind: 'zoom',
      ariaLabel: '打开落点扫描台近景',
      area: { x: 35, y: 57, width: 39, height: 33 },
      activeStates: ['S1'],
      zoomId: 'RUNTIME-PUZ-G01-LANDING-TRIANGULATION',
      scope: 'scene',
    },
    {
      id: 'RUNTIME-HS-G01-07-CORRIDOR-CONFIRM',
      kind: 'inspect',
      ariaLabel: '确认舷窗中央的安全着陆走廊',
      area: { x: 45, y: 27, width: 25, height: 31 },
      activeStates: ['S2'],
      scope: 'scene',
    },
    {
      id: 'RUNTIME-HS-G01-07-IMPACT-DAMPING',
      kind: 'zoom',
      ariaLabel: '打开垃圾雨冲击缓冲机关',
      area: { x: 25, y: 60, width: 17, height: 26 },
      activeStates: ['S3'],
      zoomId: 'RUNTIME-PUZ-G01-IMPACT-DAMPING',
      scope: 'scene',
    },
    {
      id: 'HS-G01-0030',
      kind: 'inspect',
      ariaLabel: '确认右侧自动存档信标',
      area: { x: 78, y: 40, width: 14, height: 32 },
      activeStates: ['S4'],
      scope: 'scene',
    },
    {
      id: 'HS-G01-0031',
      kind: 'inspect',
      ariaLabel: '打开左侧拾光号舱门',
      area: { x: 1, y: 22, width: 18, height: 61 },
      activeStates: ['S5'],
      scope: 'scene',
    },
  ],
  transitions: [
    { from: 'S0', event: 'inspect:HS-G01-0029', to: 'S1' },
    {
      from: 'S1',
      event: 'inspect:RUNTIME-HS-G01-07-UNSAFE-CORRIDOR',
      to: 'S1',
    },
    {
      from: 'S2',
      event: 'inspect:RUNTIME-HS-G01-07-UNSAFE-CORRIDOR',
      to: 'S2',
    },
    {
      from: 'S3',
      event: 'inspect:RUNTIME-HS-G01-07-UNSAFE-CORRIDOR',
      to: 'S3',
    },
    {
      from: 'S4',
      event: 'inspect:RUNTIME-HS-G01-07-UNSAFE-CORRIDOR',
      to: 'S4',
    },
    {
      from: 'S1',
      event: 'puzzle:RUNTIME-PUZ-G01-LANDING-TRIANGULATION',
      to: 'S2',
    },
    {
      from: 'S2',
      event: 'inspect:RUNTIME-HS-G01-07-CORRIDOR-CONFIRM',
      to: 'S3',
    },
    {
      from: 'S3',
      event: 'puzzle:RUNTIME-PUZ-G01-IMPACT-DAMPING',
      to: 'S4',
    },
    { from: 'S4', event: 'inspect:HS-G01-0030', to: 'S5' },
    { from: 'S5', event: 'inspect:HS-G01-0031', to: 'S6' },
  ],
}

const boundaryState = {
  id: 'S0' as const,
  title: '旧屏幕谷外缘',
  objective: 'G01试玩已完成',
  narrative: '这里只保留G01到G02的交接画面；锈环星正式玩法尚未开始。',
  safeCheckpoint: true,
}

export const G02_BOUNDARY: SceneDefinition = {
  id: 'G02-BOUNDARY',
  title: '旧屏幕谷外缘交接',
  playerTitle: '旧屏幕谷外缘',
  art: asset('background/SCENE-G01-008_old_screen_valley_descent.webp'),
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
  hotspots: [
    {
      id: 'RUNTIME-HS-G02-HANDOFF',
      kind: 'inspect',
      ariaLabel: '沿旧屏幕谷外缘的正式落点通道进入锈环星',
      area: { x: 66, y: 34, width: 27, height: 46 },
      activeStates: ['S0'],
      scope: 'scene',
    },
  ],
  transitions: [
    {
      from: 'S0',
      event: 'inspect:RUNTIME-HS-G02-HANDOFF',
      to: 'S1',
    },
  ],
}
