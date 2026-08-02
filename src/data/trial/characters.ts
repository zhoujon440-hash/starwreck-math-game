import { CHARACTERS } from '../characters'

export type TrialCharacterProfile = {
  id: keyof typeof CHARACTERS
  name: string
  identity: string
  relationship: string
  currentGoal: string
  traits: string[]
  portrait: string
  sourcePaths: string[]
}

export const TRIAL_CHARACTERS: TrialCharacterProfile[] = [
  {
    id: 'CHAR-XINGYU',
    name: '星宇',
    identity: '拾光号少年拾荒者',
    relationship: '故事主角；七码的维修者与行动搭档',
    currentGoal: '让拾光号安全穿过垃圾雨，并确认锈环星求救信号的来源。',
    traits: ['先观察再动手', '擅长把线索转成维修步骤', '面对危险会优先保住已经确认的进度'],
    portrait: CHARACTERS['CHAR-XINGYU'].portrait_states.normal,
    sourcePaths: ['src/data/characters/index.ts', 'docs/story/G01-G13/G01.md'],
  },
  {
    id: 'CHAR-QIMA',
    name: '七码',
    identity: '导航智能体 EDU-0077',
    relationship: '星宇的搜寻、记录与导航搭档',
    currentGoal: '恢复导航功能，记录已取得证据，并只在授权边界内协助星宇。',
    traits: ['认真记录每次修复', '分析只使用已经取得的证据', '能力必须逐项获得正式授权'],
    portrait: CHARACTERS['CHAR-QIMA'].portrait_states.normal,
    sourcePaths: ['src/data/characters/index.ts', 'docs/story/G01-G13/G01.md'],
  },
  {
    id: 'CHAR-ALMAO',
    name: '阿铆',
    identity: '旧屏幕谷五尾维修工',
    relationship: '星宇在锈环星救下的第一位居民',
    currentGoal: '脱离清算吊臂，并让仍在使用的资源不再被当作无主废料。',
    traits: ['熟悉吊臂和线缆', '重视资源的实际用途', '坚持先确认归属再拆取'],
    portrait: CHARACTERS['CHAR-ALMAO'].portrait_states.relieved,
    sourcePaths: ['src/data/characters/index.ts', 'docs/story/G01-G13/G02.md'],
  },
  {
    id: 'CHAR-ZHENG',
    name: '郑',
    identity: '锈环星封存与清算管理员',
    relationship: '当前通过封存系统向星宇发出警告的管理者',
    currentGoal: '核验资源授权与归还记录；其完整立场仍需通过后续证据确认。',
    traits: ['以记录判断归属', '通过封存脉冲执行警告', '当前只开放已登场信息'],
    portrait: CHARACTERS['CHAR-ZHENG'].portrait_states.warning,
    sourcePaths: ['src/data/characters/index.ts', 'docs/story/G01-G13/G02.md'],
  },
]

export const trialCharacterById = (id: string): TrialCharacterProfile | undefined =>
  TRIAL_CHARACTERS.find((character) => character.id === id)
