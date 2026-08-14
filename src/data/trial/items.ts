import { G01 } from '../../content/g01'
import type { ItemDefinition } from '../../game/types'

export type TrialItemType = '工具' | '零件' | '证据' | '任务物品'
export type TrialItemUsageStatus = '未知' | '可使用' | '已使用' | '保留'

export type TrialItemArchiveEntry = {
  id: string
  name: string
  type: TrialItemType
  background: string
  observation: string
  acquiredSceneId: string
  acquiredSceneName: string
  defaultUsageStatus: TrialItemUsageStatus
  critical: boolean
  wrongUseHint: string
  icon?: string
  sourcePath: string
}

type CopyDefinition = Pick<
  TrialItemArchiveEntry,
  'type' | 'background' | 'observation' | 'defaultUsageStatus' | 'critical' | 'wrongUseHint'
>

const safeWrongUse = '接口或用途不匹配时先收回背包；这件物品不会被消耗，已确认进度也不会回退。'

const ITEM_COPY: Record<string, CopyDefinition> = {
  'ITM-G01-001': { type: '工具', background: '拾光号维修区使用的独立供电手灯。', observation: '外壳有碰撞磨痕，电池仓仍保持密封。', defaultUsageStatus: '可使用', critical: true, wrongUseHint: safeWrongUse },
  'ITM-G01-002': { type: '零件', background: '用于临时恢复领航舱照明回路的完整保险丝。', observation: '陶瓷外壳与环带没有烧蚀痕迹。', defaultUsageStatus: '可使用', critical: true, wrongUseHint: safeWrongUse },
  'ITM-G01-004': { type: '零件', background: '七码导航核心中保存运行记忆的芯片。', observation: '触点完整，但装回前需要先确认方向。', defaultUsageStatus: '可使用', critical: true, wrongUseHint: safeWrongUse },
  'ITM-G01-005': { type: '零件', background: '用于接回七码托架供电线路的接线片。', observation: '铜面仍能导通，边缘与托架接口相合。', defaultUsageStatus: '可使用', critical: true, wrongUseHint: safeWrongUse },
  'ITM-G01-006': { type: '零件', background: '保护七码供电回路的陶瓷保险丝。', observation: '内部熔丝完整，规格与维修托架一致。', defaultUsageStatus: '可使用', critical: true, wrongUseHint: safeWrongUse },
  'RUNTIME-ITM-G01-FIXED-BUCKLE': { type: '零件', background: '用于固定七码维修托架的机械扣。', observation: '锁舌仍有弹性，没有发生弯折。', defaultUsageStatus: '可使用', critical: true, wrongUseHint: safeWrongUse },
  'RUNTIME-ITM-G01-MAINTENANCE-SHEET': { type: '任务物品', background: '坠落前留下的实体维修任务单。', observation: '页面边缘受损，仍能辨认任务之间的先后关系。', defaultUsageStatus: '可使用', critical: true, wrongUseHint: safeWrongUse },
  'RUNTIME-ITM-G01-STAR-MAP-KEY': { type: '任务物品', background: '让船内地图台读取舱段连接关系的钥片。', observation: '表面刻痕对应拾光号内部地图接口。', defaultUsageStatus: '可使用', critical: true, wrongUseHint: safeWrongUse },
  'ITM-G01-007': { type: '工具', background: '低温环境下使用的货舱密封胶带。', observation: '胶层仍有黏性，卷边没有结霜。', defaultUsageStatus: '可使用', critical: true, wrongUseHint: safeWrongUse },
  'ITM-G01-008': { type: '零件', background: '用于覆盖货舱裂口的冷压金属补片。', observation: '弧度接近货舱外壳，边缘没有新的折痕。', defaultUsageStatus: '可使用', critical: true, wrongUseHint: safeWrongUse },
  'ITM-G01-009': { type: '工具', background: '测量货舱裂口周围氧压的机械压力表。', observation: '指针归零正常，接口没有漏气痕迹。', defaultUsageStatus: '可使用', critical: true, wrongUseHint: safeWrongUse },
  'RUNTIME-ITM-G01-REPRESS-KEY': { type: '工具', background: '开启货舱复压阀的机械钥匙。', observation: '齿面磨损与货舱阀门长期使用痕迹一致。', defaultUsageStatus: '可使用', critical: true, wrongUseHint: safeWrongUse },
  'RUNTIME-ITM-G01-010-A': { type: '零件', background: '从星图台散落物中找回的第一片星图碎片。', observation: '边缘保留独特机械咬合痕迹，需要与缺口逐一比对。', defaultUsageStatus: '可使用', critical: true, wrongUseHint: safeWrongUse },
  'RUNTIME-ITM-G01-010-B': { type: '零件', background: '从星图台散落物中找回的第二片星图碎片。', observation: '表面星线仍连续，边缘形状与其他碎片不同。', defaultUsageStatus: '可使用', critical: true, wrongUseHint: safeWrongUse },
  'RUNTIME-ITM-G01-010-C': { type: '零件', background: '从星图台散落物中找回的第三片星图碎片。', observation: '背面固定点完好，可以安全尝试归位。', defaultUsageStatus: '可使用', critical: true, wrongUseHint: safeWrongUse },
  'ITM-G01-011': { type: '证据', background: '用于记录锈环星异常信号位置的坐标标记。', observation: '标记只保存已经确认的坐标，不包含未探索航路。', defaultUsageStatus: '可使用', critical: true, wrongUseHint: safeWrongUse },
  'ITM-G01-012': { type: '零件', background: '驾驶舱航线控制台使用的旁路板。', observation: '接点仍可工作，安装后只能维持很短的通行窗口。', defaultUsageStatus: '可使用', critical: true, wrongUseHint: safeWrongUse },
  'ITM-G01-013': { type: '证据', background: '从锈环星弱信号中复原的求救记录。', observation: '记录曾反复删除自身，校准后留下可核验的来源痕迹。', defaultUsageStatus: '保留', critical: true, wrongUseHint: '这是需要保留的证据，不会因错误操作离开档案或背包记录。' },
  'RUNTIME-ITM-G02-MAGNETIC-GRAPNEL': { type: '工具', background: '旧屏幕谷居民用于吊臂救援的磁力挂索。', observation: '磁力扣能咬住钢架，绳体没有断裂。', defaultUsageStatus: '可使用', critical: true, wrongUseHint: safeWrongUse },
  'ITM-G02-002': { type: '零件', background: '旧电视墙三块主屏之一的电源键。', observation: '边缘磨损可用于判断它曾属于哪块屏幕，但需要现场比对。', defaultUsageStatus: '可使用', critical: true, wrongUseHint: safeWrongUse },
  'ITM-G02-003': { type: '零件', background: '从屏幕碎片堆中找回的另一枚电源键。', observation: '背面接点完整，表面保留长期按压痕迹。', defaultUsageStatus: '可使用', critical: true, wrongUseHint: safeWrongUse },
  'ITM-G02-004': { type: '零件', background: '旧电视墙最后一块待修主屏的电源键。', observation: '外壳有一道方向性缺口，需和主屏磨损比对。', defaultUsageStatus: '可使用', critical: true, wrongUseHint: safeWrongUse },
  'RUNTIME-ITM-G02-005-A': { type: '零件', background: '从电视墙零件堆里找到的完整短线。', observation: '铜芯没有断裂，接口数量需要在主屏旁确认。', defaultUsageStatus: '可使用', critical: true, wrongUseHint: safeWrongUse },
  'RUNTIME-ITM-G02-005-B': { type: '零件', background: '护套磨旧但仍能导通的屏幕短线。', observation: '弯折方向保留了原安装位置的使用痕迹。', defaultUsageStatus: '可使用', critical: true, wrongUseHint: safeWrongUse },
  'ITM-G02-006': { type: '证据', background: '镜面涂层仍完整的旧屏幕片。', observation: '能反射远处四组微弱能量信号，当前应继续保留。', defaultUsageStatus: '保留', critical: true, wrongUseHint: '镜面屏片是后续观察证据，错误使用不会消耗或改变已恢复的档案。' },
}

const sceneName = (sceneId: string): string => {
  if (sceneId === 'SCN-G01-00') return '领航舱'
  const scene = G01.scenes?.find((candidate) => candidate.id === sceneId)
  return scene?.playerTitle ?? scene?.title ?? '尚未记录的场景'
}

const sourcePathFor = (sceneId: string): string => {
  if (sceneId === 'SCN-G01-00') return 'src/content/g01.ts'
  if (sceneId === 'SCN-G01-01') return 'data/source/g01/scn-g01-01/hos_manifest.json'
  if (sceneId === 'SCN-G01-02') return 'data/source/g01/pr-a/scn-g01-02-art-manifest.json'
  if (sceneId === 'SCN-G01-03') return 'data/source/g01/pr-a/scn-g01-03-art-manifest.json'
  if (sceneId === 'SCN-G01-04' || sceneId === 'SCN-G01-05') return 'data/source/g01/pr-b/runtime-art-manifest.json'
  if (sceneId === 'SCN-G01-06') return 'data/source/g01/pr-c/runtime-art-manifest.json'
  return 'data/source/g02/slice-01/runtime-contract.json'
}

const sceneItems: Array<{ sceneId: string; item: ItemDefinition }> = [
  ...G01.items.map((item) => ({ sceneId: 'SCN-G01-00', item })),
  ...(G01.scenes ?? []).flatMap((scene) => scene.items.map((item) => ({ sceneId: scene.id, item }))),
]

export const TRIAL_ITEMS: TrialItemArchiveEntry[] = [
  ...new Map(
    sceneItems
      .filter(({ item }) => item.collectToInventory !== false)
      .map(({ sceneId, item }) => {
        const copy = ITEM_COPY[item.id]
        if (!copy) throw new Error(`Missing trial item copy: ${item.id}`)
        const entry: TrialItemArchiveEntry = {
          id: item.id,
          name: item.name,
          ...copy,
          acquiredSceneId: sceneId,
          acquiredSceneName: sceneName(sceneId),
          icon: item.inventoryIcon,
          sourcePath: sourcePathFor(sceneId),
        }
        return [item.id, entry] as const
      }),
  ).values(),
]

export const trialItemById = (id: string): TrialItemArchiveEntry | undefined =>
  TRIAL_ITEMS.find((item) => item.id === id)

export const itemUsageStatus = (
  item: TrialItemArchiveEntry,
  session: { inventoryItemIds: string[]; usedItemIds: string[]; foundItemIds: string[] } | null,
): TrialItemUsageStatus => {
  if (!session || !session.foundItemIds.includes(item.id)) return '未知'
  if (session.usedItemIds.includes(item.id)) return item.defaultUsageStatus === '保留' ? '保留' : '已使用'
  if (session.inventoryItemIds.includes(item.id)) return item.defaultUsageStatus
  return item.defaultUsageStatus === '保留' ? '保留' : '已使用'
}
