import { describe, expect, it } from 'vitest'
import { G01 } from '../../src/content/g01'
import { G02_DIALOGUE } from '../../src/data/dialogue/g02'
import { G02_HINTS } from '../../src/data/hints/g02'
import { GameEngine } from '../../src/game/engine'
import { MemorySaveRepository } from '../../src/game/save'
import type { GameSession, SceneStateId } from '../../src/game/types'
import { DialogueDataLoader } from '../../src/services/DialogueDataLoader'
import { DialogueRunner } from '../../src/services/DialogueRunner'

const hosItems = [
  'ITM-G02-002',
  'ITM-G02-003',
  'ITM-G02-004',
  'RUNTIME-ITM-G02-005-A',
  'RUNTIME-ITM-G02-005-B',
  'ITM-G02-006',
]

const resourceAssignments = [
  ['RUNTIME-G02-LABEL-DOUBLE-RING', 'RUNTIME-G02-SLOT-PRIVATE'],
  ['RUNTIME-G02-LABEL-THREE-LINK', 'RUNTIME-G02-SLOT-PUBLIC-HEAT'],
  ['RUNTIME-G02-LABEL-BROKEN-EDGE', 'RUNTIME-G02-SLOT-DISCARDED'],
] as const

const solvePulse = (engine: GameEngine) => {
  expect(engine.setG02PulseControl('interval', 3).ok).toBe(true)
  expect(engine.setG02PulseControl('gain', 2).ok).toBe(true)
  expect(engine.setG02PulseControl('window', 3).ok).toBe(true)
  expect(engine.submitG02PulseSample().ok).toBe(true)
}

const solveResources = (engine: GameEngine) => {
  for (const [label, slot] of resourceAssignments) {
    expect(engine.assignG02ResourceLabel(label, slot).ok).toBe(true)
  }
  expect(engine.submitG02ResourceClassification().ok).toBe(true)
}

const seedG02Boundary = (repository = new MemorySaveRepository()) => {
  const engine = new GameEngine(G01, repository)
  engine.updateStory((draft) => {
    draft.currentSceneId = 'G02-BOUNDARY'
    draft.sceneState = 'S0'
    draft.sceneStates['G02-BOUNDARY'] = 'S0'
    draft.flags.g01_scn07_complete = true
    draft.flags.g01_landing_scanned = true
    draft.flags.g01_scn07_autosave_confirmed = true
    draft.flags.g01_scn07_exit_ready = true
    draft.flags.g01_scn06_search_authorized = true
    draft.flags.g01_scn06_analysis_authorized = true
    draft.flags.g01_scn06_pathfinding_authorized = true
    draft.flags.ability_qima_search = true
    draft.flags.ability_analysis = true
    draft.flags.ability_pathfinding = true
  })
  expect(engine.snapshot.flags.g01_chapter_complete).toBe(true)
  expect(engine.snapshot.flags.g01_handoff_to_g02).toBe(true)
  expect(engine.snapshot.flags.world_star_core_count).toBe(0)
  return engine
}

const enterScn00 = (repository = new MemorySaveRepository()) => {
  const engine = seedG02Boundary(repository)
  expect(engine.enterScene('SCN-G02-00').ok).toBe(true)
  expect(engine.snapshot.currentSceneId).toBe('SCN-G02-00')
  return engine
}

const finishScn00 = (engine: GameEngine) => {
  expect(engine.inspect('HS-G02-0001').ok).toBe(true)
  expect(engine.inspect('HS-G02-0002').ok).toBe(true)
  solvePulse(engine)
  expect(engine.inspect('RUNTIME-HS-G02-00-SAMPLE').ok).toBe(true)
  expect(engine.snapshot.flags.g02_intro_scan_done).toBe(false)
  expect(engine.inspect('RUNTIME-HS-G02-00-VERIFY').ok).toBe(true)
  expect(engine.inspect('RUNTIME-HS-G02-00-EXIT').ok).toBe(true)
  expect(engine.snapshot.sceneState).toBe('S6')
}

const enterScn01 = (repository = new MemorySaveRepository()) => {
  const engine = enterScn00(repository)
  finishScn00(engine)
  expect(engine.advanceG02Slice().ok).toBe(true)
  expect(engine.snapshot.currentSceneId).toBe('SCN-G02-01')
  return engine
}

const finishScn01 = (engine: GameEngine) => {
  expect(engine.inspect('RUNTIME-HS-G02-01-OBSERVE').ok).toBe(true)
  expect(engine.useItem('RUNTIME-ITM-G02-MAGNETIC-GRAPNEL', 'HS-G02-0003').ok).toBe(true)
  expect(engine.inspect('RUNTIME-HS-G02-01-RESCUE-CONFIRM').ok).toBe(true)
  for (const id of ['HS-G02-0005', 'HS-G02-0006', 'HS-G02-0007']) {
    expect(engine.inspect(id).ok).toBe(true)
  }
  solveResources(engine)
  expect(engine.snapshot.sceneState).toBe('S6')
}

const enterScn02 = (repository = new MemorySaveRepository()) => {
  const engine = enterScn01(repository)
  finishScn01(engine)
  expect(engine.advanceG02Slice().ok).toBe(true)
  expect(engine.snapshot.currentSceneId).toBe('SCN-G02-02')
  return engine
}

const preservedGameplay = (before: GameSession, after: GameSession) => {
  expect(after.inventoryItemIds).toEqual(before.inventoryItemIds)
  expect(after.foundItemIds).toEqual(before.foundItemIds)
  expect(after.usedItemIds).toEqual(before.usedItemIds)
  expect(after.completedHotspotIds).toEqual(before.completedHotspotIds)
  expect(after.completedPuzzleIds).toEqual(before.completedPuzzleIds)
  expect(after.hosProgress).toEqual(before.hosProgress)
  expect(after.puzzleProgress).toEqual(before.puzzleProgress)
  expect(after.dialogueHistory).toEqual(before.dialogueHistory)
}

const reachScn00Phase = (engine: GameEngine, phase: Extract<SceneStateId, 'S1' | 'S2' | 'S3' | 'S4'>) => {
  expect(engine.inspect('HS-G02-0001').ok).toBe(true)
  if (phase === 'S1') return
  expect(engine.inspect('HS-G02-0002').ok).toBe(true)
  if (phase === 'S2') return
  solvePulse(engine)
  if (phase === 'S3') return
  expect(engine.inspect('RUNTIME-HS-G02-00-SAMPLE').ok).toBe(true)
}

describe('G02 vertical slice runtime', () => {
  it('uses all nine formal dialogue texts and chains only the formal dependent rows', () => {
    const formal = [
      ['DLG-G02-0001', '我有四个问题。第一，为什么求救信号来自垃圾雨中心？', '无', 'DLG-G02-0002'],
      ['DLG-G02-0002', '问题留着落地再问。左侧那根断卫星轴，能当掩体。', 'DLG-G02-0001', null],
      ['DLG-G02-0003', '别碰那根线！它接的是清算主回路！', '进入救援区', 'DLG-G02-0004'],
      ['DLG-G02-0004', '先救人。线路等站稳再查。', 'DLG-G02-0003', null],
      ['DLG-G02-0005', '未授权拾取。资源进入封存。', '救援完成', 'DLG-G02-0006'],
      ['DLG-G02-0006', '这些东西有名字，也有正在使用它们的人。', 'DLG-G02-0005', null],
      ['DLG-G02-0007', '第一块屏幕需要六格电，第二块需要四格，第三块……污渍不是数字。', '点击主屏', null],
      ['DLG-G02-0008', '它不是分不清东西是谁的。它是不再相信有人会还。', '档案播放完成', 'DLG-G02-0009'],
      ['DLG-G02-0009', '那就让它看见：借、用、还，三步都有人负责。', 'DLG-G02-0008', null],
    ] as const
    expect(
      G02_DIALOGUE.map((node) => [
        node.dialogue_id,
        node.text,
        node.trigger_condition,
        node.next_dialogue_id,
      ]),
    ).toEqual(formal)

    const engine = enterScn00()
    const runner = new DialogueRunner(new DialogueDataLoader(G02_DIALOGUE), engine)
    expect(runner.startTrigger('SCN-G02-00', '无')).toBe(true)
    expect(runner.current?.dialogue_id).toBe('DLG-G02-0001')
    runner.advance()
    expect(runner.current?.dialogue_id).toBe('DLG-G02-0002')
    runner.advance()
    expect(runner.current).toBeNull()
  })

  it('loads the three formal SCN02 hints with exact text and one-step effects', () => {
    expect(
      G02_HINTS.filter((hint) => hint.sceneId === 'SCN-G02-02').map((hint) => [
        hint.hintId,
        hint.text,
        hint.effect,
      ]),
    ).toEqual([
      ['HINT-G02-001-1', '先检查屏幕碎片堆，缺少的不是整块屏幕。', 'direction_only'],
      ['HINT-G02-001-2', '三枚电源键的边缘磨损分别对应三块主屏。', 'highlight_current_region'],
      ['HINT-G02-001-3', '自动将一枚正确电源键放入对应槽。', 'install_one_power_key'],
    ])
  })

  it('completes SCN00 with a real scan and writes evidence only after verification', () => {
    const engine = enterScn00()
    expect(engine.snapshot.flags.g02_intro_scan_done).toBe(false)
    expect(engine.inspect('HS-G02-0001').ok).toBe(true)
    expect(engine.inspect('HS-G02-0002').ok).toBe(true)
    expect(engine.snapshot.flags.g02_evidence_001).not.toBe(true)
    expect(engine.submitG02PulseSample().ok).toBe(false)
    expect(engine.snapshot.sceneState).toBe('S2')
    solvePulse(engine)
    expect(engine.snapshot.puzzleProgress.g02_pulse_scan).toBe('3-2-3:sealed-sample')
    expect(engine.snapshot.flags.g02_intro_scan_done).toBe(false)
    expect(engine.inspect('RUNTIME-HS-G02-00-SAMPLE').ok).toBe(true)
    expect(engine.snapshot.flags.g02_intro_scan_done).toBe(false)
    expect(engine.inspect('RUNTIME-HS-G02-00-VERIFY').ok).toBe(true)
    expect(engine.snapshot.flags.g02_intro_scan_done).toBe(true)
    expect(engine.snapshot.flags.g02_evidence_001).toBe(true)
    expect(engine.inspect('RUNTIME-HS-G02-00-EXIT').ok).toBe(true)
    expect(engine.snapshot.flags.world_star_core_count).toBe(0)
  })

  it('persists partial waveform controls across reload without completing the scan', () => {
    const repository = new MemorySaveRepository()
    const engine = enterScn00(repository)
    expect(engine.inspect('HS-G02-0001').ok).toBe(true)
    expect(engine.inspect('HS-G02-0002').ok).toBe(true)
    expect(engine.setG02PulseControl('interval', 3).ok).toBe(true)
    expect(engine.setG02PulseControl('gain', 2).ok).toBe(true)
    const refreshed = new GameEngine(G01, repository)
    expect(refreshed.snapshot.sceneState).toBe('S2')
    expect(refreshed.snapshot.puzzleProgress.g02_pulse_interval).toBe(3)
    expect(refreshed.snapshot.puzzleProgress.g02_pulse_gain).toBe(2)
    expect(refreshed.snapshot.puzzleProgress.g02_pulse_window).toBeUndefined()
    expect(refreshed.snapshot.completedPuzzleIds).not.toContain('RUNTIME-PUZ-G02-PULSE-SCAN')
  })

  it.each(['S1', 'S2', 'S3', 'S4'] as const)(
    'persists SCN00 %s soft failure and resumes exact pre-failure progress',
    (phase) => {
      const repository = new MemorySaveRepository()
      const engine = enterScn00(repository)
      reachScn00Phase(engine, phase)
      const before = engine.snapshot
      expect(engine.triggerG02SoftFailure(`scn00-${phase}`).ok).toBe(true)
      expect(engine.snapshot.flags.g02_evidence_001).not.toBe(true)

      const refreshed = new GameEngine(G01, repository)
      expect(refreshed.snapshot.activeRuntimeNodeId).toBe(
        'SCN-G02-00:satellite-axle-cover',
      )
      preservedGameplay(before, refreshed.snapshot)
      expect(refreshed.resumeG02AfterSoftFailure().ok).toBe(true)
      expect(refreshed.snapshot.sceneState).toBe(phase)
    },
  )

  it('rescues Almao, scans exactly three evidence labels and never grants the grapnel twice', () => {
    const engine = enterScn01()
    expect(engine.inspect('RUNTIME-HS-G02-01-OBSERVE').ok).toBe(true)
    expect(
      engine.snapshot.inventoryItemIds.filter(
        (id) => id === 'RUNTIME-ITM-G02-MAGNETIC-GRAPNEL',
      ),
    ).toHaveLength(1)
    expect(engine.inspect('RUNTIME-HS-G02-01-OBSERVE').ok).toBe(false)
    expect(
      engine.snapshot.inventoryItemIds.filter(
        (id) => id === 'RUNTIME-ITM-G02-MAGNETIC-GRAPNEL',
      ),
    ).toHaveLength(1)

    engine.updateStory((draft) => draft.inventoryItemIds.push('ITM-G01-001'))
    const beforeWrong = engine.snapshot
    expect(engine.useItem('ITM-G01-001', 'HS-G02-0003').ok).toBe(false)
    expect(engine.snapshot.inventoryItemIds).toContain('ITM-G01-001')
    expect(engine.snapshot.completedHotspotIds).toEqual(beforeWrong.completedHotspotIds)

    expect(engine.useItem('RUNTIME-ITM-G02-MAGNETIC-GRAPNEL', 'HS-G02-0003').ok).toBe(true)
    expect(engine.inspect('RUNTIME-HS-G02-01-RESCUE-CONFIRM').ok).toBe(true)
    expect(engine.snapshot.flags.g02_almao_rescued).toBe(true)
    expect(engine.snapshot.flags.g02_resource_labels).toBe(0)
    for (const [index, id] of ['HS-G02-0005', 'HS-G02-0006', 'HS-G02-0007'].entries()) {
      expect(engine.inspect(id).ok).toBe(true)
      expect(engine.snapshot.flags.g02_resource_labels).toBe(index + 1)
    }
    expect(engine.inspect('HS-G02-0007').ok).toBe(false)
    expect(engine.snapshot.flags.g02_resource_labels).toBe(3)
    expect(
      engine.assignG02ResourceLabel(
        'RUNTIME-G02-LABEL-DOUBLE-RING',
        'RUNTIME-G02-SLOT-DISCARDED',
      ).ok,
    ).toBe(false)
    expect(engine.snapshot.sceneState).toBe('S5')
    expect(engine.submitG02ResourceClassification().ok).toBe(false)
    solveResources(engine)
  })

  it('persists one correctly placed resource label across reload without completing classification', () => {
    const repository = new MemorySaveRepository()
    const engine = enterScn01(repository)
    expect(engine.inspect('RUNTIME-HS-G02-01-OBSERVE').ok).toBe(true)
    expect(engine.useItem('RUNTIME-ITM-G02-MAGNETIC-GRAPNEL', 'HS-G02-0003').ok).toBe(true)
    expect(engine.inspect('RUNTIME-HS-G02-01-RESCUE-CONFIRM').ok).toBe(true)
    for (const id of ['HS-G02-0005', 'HS-G02-0006', 'HS-G02-0007']) {
      expect(engine.inspect(id).ok).toBe(true)
    }
    expect(engine.assignG02ResourceLabel(...resourceAssignments[0]).ok).toBe(true)
    const refreshed = new GameEngine(G01, repository)
    expect(refreshed.snapshot.sceneState).toBe('S5')
    expect(
      refreshed.snapshot.puzzleProgress[
        'g02_resource_assignment_RUNTIME-G02-LABEL-DOUBLE-RING'
      ],
    ).toBe('RUNTIME-G02-SLOT-PRIVATE')
    expect(refreshed.snapshot.completedPuzzleIds).not.toContain(
      'RUNTIME-PUZ-G02-RESOURCE-CLASSIFICATION',
    )
  })

  it.each(['S1', 'S2'] as const)(
    'preserves SCN01 %s rescue progress through safe recovery',
    (phase) => {
      const repository = new MemorySaveRepository()
      const engine = enterScn01(repository)
      expect(engine.inspect('RUNTIME-HS-G02-01-OBSERVE').ok).toBe(true)
      if (phase === 'S2') {
        expect(
          engine.useItem('RUNTIME-ITM-G02-MAGNETIC-GRAPNEL', 'HS-G02-0003').ok,
        ).toBe(true)
      }
      const before = engine.snapshot
      expect(engine.triggerG02SoftFailure(`scn01-${phase}`).ok).toBe(true)
      expect(engine.snapshot.flags.g02_almao_rescued).not.toBe(true)
      const refreshed = new GameEngine(G01, repository)
      preservedGameplay(before, refreshed.snapshot)
      expect(refreshed.resumeG02AfterSoftFailure().ok).toBe(true)
      expect(refreshed.snapshot.sceneState).toBe(phase)
      expect(
        refreshed.snapshot.foundItemIds.filter(
          (id) => id === 'RUNTIME-ITM-G02-MAGNETIC-GRAPNEL',
        ),
      ).toHaveLength(0)
      expect(
        refreshed.snapshot.inventoryItemIds.filter(
          (id) => id === 'RUNTIME-ITM-G02-MAGNETIC-GRAPNEL',
        ),
      ).toHaveLength(phase === 'S1' ? 1 : 0)
    },
  )

  it('makes every HOS target independently disappear and persist after reload', () => {
    const repository = new MemorySaveRepository()
    const engine = enterScn02(repository)
    expect(engine.inspect('HS-G02-0011').ok).toBe(true)
    expect(engine.snapshot.sceneState).toBe('S1')
    for (const id of hosItems.slice(0, 3)) {
      expect(engine.findItem(id).ok).toBe(true)
      expect(engine.activeHotspots().some((hotspot) => hotspot.itemId === id)).toBe(false)
    }
    const refreshed = new GameEngine(G01, repository)
    for (const id of hosItems.slice(0, 3)) {
      expect(refreshed.snapshot.foundItemIds).toContain(id)
      expect(refreshed.activeHotspots().some((hotspot) => hotspot.itemId === id)).toBe(false)
    }
    for (const id of hosItems.slice(3)) expect(refreshed.findItem(id).ok).toBe(true)
    expect(refreshed.snapshot.hosProgress['HOS-G02-001']).toEqual(hosItems)
    expect(refreshed.snapshot.sceneState).toBe('S2')
  })

  it('repairs all three screens by drag-compatible item use and keeps wrong items', () => {
    const engine = enterScn02()
    expect(engine.inspect('HS-G02-0011').ok).toBe(true)
    for (const id of hosItems) expect(engine.findItem(id).ok).toBe(true)

    const beforeWrong = engine.snapshot
    expect(engine.useItem('ITM-G02-006', 'RUNTIME-HS-G02-0008-KEY').ok).toBe(false)
    expect(engine.snapshot.inventoryItemIds).toContain('ITM-G02-006')
    expect(engine.snapshot.completedHotspotIds).toEqual(beforeWrong.completedHotspotIds)

    expect(engine.useItem('ITM-G02-002', 'RUNTIME-HS-G02-0008-KEY').ok).toBe(true)
    expect(engine.useItem('RUNTIME-ITM-G02-005-A', 'HS-G02-0008').ok).toBe(true)
    expect(engine.useItem('ITM-G02-003', 'RUNTIME-HS-G02-0009-KEY').ok).toBe(true)
    expect(engine.useItem('RUNTIME-ITM-G02-005-B', 'HS-G02-0009').ok).toBe(true)
    expect(engine.useItem('ITM-G02-004', 'HS-G02-0010').ok).toBe(true)
    expect(engine.snapshot.sceneState).toBe('S5')
    expect(engine.snapshot.inventoryItemIds).toContain('ITM-G02-006')
    expect(engine.snapshot.flags.g02_archive_restored).toBe(false)
    expect(engine.inspect('RUNTIME-HS-G02-02-ARCHIVE').ok).toBe(true)
    expect(engine.snapshot.flags.g02_archive_restored).toBe(true)
    expect(engine.snapshot.flags.g02_evidence_005).toBe(true)
  })

  it.each(['S2', 'S3', 'S4'] as const)(
    'preserves SCN02 %s HOS, items and correct repair steps through safe recovery',
    (phase) => {
      const repository = new MemorySaveRepository()
      const engine = enterScn02(repository)
      expect(engine.inspect('HS-G02-0011').ok).toBe(true)
      for (const id of hosItems) expect(engine.findItem(id).ok).toBe(true)
      if (phase === 'S3' || phase === 'S4') {
        expect(engine.useItem('ITM-G02-002', 'RUNTIME-HS-G02-0008-KEY').ok).toBe(true)
        expect(engine.useItem('RUNTIME-ITM-G02-005-A', 'HS-G02-0008').ok).toBe(true)
      }
      if (phase === 'S4') {
        expect(engine.useItem('ITM-G02-003', 'RUNTIME-HS-G02-0009-KEY').ok).toBe(true)
        expect(engine.useItem('RUNTIME-ITM-G02-005-B', 'HS-G02-0009').ok).toBe(true)
      }
      const before = engine.snapshot
      expect(engine.triggerG02SoftFailure(`scn02-${phase}`).ok).toBe(true)
      expect(engine.snapshot.flags.g02_evidence_005).not.toBe(true)
      const refreshed = new GameEngine(G01, repository)
      preservedGameplay(before, refreshed.snapshot)
      expect(refreshed.resumeG02AfterSoftFailure().ok).toBe(true)
      expect(refreshed.snapshot.sceneState).toBe(phase)
    },
  )

  it('makes the SCN00 level-three hint calibrate one control without completing the scan', () => {
    const engine = enterScn00()
    expect(engine.inspect('HS-G02-0001').ok).toBe(true)
    expect(engine.inspect('HS-G02-0002').ok).toBe(true)
    const before = engine.snapshot.transitionLog.length
    const hints = [engine.requestHint('scene'), engine.requestHint('scene'), engine.requestHint('scene')]
    expect(hints.map((hint) => hint?.hintId)).toEqual([
      'RUNTIME-HINT-G02-00-1',
      'RUNTIME-HINT-G02-00-2',
      'RUNTIME-HINT-G02-00-3',
    ])
    expect(engine.completeHintStep(hints[2]!).ok).toBe(true)
    expect(engine.snapshot.puzzleProgress.g02_pulse_interval).toBe(3)
    expect(engine.snapshot.puzzleProgress.g02_pulse_gain).toBeUndefined()
    expect(engine.snapshot.puzzleProgress.g02_pulse_window).toBeUndefined()
    expect(engine.snapshot.completedPuzzleIds).not.toContain('RUNTIME-PUZ-G02-PULSE-SCAN')
    expect(engine.snapshot.transitionLog.length).toBe(before)
    expect(engine.snapshot.sceneState).toBe('S2')
  })

  it('makes the SCN01 level-three hint place one label without completing classification', () => {
    const engine = enterScn01()
    expect(engine.inspect('RUNTIME-HS-G02-01-OBSERVE').ok).toBe(true)
    expect(engine.useItem('RUNTIME-ITM-G02-MAGNETIC-GRAPNEL', 'HS-G02-0003').ok).toBe(true)
    expect(engine.inspect('RUNTIME-HS-G02-01-RESCUE-CONFIRM').ok).toBe(true)
    for (const id of ['HS-G02-0005', 'HS-G02-0006', 'HS-G02-0007']) {
      expect(engine.inspect(id).ok).toBe(true)
    }
    const hints = [engine.requestHint('scene'), engine.requestHint('scene'), engine.requestHint('scene')]
    expect(hints.map((hint) => hint?.hintId)).toEqual([
      'RUNTIME-HINT-G02-01-1',
      'RUNTIME-HINT-G02-01-2',
      'RUNTIME-HINT-G02-01-3',
    ])
    expect(engine.completeHintStep(hints[2]!).ok).toBe(true)
    expect(
      Object.keys(engine.snapshot.puzzleProgress).filter((key) =>
        key.startsWith('g02_resource_assignment_'),
      ),
    ).toHaveLength(1)
    expect(engine.snapshot.completedPuzzleIds).not.toContain(
      'RUNTIME-PUZ-G02-RESOURCE-CLASSIFICATION',
    )
    expect(engine.snapshot.sceneState).toBe('S5')
  })

  it('makes formal HINT-G02-001-3 install one power key and nothing else', () => {
    const engine = enterScn02()
    expect(engine.inspect('HS-G02-0011').ok).toBe(true)
    for (const id of hosItems) expect(engine.findItem(id).ok).toBe(true)
    const hints = [engine.requestHint('scene'), engine.requestHint('scene'), engine.requestHint('scene')]
    expect(hints.map((hint) => hint?.hintId)).toEqual([
      'HINT-G02-001-1',
      'HINT-G02-001-2',
      'HINT-G02-001-3',
    ])
    expect(engine.completeHintStep(hints[2]!).ok).toBe(true)
    expect(engine.snapshot.flags.g02_screen_a_key_installed).toBe(true)
    expect(engine.snapshot.flags.g02_screen_a_restored).not.toBe(true)
    expect(engine.snapshot.inventoryItemIds).not.toContain('ITM-G02-002')
    expect(engine.snapshot.inventoryItemIds).toContain('RUNTIME-ITM-G02-005-A')
    expect(engine.snapshot.sceneState).toBe('S2')
  })

  it('finishes at the read-only SCN03 boundary with only four G02 variables changed', () => {
    const engine = enterScn02()
    expect(engine.inspect('HS-G02-0011').ok).toBe(true)
    for (const id of hosItems) expect(engine.findItem(id).ok).toBe(true)
    expect(engine.useItem('ITM-G02-002', 'RUNTIME-HS-G02-0008-KEY').ok).toBe(true)
    expect(engine.useItem('RUNTIME-ITM-G02-005-A', 'HS-G02-0008').ok).toBe(true)
    expect(engine.useItem('ITM-G02-003', 'RUNTIME-HS-G02-0009-KEY').ok).toBe(true)
    expect(engine.useItem('RUNTIME-ITM-G02-005-B', 'HS-G02-0009').ok).toBe(true)
    expect(engine.useItem('ITM-G02-004', 'HS-G02-0010').ok).toBe(true)
    expect(engine.inspect('RUNTIME-HS-G02-02-ARCHIVE').ok).toBe(true)
    expect(engine.advanceG02Slice().ok).toBe(true)

    const snapshot = engine.snapshot
    expect(snapshot.currentSceneId).toBe('RUNTIME-G02-ENERGY-SEARCH-BOUNDARY')
    expect(engine.currentSceneDefinition.hotspots).toHaveLength(0)
    expect(engine.currentSceneDefinition.transitions).toHaveLength(0)
    expect(snapshot.flags.g02_intro_scan_done).toBe(true)
    expect(snapshot.flags.g02_almao_rescued).toBe(true)
    expect(snapshot.flags.g02_resource_labels).toBe(3)
    expect(snapshot.flags.g02_archive_restored).toBe(true)
    expect(snapshot.flags.g02_magnetic_glove_owned).toBe(false)
    expect(snapshot.flags.g02_admin_unlocked).toBe(false)
    expect(snapshot.flags.g02_chapter_complete).toBe(false)
    expect(snapshot.flags.world_star_core_count).toBe(0)
    expect(snapshot.flags.g01_chapter_complete).toBe(true)
    expect(snapshot.flags.g01_handoff_to_g02).toBe(true)
    expect(snapshot.flags.ability_qima_search).toBe(true)
    expect(snapshot.flags.ability_analysis).toBe(true)
    expect(snapshot.flags.ability_pathfinding).toBe(true)
    expect(snapshot.flags.ability_teleport).toBe(false)
    expect(snapshot.flags.ability_shrink).toBe(false)
    expect(snapshot.flags.ability_clone).toBe(false)
  })
})
