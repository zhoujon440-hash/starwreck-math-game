import { sceneExperience } from '../data/trial/sceneExperiences'
import { initialMechanicProgress, TRIAL_MECHANICS } from '../game/minigames/trialMechanics'
import type { GameSession } from '../game/types'

const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
})[character] ?? character)

const tokenLabels: Record<string, string> = {
  'input-junction': '输入接点', 'relay-junction': '继电接点', 'output-junction': '保护接点',
  cyan: '青色脉冲', amber: '琥珀脉冲', violet: '紫色脉冲', white: '白色脉冲',
  pressure: '测量压力', patch: '封堵裂口', repress: '恢复舱压',
  inlet: '入口阀', 'upper-valve': '上层阀', 'lower-valve': '下层阀', 'ice-pocket': '结冰盲道', gauge: '压力表',
  'fragment-a': '机械碎片 A', 'fragment-b': '机械碎片 B', 'fragment-c': '机械碎片 C',
  'node-a': '航标 A', 'node-b': '航标 B', 'wreck-field': '残骸密集区', 'bypass-window': '旁路时窗', 'safe-landing': '着陆航标',
  double: '双闪图形', triple: '三闪图形', single: '单闪图形', echo: '回波图形',
  'weight-2-left': '二格配重', 'weight-1-right': '一格配重', 'weight-3-left': '三格配重',
  'borrow-heater': '供暖器·借出', 'use-heater': '供暖器·用途', 'return-heater': '供暖器·归还',
  'borrow-screen': '屏片·借出', 'use-screen': '屏片·用途', 'return-screen': '屏片·归还',
}

const statusCopy = {
  initial: '尚未连接', error: '当前一步未接通，已确认进度保留', partial: '已确认部分步骤', complete: '机关完成',
} as const

export class TrialMechanicPanel {
  render(session: GameSession): string {
    const experience = sceneExperience(session.currentSceneId)
    if (!experience) return ''
    const definition = TRIAL_MECHANICS[experience.mechanicType]
    const progress = session.mechanicProgress[experience.mechanicId] ?? initialMechanicProgress(session.currentSceneId)
    const controls = definition.targetValues
      ? Object.keys(definition.targetValues).map((token) => this.#valueControl(experience.mechanicType, token, progress.values[token])).join('')
      : definition.tokens.map((token, index) => this.#tokenControl(experience.mechanicType, token, index, progress.confirmedSteps)).join('')

    return `
      <div class="modal-backdrop trial-mechanic-backdrop" data-action="close-puzzle"></div>
      <section class="zoom-modal trial-mechanic-panel mechanic-${experience.mechanicType}" role="dialog" aria-modal="true" aria-labelledby="trial-mechanic-title" data-trial-mechanic="${experience.mechanicType}" data-mechanic-id="${experience.mechanicId}" data-mechanic-status="${progress.status}">
        <header><div><span>独立机关 · ${experience.order + 1}/11</span><h2 id="trial-mechanic-title">${escapeHtml(definition.title)}</h2></div><button class="icon-button" data-action="close-puzzle" aria-label="关闭${escapeHtml(definition.title)}">×</button></header>
        <p class="mechanic-instruction">${escapeHtml(definition.instruction)}</p>
        ${this.#visual(experience.mechanicType, progress.confirmedSteps.length, progress.values)}
        <div class="mechanic-controls" data-mechanic-control-count="${definition.tokens.length}">${controls}</div>
        <div class="mechanic-status is-${progress.status}" role="status"><i aria-hidden="true"></i><span>${statusCopy[progress.status]}</span><small>错误 ${progress.mistakes} 次</small></div>
        <footer><button class="secondary-action" data-action="mechanic-reset">重置本次尝试</button>${definition.targetValues ? '<button class="primary-action" data-action="mechanic-submit">锁定当前状态</button>' : ''}</footer>
      </section>`
  }

  #valueControl(type: string, token: string, rawValue: string | number | boolean | undefined): string {
    if (type === 'rotating-circuit') {
      const rotation = Number(rawValue ?? 0) % 4
      return `<button class="circuit-junction rotation-${rotation}" data-action="mechanic-rotate" data-mechanic-target="${token}" data-mechanic-value="${rotation}" aria-label="旋转${tokenLabels[token]}"><span aria-hidden="true">⌁</span><small>${tokenLabels[token]}</small></button>`
    }
    const defaults: Record<string, number> = { frequency: 18, phase: 82, gain: 26, pitch: 22, roll: 78 }
    const value = Number(rawValue ?? defaults[token] ?? 0)
    return `<label class="mechanic-slider"><span>${token === 'frequency' ? '频段' : token === 'phase' ? '相位' : token === 'gain' ? '增益' : token === 'pitch' ? '俯仰' : '横滚'}</span><input type="range" min="0" max="100" value="${value}" data-mechanic-range="${token}" aria-label="调整${token}"><output>${value}</output></label>`
  }

  #tokenControl(type: string, token: string, index: number, confirmed: string[]): string {
    const done = confirmed.includes(token)
    const draggable = ['task-order', 'star-map-snap', 'crane-counterweight', 'borrow-use-return'].includes(type)
    return `<button class="mechanic-token token-${index} ${done ? 'is-confirmed' : ''}" data-action="mechanic-choose" data-mechanic-target="${token}" ${draggable ? 'draggable="true" data-mechanic-draggable="true"' : ''} aria-pressed="${done}"><i aria-hidden="true"></i><span>${escapeHtml(tokenLabels[token] ?? `机关片 ${index + 1}`)}</span></button>`
  }

  #visual(type: string, confirmed: number, values: Record<string, string | number | boolean>): string {
    if (type === 'airflow-maze') return `<div class="mechanic-visual airflow-board" aria-label="气流迷宫"><div class="airflow-path" style="--path-progress:${confirmed}"></div>${Array.from({ length: 15 }, (_, i) => `<i class="cell cell-${i}"></i>`).join('')}</div>`
    if (type === 'star-map-snap') return `<div class="mechanic-visual star-snap-board" data-mechanic-dropzone="star-map"><i></i><i></i><i></i><span>机械星门环</span></div>`
    if (type === 'garbage-route') return `<div class="mechanic-visual route-board"><span class="route-line" style="--route-progress:${confirmed}"></span><i class="debris debris-a"></i><i class="debris debris-b"></i><i class="debris debris-c"></i></div>`
    if (type === 'waveform-tuning') return `<div class="mechanic-visual waveform-board"><i style="--wave-offset:${Number(values.phase ?? 82)}%"></i><i style="--wave-offset:${Number(values.frequency ?? 18)}%"></i><i style="--wave-offset:${Number(values.gain ?? 26)}%"></i></div>`
    if (type === 'attitude-balance') return `<div class="mechanic-visual attitude-board"><span class="horizon" style="--pitch:${Number(values.pitch ?? 22)};--roll:${Number(values.roll ?? 78)}"></span><i class="safe-band"></i></div>`
    if (type === 'crane-counterweight') return `<div class="mechanic-visual crane-board" data-mechanic-dropzone="crane"><span class="crane-beam" style="--balance:${confirmed}"></span><i class="almao-marker"></i></div>`
    if (type === 'borrow-use-return') return `<div class="mechanic-visual archive-logic-board" data-mechanic-dropzone="archive"><span>借出</span><span>用途</span><span>归还</span></div>`
    if (type === 'signal-memory') return `<div class="mechanic-visual memory-display"><span>启动脉冲</span><div>${Array.from({ length: 4 }, (_, i) => `<i class="${i < confirmed ? 'is-lit' : ''}"></i>`).join('')}</div></div>`
    if (type === 'pattern-decode') return `<div class="mechanic-visual pattern-display"><i></i><i></i><i></i><span>?</span></div>`
    if (type === 'task-order') return `<div class="mechanic-visual task-timeline" data-mechanic-dropzone="timeline">${Array.from({ length: 3 }, (_, i) => `<i class="${i < confirmed ? 'is-filled' : ''}">${i + 1}</i>`).join('')}</div>`
    return `<div class="mechanic-visual circuit-board"><span class="circuit-flow" style="--circuit-progress:${confirmed}"></span></div>`
  }
}
