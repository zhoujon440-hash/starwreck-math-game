import { sceneExperience, type TrialMechanicType } from '../../data/trial/sceneExperiences'
import type { TrialMechanicProgress } from '../types'

export type TrialMechanicAction = {
  kind: 'choose' | 'set' | 'place' | 'rotate' | 'play' | 'submit' | 'reset'
  target?: string
  slot?: string
  value?: number
}

export type TrialMechanicDefinition = {
  type: TrialMechanicType
  title: string
  instruction: string
  tokens: readonly string[]
  targetValues?: Readonly<Record<string, number>>
  sequence?: readonly string[]
  targetPlacements?: Readonly<Record<string, string>>
}

export const TRIAL_MECHANICS: Readonly<Record<TrialMechanicType, TrialMechanicDefinition>> = {
  'rotating-circuit': {
    type: 'rotating-circuit', title: '旋转电路连线',
    instruction: '分别旋转三个独立接点，让发光线路从输入端连续接到保护开关。',
    tokens: ['input-junction', 'relay-junction', 'output-junction'],
    targetValues: { 'input-junction': 1, 'relay-junction': 2, 'output-junction': 3 },
  },
  'signal-memory': {
    type: 'signal-memory', title: '启动信号记忆',
    instruction: '先播放托架闪烁信号，再用四枚灯键复现；错误会开始一次新尝试。',
    tokens: ['cyan', 'amber', 'violet', 'white'], sequence: ['amber', 'cyan', 'white', 'violet'],
  },
  'task-order': {
    type: 'task-order', title: '任务依赖排序',
    instruction: '把三张任务卡拖到时间线槽位，调整完成后统一提交依赖顺序。',
    tokens: ['repress', 'pressure', 'patch'],
    targetPlacements: { pressure: 'timeline-1', patch: 'timeline-2', repress: 'timeline-3' },
  },
  'airflow-maze': {
    type: 'airflow-maze', title: '气流迷宫',
    instruction: '沿相邻阀格引导气流；结冰盲道会报错，但已通过的阀格不会丢失。',
    tokens: ['inlet', 'upper-valve', 'ice-pocket', 'lower-valve', 'gauge'],
    sequence: ['inlet', 'lower-valve', 'upper-valve', 'gauge'],
  },
  'star-map-snap': {
    type: 'star-map-snap', title: '星图拖动旋转吸附',
    instruction: '分别旋转并拖动三片星图到轮环缺口；位置与角度都正确才会吸附。',
    tokens: ['fragment-c', 'fragment-a', 'fragment-b'],
    targetValues: { 'fragment-a': 1, 'fragment-b': 3, 'fragment-c': 2 },
    targetPlacements: { 'fragment-a': 'star-slot-a', 'fragment-b': 'star-slot-b', 'fragment-c': 'star-slot-c' },
  },
  'garbage-route': {
    type: 'garbage-route', title: '垃圾雨路线规划',
    instruction: '沿可见连线逐段选择航标；危险残骸或不相邻节点只撤销当前一步。',
    tokens: ['node-a', 'wreck-field', 'node-b', 'bypass-window', 'safe-landing'],
    sequence: ['node-a', 'node-b', 'bypass-window', 'safe-landing'],
  },
  'waveform-tuning': {
    type: 'waveform-tuning', title: '波形调谐',
    instruction: '连续拖动频段、相位与增益滑杆，观察三层波形后锁定重合位置。',
    tokens: ['frequency', 'phase', 'gain'], targetValues: { frequency: 62, phase: 38, gain: 74 },
  },
  'attitude-balance': {
    type: 'attitude-balance', title: '姿态平衡与时机锁定',
    instruction: '同时调节俯仰和横滚两条连续轴，使地平线进入中央安全区后锁定。',
    tokens: ['pitch', 'roll'], targetValues: { pitch: 50, roll: 50 },
  },
  'pattern-decode': {
    type: 'pattern-decode', title: '脉冲规律解码',
    instruction: '调节三格脉冲的回波层数，让波峰与背景节拍吻合后提交取样。',
    tokens: ['pulse-1', 'pulse-2', 'pulse-3'], targetValues: { 'pulse-1': 3, 'pulse-2': 2, 'pulse-3': 3 },
  },
  'crane-counterweight': {
    type: 'crane-counterweight', title: '吊臂配重救援',
    instruction: '把三块不同质量的实体配重拖到左右挂点，使吊臂回到救援平衡区。',
    tokens: ['weight-1', 'weight-2', 'weight-3'],
    targetPlacements: { 'weight-1': 'right-far', 'weight-2': 'right-near', 'weight-3': 'left-near' },
  },
  'borrow-use-return': {
    type: 'borrow-use-return', title: '借用档案逻辑配对',
    instruction: '把六张实体记录卡拖到对应物件的借出、用途与归还位置，再核对闭环。',
    tokens: ['borrow-heater', 'use-heater', 'return-heater', 'borrow-screen', 'use-screen', 'return-screen'],
    targetPlacements: {
      'borrow-heater': 'heater-borrow', 'use-heater': 'heater-use', 'return-heater': 'heater-return',
      'borrow-screen': 'screen-borrow', 'use-screen': 'screen-use', 'return-screen': 'screen-return',
    },
  },
}

export const initialMechanicProgress = (sceneId: string): TrialMechanicProgress => {
  const experience = sceneExperience(sceneId)
  if (!experience) throw new Error(`No trial mechanic for ${sceneId}`)
  return { mechanicType: experience.mechanicType, status: 'initial', confirmedSteps: [], values: {}, mistakes: 0 }
}

const valuesComplete = (definition: TrialMechanicDefinition, progress: TrialMechanicProgress): boolean =>
  Object.entries(definition.targetValues ?? {}).every(([key, target]) => Number(progress.values[key] ?? -1) === target)

const placementsComplete = (definition: TrialMechanicDefinition, progress: TrialMechanicProgress): boolean =>
  Object.entries(definition.targetPlacements ?? {}).every(([token, slot]) => progress.values[`place:${token}`] === slot)

const markError = (progress: TrialMechanicProgress): TrialMechanicProgress => {
  progress.status = 'error'
  progress.mistakes += 1
  return progress
}

export const nextLegalMechanicAction = (
  definition: TrialMechanicDefinition,
  progress: TrialMechanicProgress,
): TrialMechanicAction | undefined => {
  if (definition.type === 'signal-memory' && progress.values.playbackSeen !== true) return { kind: 'play' }
  if (definition.sequence) {
    const target = definition.sequence[progress.confirmedSteps.length]
    return target ? { kind: 'choose', target } : undefined
  }
  const placement = Object.entries(definition.targetPlacements ?? {}).find(
    ([token, slot]) => progress.values[`place:${token}`] !== slot,
  )
  if (placement) return { kind: 'place', target: placement[0], slot: placement[1] }
  const value = Object.entries(definition.targetValues ?? {}).find(
    ([target, wanted]) => Number(progress.values[target] ?? -1) !== wanted,
  )
  return value ? { kind: 'set', target: value[0], value: value[1] } : undefined
}

export const applyTrialMechanicAction = (
  sceneId: string,
  current: TrialMechanicProgress | undefined,
  action: TrialMechanicAction,
): TrialMechanicProgress => {
  const experience = sceneExperience(sceneId)
  if (!experience) throw new Error(`No trial mechanic for ${sceneId}`)
  const definition = TRIAL_MECHANICS[experience.mechanicType]
  const next = structuredClone(current ?? initialMechanicProgress(sceneId))
  if (next.status === 'complete') return next
  if (action.kind === 'reset') return initialMechanicProgress(sceneId)

  if (action.kind === 'play' && definition.type === 'signal-memory') {
    next.values.playbackSeen = true
    next.confirmedSteps = []
    next.status = 'initial'
    return next
  }

  if (action.kind === 'set' && action.target && action.value !== undefined) {
    if (definition.targetValues?.[action.target] === undefined) return next
    const maximum = definition.type === 'rotating-circuit' || definition.type === 'star-map-snap'
      ? 3
      : definition.type === 'pattern-decode' ? 4 : 100
    next.values[action.target] = Math.max(0, Math.min(maximum, Math.round(action.value)))
    next.status = 'partial'
    return next
  }

  if (action.kind === 'rotate' && action.target && definition.targetValues?.[action.target] !== undefined) {
    next.values[action.target] = (Number(next.values[action.target] ?? 0) + 1) % 4
    next.status = 'partial'
    return next
  }

  if (action.kind === 'place' && action.target && action.slot && definition.targetPlacements?.[action.target]) {
    if (!Object.values(definition.targetPlacements).includes(action.slot)) return markError(next)
    for (const token of definition.tokens) {
      if (token !== action.target && next.values[`place:${token}`] === action.slot) delete next.values[`place:${token}`]
    }
    next.values[`place:${action.target}`] = action.slot
    next.confirmedSteps = definition.tokens.filter((token) => Boolean(next.values[`place:${token}`]))
    next.status = 'partial'
    return next
  }

  if (action.kind === 'choose' && action.target && definition.sequence) {
    if (definition.type === 'signal-memory' && next.values.playbackSeen !== true) return markError(next)
    const expected = definition.sequence[next.confirmedSteps.length]
    if (action.target !== expected) {
      if (definition.type === 'signal-memory') {
        next.confirmedSteps = []
        next.values.playbackSeen = false
      }
      return markError(next)
    }
    next.confirmedSteps.push(action.target)
    next.status = next.confirmedSteps.length === definition.sequence.length ? 'complete' : 'partial'
    return next
  }

  if (action.kind === 'submit') {
    if (
      (definition.targetValues === undefined || valuesComplete(definition, next)) &&
      (definition.targetPlacements === undefined || placementsComplete(definition, next))
    ) next.status = 'complete'
    else markError(next)
  }
  return next
}
