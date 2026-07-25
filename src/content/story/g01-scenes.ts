export type G01StorySceneDefinition = {
  sceneId: string
  title: string
  narrativePurpose: string
  openingDialogue: string[]
  closingDialogue: string[]
  participatingCharacters: Array<'xingyu' | 'qima' | 'system'>
  objectiveSummary: string
  emotionalBeat: string
  nextSceneId: string | null
  requiredFlags: Record<string, boolean | number | string>
  resultingFlags: Record<string, boolean | number | string>
  playable: boolean
}

const pending = '待项目负责人补充'

export const G01_STORY_SCENES: G01StorySceneDefinition[] = [
  {
    sceneId: 'SCN-G01-00',
    title: '拾光号熄灯',
    narrativePurpose: '在突发断电中建立星宇的修复者身份，并确认七码失联。',
    openingDialogue: ['SEQ-G01-00-OPENING'],
    closingDialogue: ['SEQ-G01-00-LIGHTS'],
    participatingCharacters: ['xingyu', 'system'],
    objectiveSummary: '恢复拾光号维修舱应急照明。',
    emotionalBeat: '从短暂慌乱转为专注行动，并把寻找七码作为下一目标。',
    nextSceneId: 'SCN-G01-01',
    requiredFlags: { world_star_core_count: 0 },
    resultingFlags: { g01_scene_00_story_complete: true, world_star_core_count: 0 },
    playable: true,
  },
  {
    sceneId: 'SCN-G01-01',
    title: '找回七码',
    narrativePurpose: '修复失联的七码，恢复星宇与七码的搭档关系。',
    openingDialogue: ['SEQ-G01-01-OPENING'],
    closingDialogue: ['SEQ-G01-01-FIRST-CONVERSATION'],
    participatingCharacters: ['xingyu', 'qima', 'system'],
    objectiveSummary: '在导航核心舱找齐部件、修复线路并重启七码。',
    emotionalBeat: '从担心失去搭档，到用熟悉的机械幽默确认彼此平安。',
    nextSceneId: 'SCN-G01-02',
    requiredFlags: { g01_scene_00_story_complete: true, world_star_core_count: 0 },
    resultingFlags: {
      g01_scene_01_complete: true,
      qima_recovered: true,
      world_star_core_count: 0,
    },
    playable: true,
  },
  {
    sceneId: 'SCN-G01-02',
    title: '船上第一张任务单',
    narrativePurpose: pending,
    openingDialogue: [],
    closingDialogue: [],
    participatingCharacters: ['xingyu', 'qima'],
    objectiveSummary: pending,
    emotionalBeat: pending,
    nextSceneId: 'SCN-G01-03',
    requiredFlags: { g01_scene_01_complete: true, qima_recovered: true },
    resultingFlags: { world_star_core_count: 0 },
    playable: false,
  },
  {
    sceneId: 'SCN-G01-03',
    title: '漏气的货舱',
    narrativePurpose: pending,
    openingDialogue: [],
    closingDialogue: [],
    participatingCharacters: ['xingyu', 'qima'],
    objectiveSummary: pending,
    emotionalBeat: pending,
    nextSceneId: 'SCN-G01-04',
    requiredFlags: { world_star_core_count: 0 },
    resultingFlags: { world_star_core_count: 0 },
    playable: false,
  },
  {
    sceneId: 'SCN-G01-04',
    title: '星图缺口',
    narrativePurpose: pending,
    openingDialogue: [],
    closingDialogue: [],
    participatingCharacters: ['xingyu', 'qima'],
    objectiveSummary: pending,
    emotionalBeat: pending,
    nextSceneId: 'SCN-G01-05',
    requiredFlags: { world_star_core_count: 0 },
    resultingFlags: { world_star_core_count: 0 },
    playable: false,
  },
  {
    sceneId: 'SCN-G01-05',
    title: '垃圾雨航线',
    narrativePurpose: pending,
    openingDialogue: [],
    closingDialogue: [],
    participatingCharacters: ['xingyu', 'qima'],
    objectiveSummary: pending,
    emotionalBeat: pending,
    nextSceneId: 'SCN-G01-06',
    requiredFlags: { world_star_core_count: 0 },
    resultingFlags: { world_star_core_count: 0 },
    playable: false,
  },
  {
    sceneId: 'SCN-G01-06',
    title: '锈环星求救信号',
    narrativePurpose: pending,
    openingDialogue: [],
    closingDialogue: [],
    participatingCharacters: ['xingyu', 'qima'],
    objectiveSummary: pending,
    emotionalBeat: pending,
    nextSceneId: 'SCN-G01-07',
    requiredFlags: { world_star_core_count: 0 },
    resultingFlags: { world_star_core_count: 0 },
    playable: false,
  },
  {
    sceneId: 'SCN-G01-07',
    title: '坠落之前',
    narrativePurpose: pending,
    openingDialogue: [],
    closingDialogue: [],
    participatingCharacters: ['xingyu', 'qima'],
    objectiveSummary: pending,
    emotionalBeat: pending,
    nextSceneId: null,
    requiredFlags: { world_star_core_count: 0 },
    resultingFlags: {
      g01_chapter_complete: true,
      g01_handoff_to_g02: true,
      world_star_core_count: 0,
    },
    playable: false,
  },
]
