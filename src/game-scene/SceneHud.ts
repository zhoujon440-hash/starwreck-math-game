export type SceneHudModel = {
  chapterLabel: string
  sceneTitle: string
  objective: string
  revisiting: boolean
  mainlineTitle?: string
  showReturnToTask: boolean
  previousAvailable: boolean
}

const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
})[character] ?? character)

export class SceneHud {
  render(model: SceneHudModel): string {
    return `
      <aside class="scene-hud" data-scene-hud data-hud-mode="lightweight">
        <div class="scene-hud-objective">
          <span>${escapeHtml(model.chapterLabel)} · ${model.revisiting ? '回访' : '当前目标'} · ${escapeHtml(model.sceneTitle)}</span>
          <strong>${escapeHtml(model.objective)}</strong>
          ${model.revisiting && model.mainlineTitle ? `<small>主线仍在“${escapeHtml(model.mainlineTitle)}”</small>` : ''}
        </div>
        <nav aria-label="游戏HUD">
          <button data-action="open-menu" aria-label="主菜单">Ⅱ</button>
          <button data-action="visit-previous" ${model.previousAvailable ? '' : 'disabled'} aria-label="上一场景">‹</button>
          <button data-action="open-map" aria-label="场景地图">⌖</button>
          <button data-action="open-journal" aria-label="任务记录">任</button>
          <button data-action="open-history" aria-label="对话历史">史</button>
          <button data-action="open-profile" aria-label="角色档案">人</button>
          ${model.showReturnToTask ? '<button class="return-task-action" data-action="return-current-task">返回当前任务</button>' : ''}
        </nav>
      </aside>`
  }
}
