import type { CharacterDefinition } from './types'

export type QimaPortraitState =
  | 'offline'
  | 'damaged'
  | 'booting'
  | 'normal'
  | 'question'
  | 'warning'
  | 'proud'
  | 'awkward'
  | 'scanning'

export const QIMA: CharacterDefinition<QimaPortraitState> = {
  characterId: 'CHAR-G01-QIMA',
  displayName: '七码',
  fullName: '七码 · EDU-0077',
  role: '拾光号搭档机器人',
  shortIntroduction: '编号EDU-0077。负责扫描、记录与维修协作，习惯把星宇的每次嘴硬都写进日志。',
  personality: '说话精确，擅长机械式纠错，也会用冷静语气制造幽默。',
  visualDescription: '旧显示屏头部、奶黄色修补机身、像素表情与明显维修痕迹。',
  portraitStates: {
    offline: '/assets/characters/qima/portrait-offline.png',
    damaged: '/assets/characters/qima/portrait-damaged.png',
    booting: '/assets/characters/qima/portrait-booting.png',
    normal: '/assets/characters/qima/portrait-normal.png',
    question: '/assets/characters/qima/portrait-question.png',
    warning: '/assets/characters/qima/portrait-warning.png',
    proud: '/assets/characters/qima/portrait-proud.png',
    awkward: '/assets/characters/qima/portrait-awkward.png',
    scanning: '/assets/characters/qima/portrait-scanning.png',
  },
  defaultPortrait: 'offline',
  defaultSide: 'right',
  firstAppearanceScene: 'SCN-G01-01',
  unlockedProfileSections: [
    { id: 'serial', label: '编号', value: 'EDU-0077' },
    { id: 'type', label: '类型', value: '搭档机器人' },
    { id: 'function', label: '功能', value: '扫描、记录与维修协作' },
    { id: 'personality', label: '性格', value: '精确、较真，带一点机械幽默' },
  ],
}

