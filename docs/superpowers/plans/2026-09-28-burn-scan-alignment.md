# Burn scan alignment implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Make the visible burn trace meet its actual scan targets, with a readable outside-to-B direction.
**Architecture:** Keep current mechanics and save schema. Align authored scene geometry with existing controls; add noninteractive directional markings. No new scene or runtime dependency.
**Tech Stack:** Godot 4.7.2 Standard, GDScript, native Windows.
**Spec:** User's Issue #22 / Draft PR #23 heartbeat; godot/AGENTS.md.

## Global constraints

Only SCN-G01-00. Preserve observation/hypothesis/baseline gates, wrong-input recovery and explicit scan confirmation. No Web runtime, G5 material, duration padding, PR readiness or merge.

## Review focus

Trace points must land inside their clickable scan heads; direction must not depend solely on numbered answers. Decorations must not intercept clicks or cover controls. Existing armed, completed and resumed states must remain correct. Small-resolution visibility requires native rendered inspection. A fixture is not playthrough evidence.

## Task 1: Align visible scan evidence

Files: godot/scenes/ui/EvidenceInspection.tscn; godot/tests/test_evidence_inspection.gd; godot/tests/runtime_smoke.gd if needed.
Interface: existing BurnPanel/Trace and Scan0..3, no new mechanics API.

- [ ] Add regression asserting every authored trace point is inside its corresponding scan control; check direction markings are noninteractive and away from control text.
- [ ] Run Godot tests and confirm geometry assertions fail on current scene.
- [ ] Align trace endpoints to scan centers, add visible outside/B endpoint context and direction strokes between heads. Preserve target size and state logic.
- [ ] Run full Godot tests/runtime smoke/import, native render at both target sizes, provenance/preflight, no-Web scan and Windows export.
- [ ] Independent review, record limitations, commit only scoped files, synchronize to existing Draft PR with exact-tree validation.

## Execution ledger

Base: 4298d81965d18b4de2d77b2911aa2cd5b55a9ed2. Pre-flight: single task, no shared interfaces.
Ruling: execute this bounded repair autonomously as explicitly authorized by the user; defer larger visual redesign until the input/evidence mismatch is corrected. This does not satisfy mature-HOPA or duration acceptance.
Review expansion: an independent read-only review found that all three evidence close-ups disabled already-read details, preventing evidence comparison after reopen, and initial instructions requested gated controls. Include the minimum shared view correction: retain checkmarks while allowing idempotent rereading; derive instructions from observation, interpretation, mechanism and completion gates. No mechanic/schema change.
RED evidence: seven geometry/direction assertions failed. Fifteen reread/guidance assertions failed. Runtime viewport reread failed once while the remaining smoke route ran. GREEN: full unit suite and runtime smoke passed after corrections.
Rendered QA: fresh, scan and armed component fixtures generated at both resolutions; scan-1366 and fresh-1920 visually inspected. These are not ordinary-player footage. Fixture process reported one ObjectDB instance on exit; production unit/runtime suites reported no leak warning.
Independent review: first attempt hit usage limit; resumed reviewer found no Critical/Important issue. It noted stale next-step commands in repeatable facts. Removed those commands from all three final-detail texts; stage instructions already supply current operations. No gameplay rule changed.
Ruling: ordinary-player discoverability, full-route quality, duration and release readiness cannot be judged from these fixtures; retain all as open acceptance gates. Current schematic appearance still falls short of the intended mature physical HOPA presentation.
Actual partial UI check: the isolated normal-UI save resumed in the exported EXE at 1366×768. Read all three burn details then clicked the first checked button, restoring its fact while comparison guidance remained. No save injection and no timing claim. Closed only the test EXE afterward. Final factual-copy cleanup postdates this tested EXE.
