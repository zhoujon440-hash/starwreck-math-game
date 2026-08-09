import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { G01 } from '../../src/content/g01'
import { characterNarrativelyRevealed } from '../../src/data/trial/characterReveal'
import { presentIdentityMarkup } from '../../src/data/dialogue/presentation'
import { SCENE_EXPERIENCES } from '../../src/data/trial/sceneExperiences'
import { GameEngine } from '../../src/game/engine'
import {
  applyTrialMechanicAction,
  initialMechanicProgress,
  TRIAL_MECHANICS,
} from '../../src/game/minigames/trialMechanics'
import { MemorySaveRepository } from '../../src/game/save'

describe('trial experience P0 corrective contracts', () => {
  it('maps all eleven scenes to eleven genuinely distinct mechanic types', () => {
    expect(SCENE_EXPERIENCES).toHaveLength(11)
    expect(new Set(SCENE_EXPERIENCES.map((entry) => entry.sceneId)).size).toBe(11)
    expect(new Set(SCENE_EXPERIENCES.map((entry) => entry.mechanicType)).size).toBe(11)
    for (const entry of SCENE_EXPERIENCES) {
      expect(entry.entryReason).toBeTruthy()
      expect(entry.openingEvent).toBeTruthy()
      expect(entry.mainGoal).toBeTruthy()
      expect(Object.keys(entry.stepByState)).toEqual(['S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'])
      expect(entry.searchGoal).toBeTruthy()
      expect(entry.combineGoal).toBeTruthy()
      expect(entry.characterFeedback).toBeTruthy()
      expect(entry.completionResult).toBeTruthy()
      expect(entry.nextReason).toBeTruthy()
    }
  })

  it.each(SCENE_EXPERIENCES.map((entry) => [entry.sceneId, entry.mechanicType] as const))(
    '%s mechanic exposes initial, error, partial and complete without losing confirmed steps',
    (sceneId, mechanicType) => {
      const definition = TRIAL_MECHANICS[mechanicType]
      let progress = initialMechanicProgress(sceneId)
      expect(progress.status).toBe('initial')
      if (definition.sequence) {
        if (mechanicType === 'signal-memory') {
          progress = applyTrialMechanicAction(sceneId, progress, { kind: 'play' })
          expect(progress.values.playbackSeen).toBe(true)
        }
        const wrong = definition.tokens.find((token) => token !== definition.sequence?.[0])!
        progress = applyTrialMechanicAction(sceneId, progress, { kind: 'choose', target: wrong })
        expect(progress.status).toBe('error')
        expect(progress.confirmedSteps).toEqual([])
        if (mechanicType === 'signal-memory') progress = applyTrialMechanicAction(sceneId, progress, { kind: 'play' })
        for (const token of definition.sequence) {
          progress = applyTrialMechanicAction(sceneId, progress, { kind: 'choose', target: token })
          if (token !== definition.sequence.at(-1)) expect(progress.status).toBe('partial')
        }
      } else {
        progress = applyTrialMechanicAction(sceneId, progress, { kind: 'submit' })
        expect(progress.status).toBe('error')
        const placements = Object.entries(definition.targetPlacements ?? {})
        const values = Object.entries(definition.targetValues ?? {})
        const first = placements[0] ?? values[0]
        if (placements[0]) progress = applyTrialMechanicAction(sceneId, progress, { kind: 'place', target: first[0], slot: String(first[1]) })
        else progress = applyTrialMechanicAction(sceneId, progress, { kind: 'set', target: first[0], value: Number(first[1]) })
        expect(progress.status).toBe('partial')
        for (const [target, slot] of placements.slice(placements[0] ? 1 : 0)) {
          progress = applyTrialMechanicAction(sceneId, progress, { kind: 'place', target, slot })
        }
        for (const [target, value] of values.slice(placements[0] ? 0 : 1)) {
          progress = applyTrialMechanicAction(sceneId, progress, { kind: 'set', target, value })
        }
        progress = applyTrialMechanicAction(sceneId, progress, { kind: 'submit' })
      }
      expect(progress.status).toBe('complete')
      expect(progress.mistakes).toBeGreaterThanOrEqual(definition.sequence ? 1 : 0)
    },
  )

  it('keeps viewed scene separate from mainline and revisits idempotently across reload', () => {
    const saves = new MemorySaveRepository()
    const engine = new GameEngine(G01, saves)
    engine.updateStory((draft) => {
      draft.sceneState = 'S6'
      draft.sceneStates['SCN-G01-00'] = 'S6'
      draft.completedSceneIds = ['SCN-G01-00']
      draft.unlockedSceneIds = ['SCN-G01-00', 'SCN-G01-01']
      draft.foundItemIds = ['ITM-G01-001']
      draft.usedItemIds = ['ITM-G01-001']
      draft.flags.qima_identity_revealed = false
    })
    expect(engine.enterScene('SCN-G01-01').ok).toBe(true)
    const before = engine.snapshot
    expect(before.mainlineSceneId).toBe('SCN-G01-01')
    expect(engine.visitScene('SCN-G01-00').ok).toBe(true)
    const revisited = engine.snapshot
    expect(revisited.currentSceneId).toBe('SCN-G01-00')
    expect(revisited.mainlineSceneId).toBe('SCN-G01-01')
    expect(revisited.foundItemIds).toEqual(before.foundItemIds)
    expect(revisited.usedItemIds).toEqual(before.usedItemIds)
    expect(revisited.sceneStates['SCN-G01-00']).toBe('S6')
    expect(engine.visitScene('SCN-G01-02').ok).toBe(false)
    const restored = new GameEngine(G01, saves)
    expect(restored.snapshot.mainlineSceneId).toBe('SCN-G01-01')
    expect(restored.returnToMainline().ok).toBe(true)
    expect(restored.snapshot.currentSceneId).toBe('SCN-G01-01')
  })

  it('gates character identity and cards on narrative reveal flags', () => {
    const engine = new GameEngine(G01, new MemorySaveRepository())
    expect(characterNarrativelyRevealed('CHAR-QIMA', engine.snapshot)).toBe(false)
    expect(characterNarrativelyRevealed('CHAR-ALMAO', engine.snapshot)).toBe(false)
    engine.updateStory((draft) => { draft.flags.qima_identity_revealed = true })
    expect(characterNarrativelyRevealed('CHAR-QIMA', engine.snapshot)).toBe(true)
  })

  it('conceals Qima in visible text and accessibility attributes until self-introduction', () => {
    const hidden = presentIdentityMarkup(
      { flags: { qima_identity_revealed: false } },
      '<h1>找回七码</h1><button aria-label="检查七码芯片">七码维修</button>',
    )
    expect(hidden).not.toContain('七码')
    expect(hidden).toContain('受损导航设备芯片')
    expect(presentIdentityMarkup({ flags: { qima_identity_revealed: true } }, hidden.replaceAll('受损导航设备', '七码'))).toContain('七码')
    const intro = readFileSync('src/ui/StoryIntro.ts', 'utf8')
    const story = readFileSync('src/data/trial/story.ts', 'utf8')
    expect(story).toContain("characterIds: ['CHAR-XINGYU']")
    expect(intro).toContain('card.characterIds.map(storyCharacterPortrait)')
  })

  it('uses a white shell without altering scene-art assets', () => {
    const css = readFileSync('src/styles.css', 'utf8')
    expect(css).toContain('--light-panel: #ffffff')
    expect(css).toContain('.scene-treatment')
    expect(css).toContain('.trial-mechanic-panel')
    const story = readFileSync('src/data/trial/story.ts', 'utf8')
    expect(story).toContain('星宇与受损导航设备')
    expect(story).not.toContain("title: '星宇与七码'")
  })
})
