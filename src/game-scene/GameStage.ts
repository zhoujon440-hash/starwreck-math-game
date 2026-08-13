import type { GameSession } from '../game/types'
import type { SceneCamera } from './SceneCamera'
import type { ScenePresentation, SceneWorldVisualState } from './types'

const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
})[character] ?? character)

const areaStyle = (area: ScenePresentation['device']['area']): string =>
  `left:${area.x}%;top:${area.y}%;width:${area.width}%;height:${area.height}%`

export class GameStage {
  runtimeLayer(
    session: GameSession,
    entry: ScenePresentation | undefined,
    worldState: SceneWorldVisualState,
    camera: SceneCamera,
    mechanicAvailable: boolean,
    mechanicId: string | undefined,
    hotspotId?: string,
    hotspotLabel?: string,
  ): string {
    if (!entry) return ''
    const completed = worldState === 'complete'
    const active = camera.targetId === entry.device.id || camera.targetId === mechanicId
    return `
      <div class="game-stage-runtime" data-stage-layer="objects" data-coordinate-space="${entry.coordinateSpace}">
        <div
          class="stage-device effect-${entry.world.effect} state-${worldState} ${active ? 'is-active' : ''}"
          style="${areaStyle(entry.device.area)}"
          data-scene-object="${entry.device.id}"
          data-object-state="${completed ? 'completed' : active ? 'active' : 'idle'}"
          data-world-visual-state="${worldState}"
          aria-label="${escapeHtml(entry.device.label)}：${escapeHtml(entry.world[worldState])}"
        >
          <i class="device-energy-path" aria-hidden="true"></i>
          <i class="device-world-change" aria-hidden="true"></i>
          ${mechanicAvailable && mechanicId ? `<button class="stage-device-entry" data-action="open-stage-mechanic" data-zoom-id="${escapeHtml(mechanicId)}" ${hotspotId ? `data-hotspot-id="${escapeHtml(hotspotId)}"` : ''} aria-label="${escapeHtml(hotspotLabel ?? `聚焦操作${entry.device.label}`)}"><span class="sr-only">${escapeHtml(hotspotLabel ?? `聚焦操作${entry.device.label}`)}</span></button>` : ''}
        </div>
        <div class="stage-fx-layer effect-${entry.world.effect} state-${worldState}" data-stage-layer="fx" aria-hidden="true"><i></i><i></i><i></i></div>
        <div class="stage-world-status" data-world-copy="${worldState}" aria-live="polite"><span>${escapeHtml(entry.world[worldState])}</span></div>
        <span class="stage-session-marker" hidden data-scene-state="${session.sceneState}" data-camera-mode="${camera.mode}"></span>
      </div>`
  }
}
