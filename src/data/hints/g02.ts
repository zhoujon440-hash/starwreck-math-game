export type G02HintSemantics = 'direction' | 'area' | 'complete_one_step'

export type G02HintEffect =
  | 'direction_only'
  | 'highlight_current_region'
  | 'advance_pulse_control'
  | 'assign_one_resource_label'
  | 'install_one_power_key'

export type G02HintDefinition = {
  hintId: string
  taskId: string
  sceneId: 'SCN-G02-00' | 'SCN-G02-01' | 'SCN-G02-02'
  level: 1 | 2 | 3
  semantics: G02HintSemantics
  text: string
  effect: G02HintEffect
}

export const G02_HINTS: readonly G02HintDefinition[] = [
  {
    hintId: 'RUNTIME-HINT-G02-00-1',
    taskId: 'RUNTIME-HINT-G02-00',
    sceneId: 'SCN-G02-00',
    level: 1,
    semantics: 'direction',
    text: '先在断卫星轴背风侧观察蓝色脉冲，不要离开掩体。',
    effect: 'direction_only',
  },
  {
    hintId: 'RUNTIME-HINT-G02-00-2',
    taskId: 'RUNTIME-HINT-G02-00',
    sceneId: 'SCN-G02-00',
    level: 2,
    semantics: 'area',
    text: '扫描窗会重复显示两组等长脉冲，中间留有较短的低谷。',
    effect: 'highlight_current_region',
  },
  {
    hintId: 'RUNTIME-HINT-G02-00-3',
    taskId: 'RUNTIME-HINT-G02-00',
    sceneId: 'SCN-G02-00',
    level: 3,
    semantics: 'complete_one_step',
    text: '七码会把一个尚未校准的取样控制量调整到合法位置。',
    effect: 'advance_pulse_control',
  },
  {
    hintId: 'RUNTIME-HINT-G02-01-1',
    taskId: 'RUNTIME-HINT-G02-01',
    sceneId: 'SCN-G02-01',
    level: 1,
    semantics: 'direction',
    text: '先看标签的磨损轮廓，再判断资源箱仍连接着什么。',
    effect: 'direction_only',
  },
  {
    hintId: 'RUNTIME-HINT-G02-01-2',
    taskId: 'RUNTIME-HINT-G02-01',
    sceneId: 'SCN-G02-01',
    level: 2,
    semantics: 'area',
    text: '双环、三路接头和断裂边缘分别出现在三只不同的资源箱上。',
    effect: 'highlight_current_region',
  },
  {
    hintId: 'RUNTIME-HINT-G02-01-3',
    taskId: 'RUNTIME-HINT-G02-01',
    sceneId: 'SCN-G02-01',
    level: 3,
    semantics: 'complete_one_step',
    text: '七码会把一枚尚未归位的标签放入正确资源槽。',
    effect: 'assign_one_resource_label',
  },
  {
    hintId: 'HINT-G02-001-1',
    taskId: 'HINT-G02-001',
    sceneId: 'SCN-G02-02',
    level: 1,
    semantics: 'direction',
    text: '先检查屏幕碎片堆，缺少的不是整块屏幕。',
    effect: 'direction_only',
  },
  {
    hintId: 'HINT-G02-001-2',
    taskId: 'HINT-G02-001',
    sceneId: 'SCN-G02-02',
    level: 2,
    semantics: 'area',
    text: '三枚电源键的边缘磨损分别对应三块主屏。',
    effect: 'highlight_current_region',
  },
  {
    hintId: 'HINT-G02-001-3',
    taskId: 'HINT-G02-001',
    sceneId: 'SCN-G02-02',
    level: 3,
    semantics: 'complete_one_step',
    text: '自动将一枚正确电源键放入对应槽。',
    effect: 'install_one_power_key',
  },
]

export const g02HintFor = (
  sceneId: string,
  level: 1 | 2 | 3,
): G02HintDefinition | undefined =>
  G02_HINTS.find((hint) => hint.sceneId === sceneId && hint.level === level)

export const g02HintById = (hintId: string | undefined): G02HintDefinition | undefined =>
  G02_HINTS.find((hint) => hint.hintId === hintId)
