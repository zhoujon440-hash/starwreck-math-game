export type MechanicSurfaceModel = {
  title: string
  subtitle: string
  mechanicType: string
  mechanicId: string
  status: string
  instruction: string
  interaction: string
  statusMarkup: string
  footer: string
}

const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
})[character] ?? character)

export class MechanicSurface {
  render(model: MechanicSurfaceModel): string {
    return `
      <section
        class="device-focus-surface trial-mechanic-panel mechanic-${escapeHtml(model.mechanicType)}"
        role="region"
        aria-labelledby="trial-mechanic-title"
        data-device-surface="true"
        data-trial-mechanic="${escapeHtml(model.mechanicType)}"
        data-mechanic-id="${escapeHtml(model.mechanicId)}"
        data-mechanic-status="${escapeHtml(model.status)}"
      >
        <header>
          <div><span>${escapeHtml(model.subtitle)}</span><h2 id="trial-mechanic-title">${escapeHtml(model.title)}</h2></div>
          <button class="stage-return-button" data-action="close-puzzle" aria-label="关闭${escapeHtml(model.title)}">返回场景</button>
        </header>
        <p class="mechanic-instruction">${escapeHtml(model.instruction)}</p>
        <div class="device-control-deck">${model.interaction}</div>
        ${model.statusMarkup}
        <footer>${model.footer}</footer>
      </section>`
  }
}
