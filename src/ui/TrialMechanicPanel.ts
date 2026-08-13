import { sceneExperience } from '../data/trial/sceneExperiences'
import { scenePresentation } from '../data/trial/scenePresentation'
import { initialMechanicProgress, TRIAL_MECHANICS } from '../game/minigames/trialMechanics'
import type { GameSession, TrialMechanicProgress } from '../game/types'
import { MechanicSurface } from '../game-scene/mechanics/MechanicSurface'

const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
})[character] ?? character)

const labels: Record<string, string> = {
  'input-junction': '输入接点', 'relay-junction': '继电接点', 'output-junction': '保护接点',
  cyan: '青色', amber: '琥珀', violet: '紫色', white: '白色',
  pressure: '测量压力', patch: '封堵裂口', repress: '恢复舱压',
  inlet: '入口阀', 'upper-valve': '上层阀', 'lower-valve': '下层阀', 'ice-pocket': '结冰盲道', gauge: '压力表',
  'fragment-a': '星图片 A', 'fragment-b': '星图片 B', 'fragment-c': '星图片 C',
  'node-a': '航标 A', 'node-b': '航标 B', 'wreck-field': '危险残骸', 'bypass-window': '旁路时窗', 'safe-landing': '着陆航标',
  'pulse-1': '第一格', 'pulse-2': '第二格', 'pulse-3': '第三格',
  'weight-1': '轻配重', 'weight-2': '中配重', 'weight-3': '重配重',
  'borrow-heater': '供暖器借出', 'use-heater': '供暖器用途', 'return-heater': '供暖器归还',
  'borrow-screen': '屏片借出', 'use-screen': '屏片用途', 'return-screen': '屏片归还',
}

const statusCopy = { initial: '等待操作', error: '当前操作无效，已确认内容保留', partial: '已形成中间状态', complete: '机关完成' } as const
const placedAt = (progress: TrialMechanicProgress, token: string): string => String(progress.values[`place:${token}`] ?? '')

export class TrialMechanicPanel {
  readonly #surface = new MechanicSurface()

  render(session: GameSession): string {
    const experience = sceneExperience(session.currentSceneId)
    if (!experience) return ''
    const definition = TRIAL_MECHANICS[experience.mechanicType]
    const presentation = scenePresentation(session.currentSceneId)
    const progress = session.mechanicProgress[experience.mechanicId] ?? initialMechanicProgress(session.currentSceneId)
    return this.#surface.render({
      title: definition.title,
      subtitle: presentation?.device.label ?? '场景设备特写',
      mechanicType: experience.mechanicType,
      mechanicId: experience.mechanicId,
      status: progress.status,
      instruction: definition.instruction,
      interaction: this.#interaction(experience.mechanicType, progress),
      statusMarkup: `<div class="mechanic-status is-${progress.status}" role="status"><i aria-hidden="true"></i><span>${statusCopy[progress.status]}</span><small>错误 ${progress.mistakes} 次</small></div>`,
      footer: `<button class="secondary-action" data-action="mechanic-reset">重置本次尝试</button>${this.#needsSubmit(experience.mechanicType) ? '<button class="primary-action" data-action="mechanic-submit">提交当前结构</button>' : ''}`,
    })
  }

  #needsSubmit(type: string): boolean {
    return !['signal-memory', 'airflow-maze', 'garbage-route'].includes(type)
  }

  #interaction(type: string, progress: TrialMechanicProgress): string {
    if (type === 'rotating-circuit') return this.#circuit(progress)
    if (type === 'signal-memory') return this.#memory(progress)
    if (type === 'task-order') return this.#taskOrder(progress)
    if (type === 'airflow-maze') return this.#airflow(progress)
    if (type === 'star-map-snap') return this.#starMap(progress)
    if (type === 'garbage-route') return this.#route(progress)
    if (type === 'waveform-tuning' || type === 'attitude-balance') return this.#continuous(type, progress)
    if (type === 'pattern-decode') return this.#pulse(progress)
    if (type === 'crane-counterweight') return this.#crane(progress)
    return this.#archive(progress)
  }

  #circuit(progress: TrialMechanicProgress): string {
    const tokens = TRIAL_MECHANICS['rotating-circuit'].tokens
    return `<div class="mechanic-visual circuit-board" data-connectivity="independent-ports"><span class="circuit-flow"></span>${tokens.map((token) => {
      const rotation = Number(progress.values[token] ?? 0) % 4
      return `<button class="circuit-junction rotation-${rotation}" data-action="mechanic-rotate" data-mechanic-target="${token}" data-mechanic-value="${rotation}" aria-label="旋转${labels[token]}"><i aria-hidden="true"></i><small>${labels[token]}</small></button>`
    }).join('')}</div>`
  }

  #memory(progress: TrialMechanicProgress): string {
    const playing = progress.values.playbackSeen === true
    return `<div class="mechanic-visual memory-display ${playing ? 'is-played' : ''}" data-playback-seen="${playing}"><button data-action="mechanic-play" class="memory-play">播放启动信号</button><div class="memory-lamps" aria-label="四段闪烁播放区">${['amber', 'cyan', 'white', 'violet'].map((token, index) => `<i class="lamp-${token} flash-${index}" aria-hidden="true"></i>`).join('')}</div></div><div class="mechanic-controls memory-inputs">${TRIAL_MECHANICS['signal-memory'].tokens.map((token) => `<button data-action="mechanic-choose" data-mechanic-target="${token}" class="memory-key key-${token} ${progress.confirmedSteps.includes(token) ? 'is-confirmed' : ''}" ${playing ? '' : 'disabled'} aria-label="输入${labels[token]}脉冲"><i aria-hidden="true"></i><span>${labels[token]}</span></button>`).join('')}</div>`
  }

  #taskOrder(progress: TrialMechanicProgress): string {
    return `<div class="mechanic-drag-layout"><div class="mechanic-card-tray">${TRIAL_MECHANICS['task-order'].tokens.map((token) => this.#dragCard(token, progress)).join('')}</div><div class="mechanic-visual task-timeline">${['timeline-1', 'timeline-2', 'timeline-3'].map((slot, index) => this.#dropSlot(slot, `第 ${index + 1} 步`, progress)).join('')}</div></div>`
  }

  #airflow(progress: TrialMechanicProgress): string {
    const positions: Record<string, string> = { inlet: 'grid-area:3/1', 'lower-valve': 'grid-area:3/3', 'upper-valve': 'grid-area:1/3', gauge: 'grid-area:1/5', 'ice-pocket': 'grid-area:5/3' }
    return `<div class="mechanic-visual airflow-board" aria-label="带分支与盲道的气流迷宫"><svg viewBox="0 0 500 260" aria-hidden="true"><path class="safe-pipe" d="M45 130 H250 V45 H455"/><path class="dead-pipe" d="M250 130 V220"/></svg>${TRIAL_MECHANICS['airflow-maze'].tokens.map((token) => `<button style="${positions[token]}" data-action="mechanic-choose" data-mechanic-target="${token}" class="maze-node ${progress.confirmedSteps.includes(token) ? 'is-confirmed' : ''} ${token === 'ice-pocket' ? 'is-dead-end' : ''}">${labels[token]}</button>`).join('')}</div>`
  }

  #starMap(progress: TrialMechanicProgress): string {
    return `<div class="mechanic-drag-layout star-workspace"><div class="mechanic-card-tray">${TRIAL_MECHANICS['star-map-snap'].tokens.map((token) => `<div class="star-piece-wrap ${this.#placementCorrect(progress, token) ? 'is-placed-correctly' : ''}"><button class="mechanic-token star-piece rotation-${Number(progress.values[token] ?? 0)}" draggable="true" data-mechanic-draggable="true" data-mechanic-target="${token}"><span>${labels[token]}</span></button><button data-action="mechanic-rotate" data-mechanic-target="${token}" data-mechanic-value="${Number(progress.values[token] ?? 0)}" aria-label="旋转${labels[token]}">旋转</button></div>`).join('')}</div><div class="mechanic-visual star-snap-board">${['star-slot-a', 'star-slot-b', 'star-slot-c'].map((slot, index) => this.#dropSlot(slot, `星图缺口 ${String.fromCharCode(65 + index)}`, progress)).join('')}</div></div>`
  }

  #route(progress: TrialMechanicProgress): string {
    const positions: Record<string, string> = { 'node-a': 'left:7%;top:62%', 'node-b': 'left:34%;top:28%', 'wreck-field': 'left:42%;top:70%', 'bypass-window': 'left:63%;top:22%', 'safe-landing': 'left:84%;top:55%' }
    return `<div class="mechanic-visual route-board" aria-label="带危险边约束的垃圾雨航线图"><svg viewBox="0 0 600 220" aria-hidden="true"><path class="safe-edge" d="M55 150 L225 75 L405 65 L545 145"/><path class="danger-edge" d="M225 75 L285 175 L405 65"/></svg>${TRIAL_MECHANICS['garbage-route'].tokens.map((token) => `<button style="${positions[token]}" data-action="mechanic-choose" data-mechanic-target="${token}" class="route-node ${progress.confirmedSteps.includes(token) ? 'is-confirmed' : ''} ${token === 'wreck-field' ? 'is-danger' : ''}">${labels[token]}</button>`).join('')}</div>`
  }

  #continuous(type: string, progress: TrialMechanicProgress): string {
    const definition = TRIAL_MECHANICS[type as 'waveform-tuning' | 'attitude-balance']
    const defaults: Record<string, number> = { frequency: 18, phase: 82, gain: 26, pitch: 22, roll: 78 }
    const visual = type === 'waveform-tuning'
      ? `<div class="mechanic-visual waveform-board">${definition.tokens.map((token) => `<i style="--wave-offset:${Number(progress.values[token] ?? defaults[token])}%"></i>`).join('')}</div>`
      : `<div class="mechanic-visual attitude-board"><span class="horizon" style="--pitch:${Number(progress.values.pitch ?? 22)};--roll:${Number(progress.values.roll ?? 78)}"></span><i class="safe-band"></i></div>`
    return `${visual}<div class="mechanic-controls">${definition.tokens.map((token) => {
      const value = Number(progress.values[token] ?? defaults[token])
      return `<label class="mechanic-slider"><span>${labels[token] ?? token}</span><input type="range" min="0" max="100" value="${value}" data-mechanic-range="${token}" aria-label="调整${labels[token] ?? token}"><output>${value}</output></label>`
    }).join('')}</div>`
  }

  #pulse(progress: TrialMechanicProgress): string {
    return `<div class="mechanic-visual pulse-wave-board" aria-label="三格脉冲波形调节">${TRIAL_MECHANICS['pattern-decode'].tokens.map((token) => {
      const value = Number(progress.values[token] ?? 1)
      return `<label class="pulse-cell"><span>${labels[token]}</span><i style="--pulse-height:${value}" aria-hidden="true"></i><input type="range" min="1" max="4" step="1" value="${value}" data-mechanic-range="${token}" aria-label="调整${labels[token]}回波层数"><output>${value}</output></label>`
    }).join('')}</div>`
  }

  #crane(progress: TrialMechanicProgress): string {
    return `<div class="mechanic-drag-layout"><div class="mechanic-card-tray">${TRIAL_MECHANICS['crane-counterweight'].tokens.map((token) => this.#dragCard(token, progress)).join('')}</div><div class="mechanic-visual crane-board"><div class="crane-beam"><span>救援吊臂</span></div>${['left-far', 'left-near', 'right-near', 'right-far'].map((slot) => this.#dropSlot(slot, ({ 'left-far': '左外挂点', 'left-near': '左内挂点', 'right-near': '右内挂点', 'right-far': '右外挂点' } as Record<string, string>)[slot], progress)).join('')}</div></div>`
  }

  #archive(progress: TrialMechanicProgress): string {
    const slots = ['heater-borrow', 'heater-use', 'heater-return', 'screen-borrow', 'screen-use', 'screen-return']
    return `<div class="mechanic-drag-layout"><div class="mechanic-card-tray archive-record-tray">${TRIAL_MECHANICS['borrow-use-return'].tokens.map((token) => this.#dragCard(token, progress)).join('')}</div><div class="mechanic-visual archive-logic-board"><b>供暖器</b>${slots.slice(0, 3).map((slot, index) => this.#dropSlot(slot, ['借出', '用途', '归还'][index], progress)).join('')}<b>屏片</b>${slots.slice(3).map((slot, index) => this.#dropSlot(slot, ['借出', '用途', '归还'][index], progress)).join('')}</div></div>`
  }

  #dragCard(token: string, progress: TrialMechanicProgress): string {
    const slot = placedAt(progress, token)
    const correct = this.#placementCorrect(progress, token)
    return `<button class="mechanic-token ${slot ? 'is-confirmed' : ''} ${correct ? 'is-placed-correctly' : ''}" draggable="true" data-mechanic-draggable="true" data-mechanic-target="${token}" data-placed-slot="${slot}" aria-label="拖动${escapeHtml(labels[token] ?? token)}"><i aria-hidden="true"></i><span>${escapeHtml(labels[token] ?? token)}</span></button>`
  }

  #placementCorrect(progress: TrialMechanicProgress, token: string): boolean {
    const definition = TRIAL_MECHANICS[progress.mechanicType]
    const placementMatches = definition.targetPlacements?.[token] === placedAt(progress, token)
    const targetValue = definition.targetValues?.[token]
    return placementMatches && (targetValue === undefined || Number(progress.values[token] ?? -1) === targetValue)
  }

  #dropSlot(slot: string, label: string, progress: TrialMechanicProgress): string {
    const occupant = Object.keys(TRIAL_MECHANICS[progress.mechanicType].targetPlacements ?? {}).find((token) => placedAt(progress, token) === slot)
    return `<div class="mechanic-drop-slot ${occupant ? 'is-filled' : ''}" data-mechanic-dropzone="${slot}" aria-label="${escapeHtml(label)}"><span>${escapeHtml(label)}</span>${occupant ? `<strong>${escapeHtml(labels[occupant] ?? occupant)}</strong>` : '<small>拖到这里</small>'}</div>`
  }
}
