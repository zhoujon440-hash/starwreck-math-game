import type { GameSession } from '../../game/types'
import type { ScenePresentation, SceneWorldVisualState } from '../../game-scene/types'
import { SCENE_EXPERIENCES } from './sceneExperiences'

const presentation = (
  sceneId: string,
  device: ScenePresentation['device'],
  world: ScenePresentation['world'],
  pickupToastAnchor = { x: 84, y: 79 },
): ScenePresentation => ({
  sceneId,
  coordinateSpace: 'percent-16:9',
  device,
  pickupToastAnchor,
  world,
})

export const SCENE_PRESENTATIONS: readonly ScenePresentation[] = [
  presentation(
    'SCN-G01-00',
    { id: 'distribution-box', label: '配电箱', area: { x: 64, y: 30, width: 20, height: 37 }, focus: { x: 70, y: 45, scale: 1.85 }, interaction: 'mechanic' },
    { initial: '应急电路熄灭', partial: '保险丝与接点正在恢复', complete: '电路接通，舱灯恢复', effect: 'power' },
  ),
  presentation(
    'SCN-G01-01',
    { id: 'navigation-cradle', label: '受损导航设备', area: { x: 62, y: 22, width: 27, height: 55 }, focus: { x: 72, y: 48, scale: 1.72 }, interaction: 'drop-target' },
    { initial: '设备断电且外壳受损', partial: '接口逐项恢复', complete: '设备启动并恢复在线', effect: 'signal' },
  ),
  presentation(
    'SCN-G01-02',
    { id: 'mission-console', label: '中控任务墙', area: { x: 26, y: 23, width: 43, height: 49 }, focus: { x: 48, y: 47, scale: 1.55 }, interaction: 'mechanic' },
    { initial: '任务墙没有有效顺序', partial: '实体任务卡正在归位', complete: '维修依赖链已写入', effect: 'timeline' },
  ),
  presentation(
    'SCN-G01-03',
    { id: 'cargo-valve-board', label: '货舱阀门板', area: { x: 49, y: 24, width: 34, height: 52 }, focus: { x: 65, y: 49, scale: 1.62 }, interaction: 'mechanic' },
    { initial: '裂口持续抽走空气', partial: '气流通过已确认阀门', complete: '货舱压力恢复稳定', effect: 'airflow' },
  ),
  presentation(
    'SCN-G01-04',
    { id: 'star-map-table', label: '驾驶台星图桌', area: { x: 24, y: 31, width: 52, height: 47 }, focus: { x: 50, y: 54, scale: 1.48 }, interaction: 'mechanic' },
    { initial: '星门环存在三处缺口', partial: '星图片逐块吸附', complete: '整张星图与锈环星坐标点亮', effect: 'starmap' },
  ),
  presentation(
    'SCN-G01-05',
    { id: 'route-console', label: '垃圾雨航线台', area: { x: 16, y: 18, width: 68, height: 60 }, focus: { x: 51, y: 47, scale: 1.38 }, interaction: 'mechanic' },
    { initial: '垃圾雨封锁航线', partial: '安全节点逐段确认', complete: '飞船安全航线持续发光', effect: 'route' },
  ),
  presentation(
    'SCN-G01-06',
    { id: 'signal-console', label: '通讯示波台', area: { x: 35, y: 21, width: 48, height: 57 }, focus: { x: 59, y: 47, scale: 1.5 }, interaction: 'mechanic' },
    { initial: '求救波形被噪声覆盖', partial: '频段、相位与增益逐渐重合', complete: '波形稳定并锁定求救源', effect: 'waveform' },
  ),
  presentation(
    'SCN-G01-07',
    { id: 'attitude-console', label: '姿态控制台', area: { x: 25, y: 20, width: 55, height: 59 }, focus: { x: 51, y: 49, scale: 1.42 }, interaction: 'mechanic' },
    { initial: '船体地平线持续倾斜', partial: '俯仰与横滚正在收敛', complete: '船体恢复稳定姿态', effect: 'horizon' },
  ),
  presentation(
    'SCN-G02-00',
    { id: 'pulse-screen-wall', label: '废弃脉冲屏幕墙', area: { x: 20, y: 18, width: 59, height: 59 }, focus: { x: 49, y: 46, scale: 1.44 }, interaction: 'mechanic' },
    { initial: '屏幕墙仅剩破碎回波', partial: '回波层逐格吻合', complete: '封存脉冲取样完成', effect: 'pulse' },
  ),
  presentation(
    'SCN-G02-01',
    { id: 'rescue-crane', label: '五尾救援吊臂', area: { x: 12, y: 16, width: 76, height: 66 }, focus: { x: 52, y: 48, scale: 1.3 }, interaction: 'mechanic' },
    { initial: '吊臂失衡，阿铆仍被困', partial: '配重改变吊臂力矩', complete: '吊臂抬升，阿铆获救', effect: 'crane' },
  ),
  presentation(
    'SCN-G02-02',
    { id: 'archive-workbench', label: '电视墙档案台', area: { x: 16, y: 17, width: 69, height: 63 }, focus: { x: 50, y: 47, scale: 1.34 }, interaction: 'mechanic' },
    { initial: '主屏与借用记录断裂', partial: '档案闭环逐项恢复', complete: '电视墙与借用档案全部恢复', effect: 'archive' },
  ),
] as const

export const scenePresentation = (sceneId: string): ScenePresentation | undefined =>
  SCENE_PRESENTATIONS.find((entry) => entry.sceneId === sceneId)

export const sceneWorldVisualState = (
  session: GameSession,
  entry: ScenePresentation,
): SceneWorldVisualState => {
  const mechanicId = SCENE_EXPERIENCES.find((scene) => scene.sceneId === entry.sceneId)?.mechanicId
  const mechanic = mechanicId ? session.mechanicProgress[mechanicId] : undefined
  if (
    session.completedSceneIds.includes(entry.sceneId) ||
    mechanic?.status === 'complete' ||
    (session.currentSceneId === entry.sceneId && session.sceneState === 'S6')
  ) return 'complete'
  if (
    mechanic?.status === 'partial' ||
    mechanic?.status === 'error' ||
    (session.currentSceneId === entry.sceneId && session.sceneState !== 'S0')
  ) return 'partial'
  return 'initial'
}

export const assertScenePresentationCoverage = (): boolean =>
  SCENE_PRESENTATIONS.length === SCENE_EXPERIENCES.length &&
  SCENE_EXPERIENCES.every((scene) => Boolean(scenePresentation(scene.sceneId)))
