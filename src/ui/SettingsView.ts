import type { TrialUiSettings } from '../game/uiMetaSave'

export class SettingsView {
  render(settings: TrialUiSettings, resetStage = 0, overlay = false): string {
    return `
      ${overlay ? '<div class="trial-modal-backdrop"></div>' : ''}
      <section class="trial-library-screen trial-settings-screen ${overlay ? 'is-overlay' : ''}" data-trial-view="settings">
        <header><div><span>本机显示与操作</span><h2>设置</h2></div><button data-trial-action="settings-close">返回</button></header>
        <div class="settings-grid">
          <article>
            <h3>字体大小</h3><p>立即改变标题、档案与游戏界面的基础字号。</p>
            <div class="segmented-control">
              ${([['standard', '标准'], ['large', '较大'], ['extra-large', '最大']] as const).map(([value, label]) => `<button class="${settings.fontSize === value ? 'is-selected' : ''}" data-trial-action="setting-font" data-value="${value}">${label}</button>`).join('')}
            </div>
          </article>
          <article>
            <h3>对话显示速度</h3><p>调整对白面板中文字出现与切换的节奏。</p>
            <div class="segmented-control">
              ${([['relaxed', '舒缓'], ['standard', '标准'], ['quick', '快速']] as const).map(([value, label]) => `<button class="${settings.dialogueSpeed === value ? 'is-selected' : ''}" data-trial-action="setting-dialogue" data-value="${value}">${label}</button>`).join('')}
            </div>
          </article>
          <article>
            <h3>减弱动画</h3><p>降低镜头、卡片和提示的移动幅度。</p>
            <button class="toggle-setting ${settings.reducedMotion ? 'is-selected' : ''}" data-trial-action="setting-motion" aria-pressed="${settings.reducedMotion}">${settings.reducedMotion ? '已开启' : '未开启'}</button>
          </article>
          <article>
            <h3>显示方式</h3><p>全屏仅在当前浏览器允许时启用。</p>
            <button data-trial-action="fullscreen">进入全屏</button>
          </article>
        </div>
        <section class="save-reset-zone" data-reset-stage="${resetStage}">
          <h3>重置本地旅程</h3>
          ${resetStage === 0
            ? '<p>清除剧情存档和已看记录，但不会删除已安装的PWA资源。</p><button data-trial-action="reset-stage-one">重置存档</button>'
            : resetStage === 1
              ? '<p>第一次确认：物品、证据、对白和场景进度都将从本机删除。</p><div><button data-trial-action="reset-cancel">取消</button><button class="danger-action" data-trial-action="reset-stage-two">我了解，继续确认</button></div>'
              : '<p><strong>最后确认：</strong>此操作无法撤销。PWA离线资源会保留。</p><div><button data-trial-action="reset-cancel">取消</button><button class="danger-action" data-trial-action="reset-confirm">永久清除本机旅程</button></div>'}
        </section>
      </section>
    `
  }
}
