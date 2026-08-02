import { describe, expect, it } from 'vitest'
import { G01 } from '../../src/content/g01'
import { STORY_INTRO_CARDS, CHAPTER_GUIDES } from '../../src/data/trial/story'
import { TRIAL_CHARACTERS } from '../../src/data/trial/characters'
import { TRIAL_ITEMS, itemUsageStatus } from '../../src/data/trial/items'
import { GameEngine } from '../../src/game/engine'
import { MemorySaveRepository, SAVE_SCHEMA_VERSION } from '../../src/game/save'
import { createDefaultUiMeta, MemoryUiMetaRepository, UI_META_STORAGE_KEY } from '../../src/game/uiMetaSave'
import { ArchiveView } from '../../src/ui/ArchiveView'
import { TitleScreen } from '../../src/ui/TitleScreen'

describe('trial experience shell', () => {
  it('starts with a complete title menu and disables continue without a save', () => {
    const html = new TitleScreen().render({
      session: null,
      pwaInstallAvailable: false,
      fullscreenAvailable: true,
      saveRecoveredSafely: false,
      uiMetaRecoveredSafely: false,
    })
    expect(html).toContain('星骸拾荒者')
    expect(html).toContain('STARWRECK-TRIAL-0.2.0')
    expect(html).toMatch(/data-trial-action="continue"[^>]*disabled/)
    for (const label of ['继续游戏', '新游戏', '章节选择', '故事档案', '设置', '制作人员']) {
      expect(html).toContain(label)
    }
  })

  it('shows schema v2 legacy save summary without changing story state', () => {
    const repository = new MemorySaveRepository()
    const engine = new GameEngine(G01, repository)
    const before = engine.snapshot
    const html = new TitleScreen().render({
      session: before,
      pwaInstallAvailable: false,
      fullscreenAvailable: false,
      saveRecoveredSafely: false,
      uiMetaRecoveredSafely: false,
    })
    expect(SAVE_SCHEMA_VERSION).toBe(2)
    expect(html).toContain('领航舱 · 拾光号熄灯')
    expect(html).not.toContain('disabled aria-disabled')
    expect(engine.snapshot).toEqual(before)
  })

  it('keeps UI metadata separate and preserves settings when progress is reset', () => {
    const repository = new MemoryUiMetaRepository()
    const meta = repository.load()
    meta.introSeen = true
    meta.seenCharacterCards = ['CHAR-XINGYU']
    meta.settings.fontSize = 'extra-large'
    repository.save(meta)
    const reset = repository.resetProgress()
    expect(UI_META_STORAGE_KEY).toBe('starwreck:ui-meta:v1')
    expect(reset.introSeen).toBe(false)
    expect(reset.seenCharacterCards).toEqual([])
    expect(reset.settings.fontSize).toBe('extra-large')
    expect(JSON.stringify(reset)).not.toContain('g01_chapter_complete')
  })

  it('has six sourced story cards and both bounded chapter guides', () => {
    expect(STORY_INTRO_CARDS).toHaveLength(6)
    for (const card of STORY_INTRO_CARDS) {
      expect(card.title.length).toBeGreaterThan(4)
      expect(card.body.length).toBeGreaterThan(20)
      expect(card.sourcePaths.length).toBeGreaterThan(0)
      expect(card.image).toMatch(/^\/assets\//)
    }
    expect(Object.keys(CHAPTER_GUIDES)).toEqual(['G01', 'G02'])
    expect(CHAPTER_GUIDES.G02.summary).not.toMatch(/SCN-G02-03/)
  })

  it('covers exactly the four current characters with formal portraits and full copy', () => {
    expect(TRIAL_CHARACTERS.map((entry) => entry.id)).toEqual([
      'CHAR-XINGYU', 'CHAR-QIMA', 'CHAR-ALMAO', 'CHAR-ZHENG',
    ])
    for (const character of TRIAL_CHARACTERS) {
      expect(character.identity).toBeTruthy()
      expect(character.relationship).toBeTruthy()
      expect(character.currentGoal).toBeTruthy()
      expect(character.traits.length).toBeGreaterThanOrEqual(3)
      expect(character.portrait).toMatch(/^\/assets\//)
      expect(character.sourcePaths.length).toBeGreaterThan(0)
    }
  })

  it('covers all 25 inventory-capable items with full details and non-consuming guidance', () => {
    expect(TRIAL_ITEMS).toHaveLength(25)
    expect(new Set(TRIAL_ITEMS.map((entry) => entry.id)).size).toBe(25)
    for (const item of TRIAL_ITEMS) {
      expect(item.name).toBeTruthy()
      expect(item.type).toMatch(/工具|零件|证据|任务物品/)
      expect(item.background).toBeTruthy()
      expect(item.observation).toBeTruthy()
      expect(item.acquiredSceneId).toBeTruthy()
      expect(item.acquiredSceneName).toBeTruthy()
      expect(item.critical).toBe(true)
      expect(item.wrongUseHint).toMatch(/不会|保留/)
      expect(item.sourcePath).toBeTruthy()
    }
  })

  it('retains used items in archive and reports their current status', () => {
    const engine = new GameEngine(G01, new MemorySaveRepository())
    engine.updateStory((draft) => {
      draft.foundItemIds.push('ITM-G01-001')
      draft.usedItemIds.push('ITM-G01-001')
    })
    const item = TRIAL_ITEMS.find((entry) => entry.id === 'ITM-G01-001')!
    expect(itemUsageStatus(item, engine.snapshot)).toBe('已使用')
    const html = new ArchiveView().render(engine.snapshot, createDefaultUiMeta(), 'items')
    expect(html).toContain('data-item-coverage-count="25"')
    expect(html).toContain('应急手灯')
    expect(html).toContain('已使用')
  })

  it('renders six unified archive tabs without internal development copy', () => {
    const html = new ArchiveView().render(null, createDefaultUiMeta())
    for (const label of ['世界背景', '章节回顾', '人物档案', '物品档案', '证据记录', '对话历史']) {
      expect(html).toContain(label)
    }
    expect(html).not.toMatch(/schema|项目负责人|验收|切片|门禁/i)
  })
})
