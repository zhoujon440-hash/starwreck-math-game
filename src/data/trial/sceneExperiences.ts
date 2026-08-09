import type { SceneStateId } from '../../game/types'

export type TrialMechanicType =
  | 'rotating-circuit'
  | 'signal-memory'
  | 'task-order'
  | 'airflow-maze'
  | 'star-map-snap'
  | 'garbage-route'
  | 'waveform-tuning'
  | 'attitude-balance'
  | 'pattern-decode'
  | 'crane-counterweight'
  | 'borrow-use-return'

export type SceneExperience = {
  sceneId: string
  order: number
  chapter: 'G01' | 'G02'
  title: string
  entryReason: string
  openingEvent: string
  mainGoal: string
  stepByState: Record<SceneStateId, string>
  searchGoal: string
  combineGoal: string
  mechanicId: string
  mechanicType: TrialMechanicType
  mechanicName: string
  characterFeedback: string
  completionResult: string
  nextReason: string
}

const steps = (...values: string[]): Record<SceneStateId, string> => ({
  S0: values[0], S1: values[1], S2: values[2], S3: values[3],
  S4: values[4], S5: values[5], S6: values[6],
})

/**
 * The single player-facing contract for the eleven-scene trial. Story copy,
 * task tracking, the scene map and mechanic validation all consume this data.
 */
export const SCENE_EXPERIENCES: readonly SceneExperience[] = [
  {
    sceneId: 'SCN-G01-00', order: 0, chapter: 'G01', title: '拾光号熄灯',
    entryReason: '拾光号突然断电，导航设备失去回应。', openingEvent: '应急红光闪烁，星宇接管维修权限。',
    mainGoal: '恢复领航舱应急照明并追踪失联信号。',
    stepByState: steps('找到应急手灯', '照亮配电盒', '搜索维修柜', '安装临时保险丝', '旋转接通应急电路', '确认船尾回波', '进入导航核心舱'),
    searchGoal: '从昏暗工作台和维修柜找到手灯与保险丝。', combineGoal: '把手灯用于配电盒，并把保险丝装入照明槽。',
    mechanicId: 'RUNTIME-PUZ-G01-ROTATING-CIRCUIT', mechanicType: 'rotating-circuit', mechanicName: '旋转电路连线',
    characterFeedback: '星宇确认应急线路稳定，船尾出现微弱回波。', completionResult: '领航舱照明恢复，导航核心舱通道开放。', nextReason: '沿回波寻找受损导航设备。',
  },
  {
    sceneId: 'SCN-G01-01', order: 1, chapter: 'G01', title: '找回七码',
    entryReason: '船尾回波来自一台受损、离线的导航设备。', openingEvent: '维修托架没有回应，核心外壳与供电回路同时损坏。',
    mainGoal: '找齐组件、修复设备并完成不可跳过的启动校验。',
    stepByState: steps('检查受损设备', '确认损坏位置', '寻找四件组件', '校正芯片方向', '依次安装组件', '复现启动信号', '听完自我介绍与当前任务'),
    searchGoal: '在导航零件堆找到芯片、接线片、保险丝和固定扣。', combineGoal: '校正芯片并按接口顺序修复托架。',
    mechanicId: 'PUZ-G01-QIMA-BOOT', mechanicType: 'signal-memory', mechanicName: '启动信号记忆',
    characterFeedback: '设备启动后自我介绍为七码（EDU-0077），并确认与星宇的搭档关系。', completionResult: '七码恢复在线，发布恢复中控任务链的当前任务。', nextReason: '前往中控台读取坠落前的维修任务。',
  },
  {
    sceneId: 'SCN-G01-02', order: 2, chapter: 'G01', title: '船上第一张任务单',
    entryReason: '七码需要中控任务记录判断拾光号的维修顺序。', openingEvent: '任务屏重启，但实体清单和地图钥片散落。',
    mainGoal: '恢复任务记录并建立第一条维修依赖链。',
    stepByState: steps('调查任务屏', '寻找清单与钥片', '确认货舱路径', '排列任务依赖', '安装地图钥片', '归档维修清单', '前往漏气货舱'),
    searchGoal: '在中控台杂物中找到维修清单和星图钥片。', combineGoal: '把钥片用于地图台并将清单归档。',
    mechanicId: 'RUNTIME-PUZ-G01-TASK-DEPENDENCY', mechanicType: 'task-order', mechanicName: '任务依赖排序',
    characterFeedback: '七码确认先测压、再修补、最后复压。', completionResult: '首条任务链写入任务日志。', nextReason: '按任务链前往漏气货舱。',
  },
  {
    sceneId: 'SCN-G01-03', order: 3, chapter: 'G01', title: '漏气的货舱',
    entryReason: '维修任务单把持续失压的货舱列为首要故障。', openingEvent: '裂口抽走空气，七码建立九十秒安全窗口。',
    mainGoal: '测压、封堵裂口并安全复压。',
    stepByState: steps('调查漏气裂口', '寻找维修物', '安装压力表', '引导气流通过安全阀', '按顺序封堵', '启动复压阀', '确认货舱稳定'),
    searchGoal: '从应急工具箱找出胶带、补片、压力表和复压钥。', combineGoal: '安装压力表，依次使用补片、胶带和复压钥。',
    mechanicId: 'RUNTIME-PUZ-G01-PRESSURE-CALIBRATION', mechanicType: 'airflow-maze', mechanicName: '气流迷宫',
    characterFeedback: '七码确认压力证据和修复步骤均已保留。', completionResult: '货舱恢复稳定压力。', nextReason: '星图室出现跨星门异常，需确认来源。',
  },
  {
    sceneId: 'SCN-G01-04', order: 4, chapter: 'G01', title: '星图缺口',
    entryReason: '十二道星门环同时失准，锈环星信号被反复删除。', openingEvent: '星图台缺失三片机械图板和一枚坐标标记。',
    mainGoal: '拼回星图并锁定锈环星异常坐标。',
    stepByState: steps('调查破损星图台', '寻找碎片与标记', '组合三片星图', '拖动旋转并吸附星图', '从安全节点核验', '安装坐标标记', '前往航线台'),
    searchGoal: '在星图零件近景找齐三片碎片与坐标标记。', combineGoal: '把三片碎片拖回对应缺口。',
    mechanicId: 'TUT-MECH-002', mechanicType: 'star-map-snap', mechanicName: '星图拖动旋转吸附',
    characterFeedback: '七码从完整星图中辨认出正在自删的锈环星求救源。', completionResult: '锈环星坐标锁定。', nextReason: '垃圾雨封锁航路，需要规划安全路线。',
  },
  {
    sceneId: 'SCN-G01-05', order: 5, chapter: 'G01', title: '垃圾雨航线',
    entryReason: '前往锈环星的路径穿过持续变化的垃圾雨。', openingEvent: '航线台显示两个已知安全节点和一个封闭窗口。',
    mainGoal: '规划不会回滚已确认节点的安全航线。',
    stepByState: steps('确认安全节点A', '连接安全节点B', '寻找旁路板', '安装旁路板', '规划短时路线', '确认安全落点', '前往观测舱'),
    searchGoal: '从驾驶舱工具槽找到旁路板。', combineGoal: '把旁路板安装到航线台，打开短时窗口。',
    mechanicId: 'RUNTIME-PUZ-G01-GARBAGE-ROUTE', mechanicType: 'garbage-route', mechanicName: '垃圾雨路线规划',
    characterFeedback: '七码确认错误碰撞只退回最近一步，安全节点仍有效。', completionResult: '垃圾雨安全路线写入导航。', nextReason: '在进入近地轨道前复原锈环星求救波形。',
  },
  {
    sceneId: 'SCN-G01-06', order: 6, chapter: 'G01', title: '锈环星求救信号',
    entryReason: '星图只提供坐标，必须验证求救信号没有伪造。', openingEvent: '四路接收器中只有一道波形反复删除自己。',
    mainGoal: '复原求救信号并授权三项基础能力。',
    stepByState: steps('调查弱信号', '寻找校准组件', '调谐波形', '授权搜寻', '授权分析与寻路', '保存边界', '进入近地轨道'),
    searchGoal: '在接收器近景找齐四件信号校准组件。', combineGoal: '将取得的记录与接收器频段、相位、增益组合校准。',
    mechanicId: 'RUNTIME-PUZ-G01-SIGNAL-ALIGNMENT', mechanicType: 'waveform-tuning', mechanicName: '波形调谐',
    characterFeedback: '七码确认求救真实，并明确三项高级能力仍锁定。', completionResult: '求救源与能力边界完成存档。', nextReason: '扫描旧屏幕谷外缘的安全落点。',
  },
  {
    sceneId: 'SCN-G01-07', order: 7, chapter: 'G01', title: '坠落之前',
    entryReason: '拾光号抵达锈环星近地轨道，最后一片垃圾雨逼近。', openingEvent: '着陆走廊每八秒短暂稳定一次。',
    mainGoal: '保持姿态平衡，在安全时窗内锁定着陆。',
    stepByState: steps('启动落点扫描', '组合三项能力定位', '确认走廊', '平衡姿态并把握时机', '确认存档信标', '打开舱门', '进入G02交接'),
    searchGoal: '观察舷窗和落点扫描台，确认三个安全节点。', combineGoal: '组合搜寻、分析和寻路结果确定着陆走廊。',
    mechanicId: 'RUNTIME-PUZ-G01-IMPACT-DAMPING', mechanicType: 'attitude-balance', mechanicName: '姿态平衡与时机锁定',
    characterFeedback: '七码确认落点、证据与权限均已保存。', completionResult: 'G01完成，抵达旧屏幕谷外缘。', nextReason: '只读交接后进入G02当前开放任务。',
  },
  {
    sceneId: 'SCN-G02-00', order: 8, chapter: 'G02', title: '垃圾雨之前',
    entryReason: '旧屏幕谷外缘存在被刻意封存的脉冲样本。', openingEvent: '锈沙中的脉冲按可追溯规律闪烁。',
    mainGoal: '解码脉冲规律并封存真实样本。',
    stepByState: steps('观察脉冲源', '寻找取样线索', '组合探针与样本', '解码图形规律', '核验取样', '封存证据', '前往吊臂区'),
    searchGoal: '观察地表遮挡和取样接口，找到规律线索。', combineGoal: '把探针参数与脉冲样本组合。',
    mechanicId: 'RUNTIME-PUZ-G02-PULSE-SCAN', mechanicType: 'pattern-decode', mechanicName: '脉冲规律解码',
    characterFeedback: '七码确认样本来自正式封存系统而非自然噪声。', completionResult: '封存脉冲证据写入档案。', nextReason: '吊臂落物区出现求救者。',
  },
  {
    sceneId: 'SCN-G02-01', order: 9, chapter: 'G02', title: '五尾清算',
    entryReason: '旧吊臂下有人被困，落物区仍在失衡。', openingEvent: '阿铆发出求救，郑在远处要求查清资源归属。',
    mainGoal: '配平吊臂救下阿铆并取得三类资源证据。',
    stepByState: steps('观察吊臂', '寻找挂索与配重', '组合挂索', '拖放配重并释放吊臂', '调查三类标签', '核验归属', '前往电视墙'),
    searchGoal: '在吊臂区找出可用挂索、配重与资源标签。', combineGoal: '把磁力挂索装到救援点并配置配重。',
    mechanicId: 'RUNTIME-PUZ-G02-CRANE-COUNTERWEIGHT', mechanicType: 'crane-counterweight', mechanicName: '吊臂配重救援',
    characterFeedback: '阿铆获救并自我介绍；郑要求以三类标签证据结算。', completionResult: '救援和资源归属记录完成。', nextReason: '旧电视墙保存着借用规则档案。',
  },
  {
    sceneId: 'SCN-G02-02', order: 10, chapter: 'G02', title: '谁说这是无主之物',
    entryReason: '郑指出旧电视墙能证明资源的借、用、还记录。', openingEvent: '三块主屏熄灭，最后一次归还记录缺失。',
    mainGoal: '修复屏幕并还原借用档案逻辑。',
    stepByState: steps('调查电视墙', '寻找键线屏片', '组合修复主屏A', '组合修复主屏B', '组合修复主屏C', '配对借用与归还记录', '返回安全边界'),
    searchGoal: '在碎片堆找齐三枚电源键、两段短线和镜面屏片。', combineGoal: '按接点和磨损方向修复三块主屏。',
    mechanicId: 'RUNTIME-PUZ-G02-BORROW-RETURN', mechanicType: 'borrow-use-return', mechanicName: '借用档案逻辑配对',
    characterFeedback: '郑确认资源并非无主，阿铆补全最后一条归还记录。', completionResult: '借用档案恢复，当前试玩在能量信号边界停止。', nextReason: '返回安全区等待后续路线确认。',
  },
] as const

export const PLAYER_SCENE_IDS = SCENE_EXPERIENCES.map((scene) => scene.sceneId)

export const sceneExperience = (sceneId: string): SceneExperience | undefined =>
  SCENE_EXPERIENCES.find((scene) => scene.sceneId === sceneId)

