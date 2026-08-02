import type { GameSession } from '../game/types'
import { withBaseAssets } from './assetPath'

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character] ?? character)

const SCENE_LABELS: Record<string, string> = {
  'SCN-G01-00': '领航舱 · 拾光号熄灯',
  'SCN-G01-01': '导航核心舱 · 找回七码',
  'SCN-G01-02': '中控台 · 船上第一张任务单',
  'SCN-G01-03': '货舱 · 漏气的货舱',
  'SCN-G01-04': '星图室 · 星图缺口',
  'SCN-G01-05': '驾驶舱 · 垃圾雨航线',
  'SCN-G01-06': '远距观测舱 · 锈环星求救信号',
  'SCN-G01-07': '近地轨道 · 坠落之前',
  'G02-BOUNDARY': '旧屏幕谷外缘',
  'SCN-G02-00': '旧屏幕谷 · 垃圾雨之前',
  'SCN-G02-01': '旧屏幕谷 · 五尾清算',
  'SCN-G02-02': '旧电视墙 · 谁说这是无主之物',
  'RUNTIME-G02-ENERGY-SEARCH-BOUNDARY': '旧屏幕谷安全区 · 四组能量信号',
}

const isG02 = (sceneId: string) =>
  sceneId === 'G02-BOUNDARY' || sceneId.startsWith('SCN-G02-') || sceneId.includes('G02-ENERGY')

const completionPercent = (session: GameSession): number => {
  const g01Completed = Array.from({ length: 8 }, (_, index) =>
    session.sceneStates[`SCN-G01-0${index}`] === 'S6' ? 1 : 0,
  ).reduce<number>((sum, value) => sum + value, 0)
  const g02Completed = [
    session.flags.g02_intro_scan_done === true,
    session.flags.g02_almao_rescued === true && Number(session.flags.g02_resource_labels ?? 0) === 3,
    session.flags.g02_archive_restored === true,
  ].filter(Boolean).length
  return Math.round(((g01Completed + g02Completed) / 11) * 100)
}

const formattedTime = (value: string): string => {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '时间记录不可用'
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(parsed)
}

export type TitleScreenModel = {
  session: GameSession | null
  pwaInstallAvailable: boolean
  fullscreenAvailable: boolean
  saveRecoveredSafely: boolean
  uiMetaRecoveredSafely: boolean
}

export class TitleScreen {
  render(model: TitleScreenModel): string {
    const { session } = model
    const sceneId = session?.currentSceneId ?? 'SCN-G01-00'
    const background = isG02(sceneId)
      ? '/assets/g02/slice-01/scn00/SCENE-G02-001_old-screen-valley-pulse.webp'
      : '/assets/g01/pr-c/scn-g01-07/background/SCENE-G01-008_old_screen_valley_descent.webp'
    const saveSummary = session
      ? `<div class="title-save-card" data-save-state="available">
          <span>本机旅程</span>
          <strong>${escapeHtml(SCENE_LABELS[sceneId] ?? '拾光号航行记录')}</strong>
          <p>${isG02(sceneId) ? '第二章 · 锈环星旧屏幕谷' : '序章 · 拾光号：坠落之前'}</p>
          <div class="save-progress"><i style="width:${completionPercent(session)}%"></i></div>
          <small>${completionPercent(session)}% · ${formattedTime(session.updatedAt)} · 仅保存在本设备</small>
        </div>`
      : `<div class="title-save-card is-empty" data-save-state="empty">
          <span>本机旅程</span><strong>还没有可继续的存档</strong>
          <p>选择“新游戏”会先播放世界背景引导，再进入序章。</p>
          <small>游戏进度只保存在当前浏览器设备中</small>
        </div>`

    return withBaseAssets(`
      <main class="trial-title-screen" data-trial-view="title" style="--title-background:url('${background}')">
        <div class="trial-title-atmosphere"></div>
        <section class="trial-title-copy" aria-labelledby="trial-game-title">
          <p class="trial-kicker">一段关于观察、修复与归还的星骸旅程</p>
          <h1 id="trial-game-title"><span>星骸拾荒者</span><small>十二星门</small></h1>
          <p class="trial-title-chapter">当前旅程：拾光号序章与锈环星旧屏幕谷</p>
          ${saveSummary}
          ${model.saveRecoveredSafely || model.uiMetaRecoveredSafely
            ? '<p class="safe-recovery-note" role="status">检测到无法读取的本机记录，已安全返回标题页；PWA资源未受影响。</p>'
            : ''}
        </section>
        <section class="trial-title-menu" aria-label="游戏入口">
          <button class="trial-menu-primary" data-trial-action="continue" ${session ? '' : 'disabled aria-disabled="true"'}>
            <span>继续游戏</span><small>${session ? escapeHtml(SCENE_LABELS[sceneId] ?? '恢复最近旅程') : '需要先建立本机存档'}</small>
          </button>
          <button data-trial-action="new-game"><span>新游戏</span><small>从世界背景与序章开始</small></button>
          <button data-trial-action="chapters"><span>章节选择</span><small>只显示合法解锁内容</small></button>
          <button data-trial-action="archive"><span>故事档案</span><small>世界、人物、物品与记录</small></button>
          <button data-trial-action="settings"><span>设置</span><small>字体、对话与显示</small></button>
          <button data-trial-action="credits"><span>制作人员</span><small>项目与资料来源说明</small></button>
          <div class="trial-platform-actions">
            ${model.pwaInstallAvailable ? '<button data-trial-action="install-pwa">安装到本机</button>' : ''}
            ${model.fullscreenAvailable ? '<button data-trial-action="fullscreen">全屏</button>' : ''}
          </div>
          <p class="trial-version">STARWRECK-TRIAL-0.2.0 · HTML5 / PWA</p>
        </section>
      </main>
    `)
  }
}
