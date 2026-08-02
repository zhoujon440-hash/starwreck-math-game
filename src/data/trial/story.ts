export type StoryCardDefinition = {
  id: string
  eyebrow: string
  title: string
  body: string
  image: string
  sourcePaths: string[]
  characterIds?: string[]
}

export type ChapterGuideDefinition = {
  id: 'G01' | 'G02'
  label: string
  title: string
  summary: string
  objectives: string[]
  estimatedMinutes: string
  image: string
  sourcePaths: string[]
}

export const STORY_INTRO_CARDS: StoryCardDefinition[] = [
  {
    id: 'WORLD-TWELVE-GATES',
    eyebrow: '十二星门世界',
    title: '在星骸之间寻找仍能修好的东西',
    body: '星宇驾驶拾光号穿行在旧航路与星骸带之间。拾荒不是争夺，而是观察、辨认，并让失去用途的东西重新工作。',
    image: '/assets/g01/pr-b/scn-g01-04/background/SCENE-G01-005_star_map_gap.webp',
    sourcePaths: ['docs/story/G01-G13/G01.md', 'docs/story/G01-G13/G02.md'],
  },
  {
    id: 'WORLD-STARLIGHT-CRISIS',
    eyebrow: '拾光号危机',
    title: '坠落之前，船内先陷入黑暗',
    body: '垃圾雨切断了拾光号的稳定航线。应急照明熄灭、导航核心离线，星宇必须从领航舱开始逐段恢复船只。',
    image: '/assets/g01-cockpit-cabinet-closed-v2.png',
    sourcePaths: ['docs/story/G01-G13/G01.md', 'docs/story-runtime/G01_CHARACTER_STORY_RUNTIME.md'],
  },
  {
    id: 'WORLD-XINGYU-QIMA',
    eyebrow: '同行者',
    title: '星宇与七码',
    body: '星宇负责观察和动手，导航智能体七码负责记录、分析已取得的证据，并在获得授权后连接已探索的路径。',
    image: '/assets/g01/scn-g01-01/background/SCENE-G01-002_navigation_core_cabin.webp',
    sourcePaths: ['docs/story/G01-G13/G01.md', 'src/data/characters/index.ts'],
    characterIds: ['CHAR-XINGYU', 'CHAR-QIMA'],
  },
  {
    id: 'WORLD-RUST-RING',
    eyebrow: '锈环星',
    title: '求救信号来自旧屏幕谷',
    body: '一道不断删除自身的微弱求救记录，把拾光号引向锈环星。旧屏幕谷外缘被垃圾雨和封存脉冲隔开。',
    image: '/assets/g02/slice-01/scn00/SCENE-G02-001_old-screen-valley-pulse.webp',
    sourcePaths: ['docs/story/G01-G13/G01.md', 'docs/story/G01-G13/G02.md'],
  },
  {
    id: 'WORLD-TRIAL-GOALS',
    eyebrow: '当前旅程',
    title: '求生、调查、救援与归还',
    body: '先让拾光号安全抵达，再调查封存信号、救下旧屏幕谷居民，并恢复一份关于借、用、还的旧档案。',
    image: '/assets/g02/slice-01/scn01/SCENE-G02-002_five-tail-rescue.webp',
    sourcePaths: ['docs/story/G01-G13/G02.md', 'docs/story-runtime/G02_VERTICAL_SLICE_00_02.md'],
  },
  {
    id: 'WORLD-PROLOGUE-ENTRY',
    eyebrow: '序章',
    title: '拾光号：坠落之前',
    body: '故事从一间断电的领航舱开始。观察场景、找回工具，把正确物品用于正确位置，并在危险时回到最近的安全节点。',
    image: '/assets/g01-cockpit.png',
    sourcePaths: ['docs/story/G01-G13/G01.md', 'README_DEMO.md'],
  },
]

export const CHAPTER_GUIDES: Record<'G01' | 'G02', ChapterGuideDefinition> = {
  G01: {
    id: 'G01',
    label: '序章',
    title: '拾光号：坠落之前',
    summary: '从熄灯的领航舱开始，修复七码、稳定拾光号，并锁定锈环星旧屏幕谷的落点。',
    objectives: ['恢复应急照明', '找回并修复七码', '完成拾光号八个连续场景', '安全抵达旧屏幕谷外缘'],
    estimatedMinutes: '约20至30分钟',
    image: '/assets/g01/pr-c/scn-g01-07/background/SCENE-G01-008_old_screen_valley_descent.webp',
    sourcePaths: ['docs/story/G01-G13/G01.md', 'README_DEMO.md'],
  },
  G02: {
    id: 'G02',
    label: '第二章当前开放任务',
    title: '锈环星：旧屏幕谷',
    summary: '拾光号已经落在旧屏幕谷外缘。当前只开放封存脉冲调查、阿铆救援与旧电视墙档案恢复。',
    objectives: ['扫描封存脉冲', '救下阿铆并记录资源标签', '恢复旧电视墙借用档案', '在四组能量信号前等待路线确认'],
    estimatedMinutes: '约10至15分钟',
    image: '/assets/g02/slice-01/scn02/SCENE-G02-003_tv-wall-archive.webp',
    sourcePaths: ['docs/story/G01-G13/G02.md', 'docs/story-runtime/G02_VERTICAL_SLICE_00_02.md'],
  },
}

export const WORLD_ARCHIVE_ENTRIES = STORY_INTRO_CARDS.slice(0, 5)
