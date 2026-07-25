import type { CharacterDefinition } from './types'

export type XingyuPortraitState = 'normal' | 'alert' | 'thinking' | 'nervous' | 'determined'

export const XINGYU: CharacterDefinition<XingyuPortraitState> = {
  characterId: 'CHAR-G01-XINGYU',
  displayName: '星宇',
  fullName: '星宇',
  role: '拾光号上的少年修复者',
  shortIntroduction: '拾光号上的少年修复者。先观察故障，再动手修复；此刻只想找回失联的七码。',
  personality: '遇到故障先观察再行动，对飞船和失联的搭档都抱有强烈责任感。',
  visualDescription:
    '现有冻结资料仅确认少年修复者身份；发型、服装制式与个人标志待项目负责人补充。',
  portraitStates: {
    normal: '/assets/characters/xingyu/portrait-normal.png',
    alert: '/assets/characters/xingyu/portrait-alert.png',
    thinking: '/assets/characters/xingyu/portrait-thinking.png',
    nervous: '/assets/characters/xingyu/portrait-nervous.png',
    determined: '/assets/characters/xingyu/portrait-determined.png',
  },
  defaultPortrait: 'normal',
  defaultSide: 'left',
  firstAppearanceScene: 'SCN-G01-00',
  unlockedProfileSections: [
    { id: 'identity', label: '身份', value: '拾光号上的少年修复者' },
    { id: 'personality', label: '性格', value: '冷静观察，负责到底' },
    { id: 'goal', label: '当前目标', value: '恢复拾光号并寻找失联的七码' },
  ],
}
