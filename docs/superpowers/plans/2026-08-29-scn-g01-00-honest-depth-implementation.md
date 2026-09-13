# SCN-G01-00 Honest HOPA Depth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the verified eight-minute SCN-G01-00 prototype into an honest 15–18 minute original HOS/HOPA vertical slice by adding non-repeating forensic, synthesis, measurement, and dual-signal interactions.

**Architecture:** Keep rule decisions in small `RefCounted` puzzle/mechanics classes, presentation in dedicated Godot scenes, and `SCN_G01_00.gd` limited to orchestration and input ownership. Extend the strict save contract before any UI work so every subsequent task can persist and resume its own partial progress.

**Tech Stack:** Godot 4.7.2 stable, GDScript, Godot `.tscn` scenes, JSON content, PowerShell Windows evidence automation.

**Spec:** `docs/superpowers/specs/2026-08-29-scn-g01-00-honest-depth-design.md`

## Global Constraints

- Implement only `SCN-G01-00`; do not enter `SCN-G01-01` or expand the map.
- Keep exactly seven clues (`CLUE-001—007`) and four deductions (`DED-001—004`).
- Preserve the novel order: 百工星环 departure, zero-Earth blockade impact through B, restoration, automatic maintenance broadcast, then the weak `UNKNOWN` warning.
- Keep Draft PR #23 Draft; do not mark it ready for review, merge it, close Issue #22, or modify frozen PR #21.
- Godot version is exactly `4.7.2.stable.official.ed1daf0bf`; Windows Desktop only; no Web runtime/export/dependency.
- Do not copy G5 assets, UI, story, puzzle layout, brand elements, or recognizable trade dress.
- No classroom quiz, grade, score, generic answer field, artificial wait, idle padding, exhaustive error traversal, or repeated interaction reskin.
- Use test-driven development: add a failing focused test, run it and observe the intended failure, implement the minimum product behavior, then run focused and full tests.
- Each task ends in a focused commit and a fresh independent review before the next task starts.
- For every command block below, set `$GodotExe = (Resolve-Path '.superpowers/sdd/2026-08-22-godot-windows-scn-g01-00-implementation/tools/Godot_v4.7.2-stable_win64_console.exe').Path` and verify `& $GodotExe --version` prints `4.7.2.stable.official.ed1daf0bf`.

---

### Task 1: Strict Save Contract for the Depth Pass

**Files:**
- Modify: `godot/scripts/core/GameState.gd`
- Modify: `godot/tests/test_game_state.gd`
- Modify: `godot/tests/test_save_service.gd`

**Interfaces:**
- Consumes: existing `GameState.snapshot() -> Dictionary` and `GameState.restore(data: Dictionary) -> bool`.
- Produces: `investigation_state` keys `burn_baseline`, `burn_baseline_locked`, `burn_active_point`, `burn_hold_progress`, `tape_order`, `tape_verified`, `plate_trace_nodes`, `repair_synthesis_steps`, `repair_synthesis_complete`; `math_state` keys `measurement_stage`, `origin_tick`, `echo_measurement`, `blockade_marks`, `signal_verification`.

- [ ] **Step 1: Write failing default-state and round-trip tests**

Add assertions that a new state contains these exact shapes:

```gdscript
t.equal(state.investigation_state["burn_baseline"], [0, 0, 0, 0])
t.equal(state.investigation_state["burn_active_point"], -1)
t.equal(state.investigation_state["tape_order"], [0, 1, 2])
t.equal(state.investigation_state["repair_synthesis_steps"], [])
t.equal(state.math_state["measurement_stage"], "origin")
t.equal(state.math_state["echo_measurement"], {"pulse": 0, "echo": 0, "confirmed": false})
t.equal(state.math_state["blockade_marks"], [])
t.equal(state.math_state["signal_verification"]["retained_channels"], [])
```

Mutate every new field, snapshot, restore into a fresh state, and assert deep equality.

- [ ] **Step 2: Run the state/save suites and verify RED**

Run:

```powershell
& $GodotExe --headless --path godot --script res://tests/run_tests.gd
```

Expected: failures identify missing depth-state keys or rejected round-trip data.

- [ ] **Step 3: Add defaults, normalization, and strict validation**

Use these exact default shapes:

```gdscript
"burn_baseline": [0, 0, 0, 0],
"burn_baseline_locked": false,
"burn_active_point": -1,
"burn_hold_progress": 0.0,
"tape_order": [0, 1, 2],
"tape_verified": false,
"plate_trace_nodes": [],
"repair_synthesis_steps": [],
"repair_synthesis_complete": false,
```

```gdscript
"measurement_stage": "origin",
"origin_tick": 0,
"echo_measurement": {"pulse": 0, "echo": 0, "confirmed": false},
"blockade_marks": [],
"signal_verification": {
    "maintenance_gain": 0,
    "maintenance_locked": false,
    "weak_gain": 0,
    "weak_phase": 0,
    "weak_locked": false,
    "retained_channels": [],
    "sealed": false,
},
```

Validate allowed keys, booleans, finite floats, integer ranges, unique integer arrays, stage enum `origin/echo/blockade/windows/complete`, channel enum `maintenance/weak`, and cross-field consistency. Reject unknown nested keys and impossible states such as `sealed=true` without both retained channels.

- [ ] **Step 4: Add malformed nested-state tests**

Test rejection of: burn hold outside `0.0–1.0`, duplicate tape order entries, trace node outside the configured index range, unknown measurement stage, duplicate blockade marks, weak lock before maintenance lock, and sealed signal state missing a retained channel.

- [ ] **Step 5: Run import, focused state tests, and the full suite**

Expected: import exit `0`, `TESTS PASSED`, no leaked generated tracked files.

- [ ] **Step 6: Commit**

```powershell
git add godot/scripts/core/GameState.gd godot/tests/test_game_state.gd godot/tests/test_save_service.gd
git commit -m "feat(godot): persist honest depth interactions"
```

---

### Task 2: Three Distinct Forensic Operations

**Files:**
- Modify: `godot/data/scenes/scn_g01_00.json`
- Modify: `godot/scripts/interaction/EvidenceInspectionMechanics.gd`
- Modify: `godot/scripts/interaction/EvidenceInspection.gd`
- Modify: `godot/scenes/ui/EvidenceInspection.tscn`
- Modify: `godot/scripts/scenes/SCN_G01_00.gd`
- Modify: `godot/tests/test_evidence_inspection.gd`
- Modify: `godot/tests/test_scene_contract.gd`
- Modify: `godot/tests/runtime_smoke.gd`

**Interfaces:**
- Consumes: Task 1 investigation-state keys.
- Produces: `EvidenceInspection.setup(game_state: RefCounted, forensic_config: Dictionary) -> void`, `calibrate_burn_segment(index: int, direction: int) -> Dictionary`, `lock_burn_baseline() -> Dictionary`, `advance_burn_hold(index: int, delta: float) -> Dictionary`, `swap_tape_reels(left_index: int) -> Dictionary`, `verify_tape_run() -> Dictionary`, `trace_plate_node(index: int) -> Dictionary`.

- [ ] **Step 1: Add failing mechanics tests for all three signatures**

Use fixed current-scene targets in JSON:

```json
"forensic_workbench": {
  "burn_baseline_target": [1, 2, 2, 3],
  "burn_hold_seconds": 0.65,
  "tape_order_target": [1, 0, 2],
  "tape_positions_target": [2, 1, 2],
  "plate_trace_target": [0, 2, 3, 5]
}
```

Assert that burn scanning is blocked before baseline lock, partial holds survive, wrong tape order fails despite correct reel faces, wrong plate branch returns `trace_dead_end`, and correct paths finish without adding a clue directly.

- [ ] **Step 2: Run the evidence suite and verify RED**

Expected: missing methods and missing JSON contract assertions fail.

- [ ] **Step 3: Implement pure mechanics**

Construct `EvidenceInspectionMechanics` with `(game_state, forensic_config)` and return dictionaries shaped as:

```gdscript
{"ok": bool, "completed": bool, "feedback": String, "changed": bool}
```

`advance_burn_hold` accumulates clamped progress only for the next unconfirmed point and confirms it at `burn_hold_seconds`. `swap_tape_reels(0)` swaps positions 0/1 and `(1)` swaps 1/2. `verify_tape_run` requires both target order and target face positions. `trace_plate_node` accepts only the next target node and leaves prior confirmed nodes intact on a dead end.

Change `SCN_G01_00.gd` setup to call `evidence_inspection.setup(state, scene_data["forensic_workbench"])`; the close-up may not load or parse its own scene JSON.

- [ ] **Step 4: Build three different physical presentations**

Add exact control groups:

```text
BurnPanel/Baseline0..3, BurnPanel/BaselineLock, BurnPanel/HoldMeter
TapePanel/SwapLeft, TapePanel/SwapRight, TapePanel/RunLever, TapePanel/SeamLight0..1
PlatePanel/TraceNode0..5, PlatePanel/TraceLine, PlatePanel/TraceProbe
```

Wire burn `button_down/button_up` to `_process(delta)` hold progress; use swaps plus reel rotation and a run lever for tape; use sequential trace nodes and a moving probe for the plate. Keep ObservationRail/HypothesisRail as evidence comparison, but do not award a clue until the unique physical operation finishes and `RecordEvidence` is pressed.

- [ ] **Step 5: Add world feedback and recovery tests**

Verify distinct copy and signals: `BASELINE_UNSTABLE`, `SCAN_DIRECTION_REJECTED`, `TAPE_ORDER_MISMATCH`, `TRACE_BREAKS_AT_SEAM`, `TRACE_DEAD_END`. Confirm no error clears completed points from another mechanism and no key item is consumed.

- [ ] **Step 6: Add real viewport input-ownership smoke coverage**

Open each evidence close-up and send actual viewport mouse events to an overlapping cockpit coordinate. Assert the close-up advances exactly once and the underlying hotspot/modal does not activate. Resume a save in each close-up and assert the same ownership.

- [ ] **Step 7: Run import, focused/full tests, and runtime smoke**

Expected: `TESTS PASSED`, `RUNTIME SMOKE PASSED`, no parser warnings introduced by the new scene nodes.

- [ ] **Step 8: Commit**

```powershell
git add godot/data/scenes/scn_g01_00.json godot/scripts/interaction/EvidenceInspectionMechanics.gd godot/scripts/interaction/EvidenceInspection.gd godot/scenes/ui/EvidenceInspection.tscn godot/scripts/scenes/SCN_G01_00.gd godot/tests/test_evidence_inspection.gd godot/tests/test_scene_contract.gd godot/tests/runtime_smoke.gd
git commit -m "feat(godot): deepen physical forensic work"
```

---

### Task 3: Repair-Record Synthesis Before DED-004

**Files:**
- Create: `godot/scripts/puzzle/RepairSynthesisPuzzle.gd`
- Create: `godot/scripts/clue/RepairSynthesisWorkbench.gd`
- Create: `godot/scenes/ui/RepairSynthesisWorkbench.tscn`
- Create: `godot/tests/test_repair_synthesis.gd`
- Modify: `godot/tests/run_tests.gd`
- Modify: `godot/scripts/clue/DeductionGraph.gd`
- Modify: `godot/scripts/clue/DeductionBoard.gd`
- Modify: `godot/scenes/ui/DeductionBoard.tscn`
- Modify: `godot/data/scenes/scn_g01_00.json`
- Modify: `godot/tests/test_deduction_graph.gd`
- Modify: `godot/tests/runtime_smoke.gd`

**Interfaces:**
- Consumes: observed `CLUE-004—007`, unlocked `DED-003`, Task 1 `repair_synthesis_steps` state.
- Produces: `RepairSynthesisPuzzle.place_plate(slot_index: int, plate_id: String) -> Dictionary`, `remove_plate(slot_index: int) -> Dictionary`, `press_record() -> Dictionary`; signal `synthesis_completed`; `DED-004.requires_synthesis = true`.

- [ ] **Step 1: Write failing pure-puzzle tests**

Assert the workbench remains locked without DED-003 and four required clues. The accepted mapping is:

```gdscript
{0: "REV3_STAMP", 1: "AC_PATH", 2: "FUSE_SPEC"}
```

Slot labels are `年代`, `批准路径`, `备用槽`. Wrong plates stay removable, return specific world comparison feedback, and never unlock DED-004.

- [ ] **Step 2: Run the new suite and verify RED**

Expected: preload fails because the new puzzle does not exist.

- [ ] **Step 3: Implement the pure puzzle and graph gate**

`press_record` succeeds only with all prerequisites and the exact plate mapping, then sets `repair_synthesis_complete=true`. Add `"requires_synthesis": true` to DED-004 data and make `DeductionGraph` require the state flag only for deductions carrying that field.

- [ ] **Step 4: Build and integrate the in-world workbench**

The control exposes three brass plates and three mechanical slots, a compression handle, a readout, and a return control. It opens automatically after DED-003 or through a visible board control; it does not display DED-004’s final repair sequence. Closing and reopening preserves slot state.

- [ ] **Step 5: Test fair inference, save/resume, and non-bypass**

Prove all existing DED-004 relation edges can be present while DED-004 remains locked until synthesis. Prove correct synthesis without relation edges also remains locked. Restore a partial two-plate save and complete normally.

- [ ] **Step 6: Update runtime smoke through the new gate**

Drive one plausible wrong plate placement, recover it, complete the three slots, then form DED-004. Assert the route still contains exactly seven clues and four deductions.

- [ ] **Step 7: Run import, full tests, and runtime smoke**

Expected: all pass; board and workbench remain readable at 1366×768 and 1920×1080 contract sizes.

- [ ] **Step 8: Commit**

```powershell
git add godot/scripts/puzzle/RepairSynthesisPuzzle.gd godot/scripts/clue/RepairSynthesisWorkbench.gd godot/scenes/ui/RepairSynthesisWorkbench.tscn godot/tests/test_repair_synthesis.gd godot/tests/run_tests.gd godot/scripts/clue/DeductionGraph.gd godot/scripts/clue/DeductionBoard.gd godot/scenes/ui/DeductionBoard.tscn godot/data/scenes/scn_g01_00.json godot/tests/test_deduction_graph.gd godot/tests/runtime_smoke.gd
git commit -m "feat(godot): require repair record synthesis"
```

---

### Task 4: Three Different Signal-Measurement Cycles

**Files:**
- Modify: `godot/data/scenes/scn_g01_00_math.json`
- Modify: `godot/scripts/puzzle/SignalWindowPuzzle.gd`
- Modify: `godot/scripts/puzzle/SignalWindowConsole.gd`
- Modify: `godot/scenes/g01/SignalWindowConsole.tscn`
- Modify: `godot/tests/test_signal_window_puzzle.gd`
- Modify: `godot/tests/test_power_panel.gd`
- Modify: `godot/tests/runtime_smoke.gd`

**Interfaces:**
- Consumes: Task 1 math-state fields and existing config `cycle_size=12`, maintenance `[2,6,10]`, weak offset `-1`, blockade `[0,3,7,8]`.
- Produces: `set_origin_tick(tick: int) -> Dictionary`, `confirm_origin() -> Dictionary`, `set_echo_caliper(pulse_tick: int, echo_tick: int) -> Dictionary`, `confirm_echo_measurement() -> Dictionary`, `toggle_blockade_mark(tick: int) -> Dictionary`, `confirm_blockade_overlay() -> Dictionary`; window controls unlock only at stage `windows`.

- [ ] **Step 1: Replace click-count tests with stage tests and verify RED**

Test this sequence:

```gdscript
t.truthy(puzzle.set_origin_tick(0).ok)
t.truthy(puzzle.confirm_origin().ok)
t.truthy(puzzle.set_echo_caliper(6, 5).ok)
t.truthy(puzzle.confirm_echo_measurement().ok)
for tick in [0, 3, 7, 8]:
    t.truthy(puzzle.toggle_blockade_mark(tick).ok)
t.truthy(puzzle.confirm_blockade_overlay().ok)
t.equal(state.math_state["measurement_stage"], "windows")
t.equal(state.math_state["observed_cycles"], 3)
```

Also assert that `confirm_origin` rejects tick 1, echo confirmation rejects `(6,6)` and `(6,7)`, and the blockade overlay rejects a missing or extra mark without clearing prior stages.

- [ ] **Step 2: Implement the pure staged rules**

Each successful confirmation increments `observed_cycles` exactly once and advances `measurement_stage`. Repeated confirmation is idempotent. Existing `set_window` and `lock_windows` keep the unique solution `[1,5,9]` and require stage `windows`.

- [ ] **Step 3: Build three physically distinct console controls**

Add exact node groups:

```text
OriginWheel/Marker, OriginWheel/LockPin
EchoCaliper/PulseJaw, EchoCaliper/EchoJaw, EchoCaliper/MeasureLever
BlockadeOverlay/Slot00..11, BlockadeOverlay/Clamp
```

Hide later controls until their stage; show confirmed earlier evidence as read-only marks. Guided tier adds trend highlights, standard shows tick marks and signed relation, expert hides numeric window labels but retains readable etched evidence.

- [ ] **Step 4: Add distinct visual/audio feedback and hints**

Use `ORIGIN_MISMATCH`, `ECHO_OFFSET_MISMATCH`, `BLOCKADE_MAP_INCOMPLETE` plus existing collision/spacing codes. A wrong current-stage operation leaves prior confirmations and all other scene state untouched.

- [ ] **Step 5: Update runtime and actual-viewport regression paths**

Use physical viewport events for the origin wheel, two caliper jaws, four overlay slots, clamp, three phase rings, and lock lever. Assert the underlying cockpit remains blocked for every overlapping coordinate.

- [ ] **Step 6: Run import, full tests, runtime smoke, and Windows export preflight**

Expected: official version line, `TESTS PASSED`, `RUNTIME SMOKE PASSED`, export exit `0`; actual exported EXE reaches diagnostic completion from clean save without direct signal emission or save mutation.

- [ ] **Step 7: Commit**

```powershell
git add godot/data/scenes/scn_g01_00_math.json godot/scripts/puzzle/SignalWindowPuzzle.gd godot/scripts/puzzle/SignalWindowConsole.gd godot/scenes/g01/SignalWindowConsole.tscn godot/tests/test_signal_window_puzzle.gd godot/tests/test_power_panel.gd godot/tests/runtime_smoke.gd
git commit -m "feat(godot): make signal cycles measured"
```

---

### Task 5: Interactive Dual-Signal Verification and Record Seal

**Files:**
- Create: `godot/scripts/puzzle/DualSignalVerificationPuzzle.gd`
- Create: `godot/scripts/puzzle/DualSignalVerification.gd`
- Create: `godot/scenes/g01/DualSignalVerification.tscn`
- Create: `godot/tests/test_dual_signal_verification.gd`
- Modify: `godot/tests/run_tests.gd`
- Modify: `godot/scenes/g01/SCN_G01_00.tscn`
- Modify: `godot/scripts/scenes/SCN_G01_00.gd`
- Modify: `godot/scripts/core/GameState.gd`
- Modify: `godot/tests/test_narrative_continuity.gd`
- Modify: `godot/tests/test_scene_flow.gd`
- Modify: `godot/tests/runtime_smoke.gd`

**Interfaces:**
- Consumes: restored power, locked sample windows, weak echo offset `-1`, two `ending_signals` in fixed order.
- Produces: `adjust_gain(channel: String, direction: int) -> Dictionary`, `set_weak_phase(tick: int) -> Dictionary`, `lock_channel(channel: String) -> Dictionary`, `set_retained(channel: String, retained: bool) -> Dictionary`, `seal_record() -> Dictionary`; signal `verification_completed`.

- [ ] **Step 1: Write failing ordering and recovery tests**

Use target maintenance gain `3`, weak gain `2`, and weak phase `11` (the signed `−1` position on a 12-stop ring). Assert weak cannot lock before maintenance, wrong gain/phase returns specific feedback without resetting knobs, one retained channel cannot seal, and both retained channels seal exactly once.

- [ ] **Step 2: Run the new suite and verify RED**

Expected: preload fails because the new puzzle does not exist.

- [ ] **Step 3: Implement the pure verification puzzle**

Expose results shaped as:

```gdscript
{"ok": bool, "completed": bool, "feedback": String, "revealed_channel": String}
```

Locking maintenance returns `revealed_channel="maintenance"`; locking weak returns `"weak"`; `seal_record` sets `signal_verification.sealed=true`, then calls the existing signal completion boundary once through the controller.

- [ ] **Step 4: Build the world-native receiver**

Add a maintenance gain wheel, weak gain wheel, 12-stop phase wheel, two lock paddles, two physical keep gates, waveforms, a seal lever, and a return-proof housing. Do not show the second text before weak lock; do not show either sender as a choice or answer. Both keep gates must be visibly independent.

- [ ] **Step 5: Replace the automatic ending timer with active verification**

After staged power restoration, open the receiver and set `current_view="SIGNAL_VERIFY"`. Disable cockpit/panel hotspots while it owns input. On maintenance lock, reveal the automatic message first; on weak lock, reveal `文明修复者，请不要来。` with sender `UNKNOWN`; on seal, show the existing 七码/星宇 exchange, set `SLICE_COMPLETE`, and preserve both records.

- [ ] **Step 6: Extend strict current-view and resume behavior**

Allow `SIGNAL_VERIFY` in `GameState`; resume a partially tuned receiver with exact knobs/locks/keep gates. Closing or clicking through must not skip the seal, activate cockpit hotspots, or enter another scene.

- [ ] **Step 7: Run import, full tests, runtime smoke, and actual viewport input tests**

Expected: fixed message order, exact sender, two retains required, 7/4 contract intact, current scene remains SCN-G01-00, `TESTS PASSED`, `RUNTIME SMOKE PASSED`.

- [ ] **Step 8: Commit**

```powershell
git add godot/scripts/puzzle/DualSignalVerificationPuzzle.gd godot/scripts/puzzle/DualSignalVerification.gd godot/scenes/g01/DualSignalVerification.tscn godot/tests/test_dual_signal_verification.gd godot/tests/run_tests.gd godot/scenes/g01/SCN_G01_00.tscn godot/scripts/scenes/SCN_G01_00.gd godot/scripts/core/GameState.gd godot/tests/test_narrative_continuity.gd godot/tests/test_scene_flow.gd godot/tests/runtime_smoke.gd
git commit -m "feat(godot): make dual signal ending interactive"
```

---

### Task 6: Integrated UX, Readability, and Honest-Duration Gate

**Files:**
- Modify: `godot/scripts/scenes/SCN_G01_00.gd`
- Modify: `godot/data/scenes/scn_g01_00.json`
- Modify: `godot/tests/test_hint_service.gd`
- Modify: `godot/tests/test_scene_contract.gd`
- Modify: `godot/tests/runtime_smoke.gd`
- Modify: `.superpowers/sdd/2026-08-22-godot-windows-scn-g01-00-implementation/tools/actual-binary-smoke.ps1`
- Create: `.superpowers/sdd/2026-08-29-scn-g01-00-honest-depth-implementation/task-6-duration-report.md`

**Interfaces:**
- Consumes: Tasks 1–5 completed scene and exact current HEAD.
- Produces: a clean-save continuous Windows route measurement and a `PASS` only when finalized media duration is within `15:00–25:00` without prohibited padding.

- [ ] **Step 1: Add failing phase/objective/hint contract tests**

Assert objectives and three-tier hints identify the current physical operation: baseline, tape order, plate trace, synthesis, origin, caliper, blockade overlay, sampling windows, repair, maintenance carrier, weak carrier, both keep gates. Third-tier hints may demonstrate one step but must not reveal all reel positions, the three synthesis slots, all blockade slots, `[1,5,9]`, or the full repair order.

- [ ] **Step 2: Implement orchestration and polish gaps**

Update objectives, status copy, hover ownership, view resume, staged world lighting, local animations, and distinct audio cues. Preserve the main scene as visual subject and ensure all modal/open states hide or weaken unrelated HUD elements.

- [ ] **Step 3: Run the full technical gate**

Run official 4.7.2 version, headless import, full tests, runtime smoke, and Windows Desktop export. Record exact exit codes and hashes of EXE/PCK in the report; remove provisional generated files after measurement unless they are promoted to final evidence in Task 7.

- [ ] **Step 4: Update the visible Windows route for new interactions**

The route must delete both save and temporary save, launch New Game, use only visible OS input, read visible copy at no slower than 5.5 CJK/Latin characters per second, and include at most one plausible relation correction, one plausible mechanism correction, and one protector safety rejection.

- [ ] **Step 5: Record and measure one honest 1366×768 baseline**

Log timestamps for opening, flashlight, each forensic completion, seventh clue, each deduction, synthesis completion, each measurement stage, diagnostic completion, power restoration, each signal lock, record seal, and slice completion. Verify the video is continuous and unedited.

- [ ] **Step 6: Apply the duration hard gate**

If finalized duration is below `15:00`, set report status `NEEDS_PRODUCT_DEPTH`, identify the thin authored beat by timestamps, make no final evidence set, and return that beat to the relevant implementation task. If duration is `15:00–25:00`, set status `DURATION_PASS` and continue.

- [ ] **Step 7: Verify dual-resolution layout**

Run the same exact HEAD at 1366×768 and 1920×1080. Confirm no clipped text, unsafe click target, hidden mechanical state, excessive empty area, or underlying input leakage.

- [ ] **Step 8: Commit only product/test/script corrections**

```powershell
git add godot/scripts/scenes/SCN_G01_00.gd godot/data/scenes/scn_g01_00.json godot/tests/test_hint_service.gd godot/tests/test_scene_contract.gd godot/tests/runtime_smoke.gd .superpowers/sdd/2026-08-22-godot-windows-scn-g01-00-implementation/tools/actual-binary-smoke.ps1
git commit -m "fix(godot): seal honest HOPA player route"
```

Keep the duration report in the ignored SDD workspace unless the project’s evidence policy explicitly promotes it in Task 7.

---

### Task 7: Independent Review, Final Evidence, and Draft PR Synchronization

**Files:**
- Create: `docs/acceptance/SCN-G01-00/HOPA-QUALITY-SELF-REVIEW.md`
- Create: `docs/acceptance/SCN-G01-00/evidence-manifest.json`
- Create: `docs/acceptance/SCN-G01-00/SHA256SUMS.txt`
- Modify: Draft PR #23 branch files only after all local gates pass.

**Interfaces:**
- Consumes: exact independently reviewed product HEAD and Task 6 `DURATION_PASS` result.
- Produces: Windows ZIP, SHA-256, full continuous playthrough, three requested clips, dual-resolution screenshots, HOPA self-review, evidence manifest, fixed READY signal, and PMO verdict.

- [ ] **Step 1: Run a fresh independent code/spec review**

Reviewer checks every spec section, all commits since `c3eef9d`, strict save validation, input ownership, no Web runtime, no new clue/deduction/scene, no copied commercial elements, and no implementation logic accumulated in `SCN_G01_00.gd`. Critical or important findings return to the owning task.

- [ ] **Step 2: Run a fresh independent player-experience review**

Reviewer watches the complete honest route and checks natural HOS/HOPA loop, meaningful clue acquisition, distinct operation signatures, fair inference, recoverable failure, mature feedback, tiered hints, narrative continuity, and `15:00–25:00` pacing.

- [ ] **Step 3: Rebuild final Windows artifacts from the reviewed HEAD**

Run official Godot import, tests, runtime smoke, Windows export. Package EXE/PCK and required notices into `starwreck-godot-scn-g01-00-windows-x86_64.zip`; calculate SHA-256 for every artifact and the ZIP.

- [ ] **Step 4: Produce final media**

Record one clean-save continuous full playthrough plus separate exploration/forensics, clue-board reasoning, and physical power-panel clips. Capture representative 1920×1080 and 1366×768 frames for opening, each forensic family, synthesis, signal measurement, physical repair, restored world, and sealed dual-signal ending.

- [ ] **Step 5: Write the self-review and machine-readable manifest**

Document current experience problems and fixes by commit, key route, every failure/recovery, hint levels, both resolution checks, known limitations, originality statement, exact HEAD, engine, commands, workflow IDs, durations, sizes, hashes, and artifact paths/URLs.

- [ ] **Step 6: Verify artifact identity**

Download the uploaded Windows ZIP and evidence artifact into a fresh directory, recompute SHA-256, compare every manifest entry, inspect video metadata, and sample all screenshots/clips. Any mismatch invalidates READY.

- [ ] **Step 7: Synchronize the current Draft PR branch**

Update the existing PR branch without rewriting unrelated user work. Confirm remote PR HEAD equals the reviewed local HEAD, PR remains Draft and unmerged, and remote workflows succeed on that exact HEAD.

- [ ] **Step 8: Submit the fixed READY signal and perform PMO review**

Post `READY FOR GODOT SCN-G01-00 TECHNICAL REVIEW` with exact HEAD, tests, workflows, ZIP/hash, all media, manifest, self-review, and known limitations. Do not change PR draft state. Execute the formal second-round checklist and report `PMO PASS` or `PMO FAIL` with itemized evidence.

- [ ] **Step 9: Stop at the project-owner gate**

Even on `PMO PASS`, state exactly: `等待项目负责人 Windows 实际试玩终验`. Do not merge, close Issue #22, or begin SCN-G01-01.
