export type MechanicSurfaceModel = {
  title: string
  subtitle: string
  mechanicType: string
  mechanicId: string
  status: string
  instruction: string
  interaction: string
  statusMarkup: string
}

const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
})[character] ?? character)

export class MechanicSurface {
  render(model: MechanicSurfaceModel): string {
    return `
      <section
        class="in-world-mechanic mechanic-${escapeHtml(model.mechanicType)}"
        role="region"
        aria-labelledby="trial-mechanic-title"
        data-device-surface="true"
        data-in-world-mechanic="true"
        data-trial-mechanic="${escapeHtml(model.mechanicType)}"
        data-mechanic-id="${escapeHtml(model.mechanicId)}"
        data-mechanic-status="${escapeHtml(model.status)}"
      >
        <div class="in-world-guidance">
          <small>${escapeHtml(model.subtitle)}</small>
          <h2 id="trial-mechanic-title">${escapeHtml(model.title)}</h2>
          <span>${escapeHtml(model.instruction)}</span>
        </div>
        <button class="stage-return-button" data-action="close-puzzle" aria-label="关闭${escapeHtml(model.title)}">返回场景</button>
        <div class="device-control-deck">${model.interaction}</div>
        ${model.statusMarkup}
      </section>`
  }
}
