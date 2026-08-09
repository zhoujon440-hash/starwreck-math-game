import { sceneExperience, type TrialMechanicType } from '../../data/trial/sceneExperiences'
import type { TrialMechanicProgress } from '../types'

export type TrialMechanicAction = {
  kind: 'choose' | 'set' | 'submit' | 'reset'
  target?: string
  value?: number
}

export type TrialMechanicDefinition = {
  type: TrialMechanicType
  title: string
  instruction: string
  tokens: readonly string[]
  targetValues?: Readonly<Record<string, number>>
  sequence?: readonly string[]
}

export const TRIAL_MECHANICS: Readonly<Record<TrialMechanicType, TrialMechanicDefinition>> = {
  'rotating-circuit': {
    type: 'rotating-circuit', title: '旋转电路连线', instruction: '旋转三个接点，让发光线路从输入端连续到保护开关。',
    tokens: ['input-junction', 'relay-junction', 'output-junction'],
    targetValues: { 'input-junction': 1, 'relay-junction': 2, 'output-junction': 3 },
  },
  'signal-memory': {
    type: 'signal-memory', title: '启动信号记忆', instruction: '观察托架闪烁顺序，再依次复现四段启动脉冲。',
    tokens: ['cyan', 'amber', 'violet', 'white'], sequence: ['amber', 'cyan', 'white', 'violet'],
  },
  'task-order': {
    type: 'task-order', title: '任务依赖排序', instruction: '按维修依赖把三张任务卡拖入时间线。',
    tokens: ['repress', 'pressure', 'patch'], sequence: ['pressure', 'patch', 'repress'],
  },
  'airflow-maze': {
    type: 'airflow-maze', title: '气流迷宫', instruction: '沿不会造成压差反冲的阀格，引导气流抵达压力表。',
    tokens: ['inlet', 'upper-valve', 'ice-pocket', 'lower-valve', 'gauge'], sequence: ['inlet', 'lower-valve', 'upper-valve', 'gauge'],
  },
  'star-map-snap': {
    type: 'star-map-snap', title: '星图拖动旋转吸附', instruction: '旋转并拖动三片星图，使机械缺口与环槽咬合。',
    tokens: ['fragment-c', 'fragment-a', 'fragment-b'], sequence: ['fragment-a', 'fragment-b', 'fragment-c'],
  },
  'garbage-route': {
    type: 'garbage-route', title: '垃圾雨路线规划', instruction: '逐段选择安全航标；碰撞只撤销当前选择。',
    tokens: ['node-a', 'wreck-field', 'node-b', 'bypass-window', 'safe-landing'], sequence: ['node-a', 'node-b', 'bypass-window', 'safe-landing'],
  },
  'waveform-tuning': {
    type: 'waveform-tuning', title: '波形调谐', instruction: '拖动频段、相位与增益滑杆，让三层波形重合。',
    tokens: ['frequency', 'phase', 'gain'], targetValues: { frequency: 62, phase: 38, gain: 74 },
  },
  'attitude-balance': {
    type: 'attitude-balance', title: '姿态平衡与时机锁定', instruction: '把俯仰和横滚保持在安全带内，再在稳定窗口锁定。',
    tokens: ['pitch', 'roll'], targetValues: { pitch: 50, roll: 50 },
  },
  'pattern-decode': {
    type: 'pattern-decode', title: '脉冲规律解码', instruction: '根据图形的间隔、亮度和回波层数复原下一组三格脉冲。',
    tokens: ['double', 'triple', 'single', 'echo'], sequence: ['triple', 'double', 'triple'],
  },
  'crane-counterweight': {
    type: 'crane-counterweight', title: '吊臂配重救援', instruction: '把三块配重拖到左右挂点，使吊臂进入安全平衡区后释放。',
    tokens: ['weight-2-left', 'weight-1-right', 'weight-3-left'], sequence: ['weight-2-left', 'weight-1-right', 'weight-3-left'],
  },
  'borrow-use-return': {
    type: 'borrow-use-return', title: '借用档案逻辑配对', instruction: '把借出、用途与归还记录按同一物件配成闭环。',
    tokens: ['borrow-heater', 'use-heater', 'return-heater', 'borrow-screen', 'use-screen', 'return-screen'],
    sequence: ['borrow-heater', 'use-heater', 'return-heater', 'borrow-screen', 'use-screen', 'return-screen'],
  },
}

export const initialMechanicProgress = (sceneId: string): TrialMechanicProgress => {
  const experience = sceneExperience(sceneId)
  if (!experience) throw new Error(`No trial mechanic for ${sceneId}`)
  return {
    mechanicType: experience.mechanicType,
    status: 'initial',
    confirmedSteps: [],
    values: {},
    mistakes: 0,
  }
}

const valuesComplete = (definition: TrialMechanicDefinition, progress: TrialMechanicProgress): boolean =>
  Object.entries(definition.targetValues ?? {}).every(
    ([key, target]) => Number(progress.values[key] ?? -1) === target,
  )

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

  if (action.kind === 'set' && action.target && action.value !== undefined) {
    const target = definition.targetValues?.[action.target]
    if (target === undefined) return next
    const normalized = Math.max(0, Math.min(100, Math.round(action.value)))
    next.values[action.target] = normalized
    if (experience.mechanicType === 'rotating-circuit') {
      const rotation = normalized % 4
      next.values[action.target] = rotation
      if (rotation === target && !next.confirmedSteps.includes(action.target)) next.confirmedSteps.push(action.target)
      else if (rotation !== target) next.confirmedSteps = next.confirmedSteps.filter((step) => step !== action.target)
      next.status = valuesComplete(definition, next) ? 'complete' : next.confirmedSteps.length ? 'partial' : 'initial'
      return next
    }
    next.status = valuesComplete(definition, next) ? 'complete' : 'partial'
    return next
  }

  if (action.kind === 'choose' && action.target && definition.sequence) {
    const expected = definition.sequence[next.confirmedSteps.length]
    if (action.target !== expected) {
      next.status = 'error'
      next.mistakes += 1
      return next
    }
    next.confirmedSteps.push(action.target)
    next.status = next.confirmedSteps.length === definition.sequence.length ? 'complete' : 'partial'
    return next
  }

  if (action.kind === 'submit') {
    if (valuesComplete(definition, next)) next.status = 'complete'
    else {
      next.status = 'error'
      next.mistakes += 1
    }
  }
  return next
}

