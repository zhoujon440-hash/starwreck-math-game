# SCN-G01-00 World-Integrated Math Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add one original, world-integrated mathematical diagnostic to `SCN-G01-00`, preserve exactly 7 clues and 4 deductions, eliminate the two outstanding review defects, and produce an honest 15–25 minute Windows evidence package without padding.

**Architecture:** Keep curriculum tracking and save validation in small reusable services, but implement the player-facing 12-tick signal-window mechanism as a scene-specific controller and close-up. Integrate it into the existing physical power-panel sequence after B isolation and before fuse installation; the scene orchestrator only opens, closes, saves, and reacts to signals.

**Tech Stack:** Godot 4.7.2-stable Standard, GDScript 2.0, Godot JSON data, headless GDScript tests, Windows x86_64 export, PowerShell evidence automation, FFmpeg capture.

**Spec:** `docs/superpowers/specs/2026-08-27-world-integrated-math-progression-design.md`

## Global Constraints

- Current implementation is `SCN-G01-00` only; do not add `SCN-G01-01` or G02—G13 gameplay.
- Keep exactly `CLUE-001—007` and `DED-001—004`; the math diagnostic adds no clue or deduction.
- Godot version is exactly `4.7.2-stable`; target is Windows x86_64 only.
- Do not add Web export, WebView, HTML, DOM, TypeScript runtime, networking, CDN, combat, free movement, or real-time 3D.
- Do not copy G5 or any third-party assets, UI, story, puzzle layout, brand element, or recognizable trade dress.
- Use mature original HOS/HOPA presentation: world objects, local feedback, no quiz sheet, ABCD, generic submit button, classroom copy, grade labels, red crosses, or score stars.
- Critical item misuse never consumes the item; failure returns to a safe local state and preserves correct evidence, deduction, inventory, and device progress.
- Support tiers are `guided`, `standard`, and `expert`; they change information visibility, values shown, hints, and tolerance, not the physical solution or story facts.
- A normal evidence route reads at no slower than 5.5 Chinese characters per second and may contain at most one reasonable relation error, one reasonable mechanism error, and one safety rejection.
- No fixed waiting, looping cursor, screen scan, systematic wrong-edge traversal, or deliberate error enumeration may be used to meet 15 minutes.
- Draft PR #23 must remain Draft and unmerged; do not close Issue #22 or mark the PR Ready.

## File Structure

- `godot/data/scenes/scn_g01_00_math.json`: fixed 12-tick puzzle data, support-tier presentation, units, copy, hints, and uniqueness checksum inputs.
- `godot/scripts/math/MathProgressService.gd`: support tier and local process records only; no grade label, score, or question generation.
- `godot/scripts/puzzle/SignalWindowPuzzle.gd`: pure scene-specific state machine and derived target calculation.
- `godot/scripts/puzzle/SignalWindowConsole.gd`: close-up input, animation, device feedback, and signals; no story orchestration.
- `godot/scenes/g01/SignalWindowConsole.tscn`: world-native ring, probe clamps, three sampling shutters, sweep lamps, readout, return affordance.
- `godot/scripts/core/GameState.gd`: default, snapshot, restore, and strict nested validation for `math_state`.
- `godot/scripts/core/SaveService.gd`: save/inspect normalized state, retaining the existing structural-corruption fix.
- `godot/scripts/interaction/EvidenceInspectionMechanics.gd`: cabinet tool acquisition requirements only.
- `godot/scripts/inventory/InventoryService.gd`: acquire and select wrench/gloves without introducing generic installation behavior.
- `godot/scripts/puzzle/PowerPanelPuzzle.gd`: retain original relative power sequence; reject fuse installation until signal-window diagnostic is complete.
- `godot/scripts/scenes/SCN_G01_00.gd`: connect cabinet tools, console, objective, save, and ending signals.
- `godot/scripts/core/HintService.gd`: diagnostic-specific three-level hints that never reveal the final window triplet.
- `godot/tests/test_math_progress.gd`: tier and process-record tests.
- `godot/tests/test_signal_window_puzzle.gd`: config, solution, gate, failure recovery, and save-state tests.
- `godot/tests/test_game_state.gd`: `math_state` round-trip tests.
- `godot/tests/test_save_service.gd`: nested malformed `math_state` rejection tests.
- `godot/tests/test_power_panel.gd`: diagnostic gate and preserved original sequence tests.
- `godot/tests/test_scene_contract.gd`: exact 7/4 count, math data, no next-scene and no-Web contract.
- `godot/tests/runtime_smoke.gd`: real node-path, tool, console, repair, ending, and resolution assertions.
- `.superpowers/sdd/2026-08-22-godot-windows-scn-g01-00-implementation/tools/actual-binary-smoke.ps1`: honest Windows route and evidence capture.
- `HOPA-QUALITY-SELF-REVIEW.md`: revised product review and known limitations.

---

### Task 1: Land the structural-save and cabinet-HUD review fixes

**Files:**
- Modify: `godot/scripts/core/GameState.gd`
- Modify: `godot/scripts/core/SaveService.gd`
- Modify: `godot/scripts/scenes/SCN_G01_00.gd`
- Modify: `godot/tests/test_save_service.gd`
- Modify: `godot/tests/runtime_smoke.gd`

**Interfaces:**
- Consumes: existing `GameState.snapshot() -> Dictionary`, `GameState.restore(data: Dictionary) -> bool`, `SaveService.inspect_state() -> Dictionary`.
- Produces: strict structural validation for current nested state and complete cabinet HUD suppression/restoration.

- [ ] **Step 1: Review the already-recorded RED cases**

Confirm `test_save_service.gd` includes valid-JSON snapshots with `fuse_latches: []` and `inspection_observations: "not-a-dictionary"`, and `runtime_smoke.gd` asserts that Objective, Status, Hint, Board, Toast, and inventory do not remain over the cabinet close-up.

- [ ] **Step 2: Import and run the full GREEN verification**

Run:

```powershell
godot --headless --path godot --import
godot --headless --path godot --script res://tests/runtime_smoke.gd
godot --headless --path godot --script res://tests/run_tests.gd
```

Expected: import exit 0, `RUNTIME SMOKE PASSED`, `TESTS PASSED`, all exit 0.

- [ ] **Step 3: Inspect generated-file hygiene**

Run:

```powershell
git status --short
```

Expected: only the five tracked files listed in this task are modified after deleting generated `.godot`, `.import`, `.uid`, and one-off diagnostic files with the repository's existing cleanup procedure.

- [ ] **Step 4: Commit the verified fix**

```powershell
git add godot/scripts/core/GameState.gd godot/scripts/core/SaveService.gd godot/scripts/scenes/SCN_G01_00.gd godot/tests/test_save_service.gd godot/tests/runtime_smoke.gd
git commit -m "fix(godot): harden save shape and cabinet close-up"
```

---

### Task 2: Add math task data, support tiers, and save contract

**Files:**
- Create: `godot/data/scenes/scn_g01_00_math.json`
- Create: `godot/scripts/math/MathProgressService.gd`
- Create: `godot/tests/test_math_progress.gd`
- Modify: `godot/scripts/core/GameState.gd`
- Modify: `godot/tests/test_game_state.gd`
- Modify: `godot/tests/test_save_service.gd`
- Modify: `godot/tests/run_tests.gd`

**Interfaces:**
- Consumes: `GameState.math_state: Dictionary` added by this task.
- Produces: `MathProgressService.set_support_tier(tier: String) -> bool`, `record_attempt(code: String) -> void`, `use_hint(stage: int) -> bool`, and `complete_task(task_id: String) -> bool`.

- [ ] **Step 1: Write failing support-tier and process-record tests**

Add `test_math_progress.gd` with these behaviors:

```gdscript
extends RefCounted

func run(t) -> void:
    var state = GameState.new()
    var service = MathProgressService.new(state)
    t.truthy(service.set_support_tier("guided"), "guided is supported")
    t.equal(state.math_state["support_tier"], "guided")
    t.truthy(not service.set_support_tier("grade-3"), "grade labels are not runtime tiers")
    service.record_attempt("WINDOW_NOT_EQUAL")
    service.record_attempt("WINDOW_NOT_EQUAL")
    t.equal(state.math_state["attempt_codes"], ["WINDOW_NOT_EQUAL"], "attempt categories are deduplicated")
    t.truthy(service.use_hint(2), "hint stage can increase")
    t.truthy(not service.use_hint(1), "hint stage cannot move backward")
    t.truthy(service.complete_task("SCN-G01-00-MATH-01"), "current task can complete")
    t.truthy(not service.complete_task("G02-M01"), "future chapter tasks are out of scope")
```

Register the test in `run_tests.gd`.

- [ ] **Step 2: Write failing save-shape tests**

Extend `test_game_state.gd` to set and round-trip:

```gdscript
state.math_state = {
    "support_tier": "standard",
    "task_id": "SCN-G01-00-MATH-01",
    "probe_prepared": true,
    "observed_cycles": 2,
    "sample_windows": [1, 5, 0],
    "window_locked": false,
    "completed": false,
    "signal_split": false,
    "attempt_codes": ["BLOCKADE_COLLISION"],
    "hint_stage": 1
}
```

Extend `test_save_service.gd` with valid JSON where `sample_windows` has length 2, `observed_cycles` is a string, or `support_tier` is `"grade-3"`; each must return `unsupported_state`.

- [ ] **Step 3: Run RED tests**

```powershell
godot --headless --path godot --script res://tests/run_tests.gd
```

Expected: FAIL because `MathProgressService`, `math_state`, and the new data contract do not exist.

- [ ] **Step 4: Add fixed task data**

Create `scn_g01_00_math.json` with this exact mathematical model:

```json
{
  "task_id": "SCN-G01-00-MATH-01",
  "cycle_size": 12,
  "maintenance_pulses": [2, 6, 10],
  "weak_echo_offset": -1,
  "blockade_slots": [0, 3, 7, 8],
  "required_observation_cycles": 3,
  "window_count": 3,
  "window_spacing": 4,
  "support_tiers": ["guided", "standard", "expert"],
  "units": "phase ticks",
  "ending_sender": "UNKNOWN"
}
```

The derived target is `[1, 5, 9]`; code must derive it from maintenance pulses and offset rather than store it as an answer field.

- [ ] **Step 5: Implement the minimal progress service and state contract**

Create `MathProgressService.gd`:

```gdscript
class_name MathProgressService
extends RefCounted

const TIERS := ["guided", "standard", "expert"]
const CURRENT_TASK := "SCN-G01-00-MATH-01"
var state: RefCounted

func _init(game_state: RefCounted) -> void:
    state = game_state

func set_support_tier(tier: String) -> bool:
    if tier not in TIERS:
        return false
    state.math_state["support_tier"] = tier
    return true

func record_attempt(code: String) -> void:
    if not code.is_empty() and code not in state.math_state["attempt_codes"]:
        state.math_state["attempt_codes"].append(code)

func use_hint(stage: int) -> bool:
    if stage < 1 or stage > 3 or stage <= int(state.math_state["hint_stage"]):
        return false
    state.math_state["hint_stage"] = stage
    return true

func complete_task(task_id: String) -> bool:
    if task_id != CURRENT_TASK:
        return false
    state.math_state["completed"] = true
    return true
```

Add `_default_math_state()`, snapshot, restore, and strict `_valid_math_state()` handling to `GameState.gd`. Enforce exact key types, a three-integer `sample_windows` array whose values are 0–11, `observed_cycles` in 0–3, tier membership, and string-array attempt codes.

- [ ] **Step 6: Run GREEN tests**

```powershell
godot --headless --path godot --script res://tests/run_tests.gd
```

Expected: `TESTS PASSED`.

- [ ] **Step 7: Commit**

```powershell
git add godot/data/scenes/scn_g01_00_math.json godot/scripts/math/MathProgressService.gd godot/scripts/core/GameState.gd godot/tests/test_math_progress.gd godot/tests/test_game_state.gd godot/tests/test_save_service.gd godot/tests/run_tests.gd
git commit -m "feat(godot): add world-math state contract"
```

---

### Task 3: Implement the pure 12-tick signal-window state machine

**Files:**
- Create: `godot/scripts/puzzle/SignalWindowPuzzle.gd`
- Create: `godot/tests/test_signal_window_puzzle.gd`
- Modify: `godot/tests/run_tests.gd`

**Interfaces:**
- Consumes: `GameState.math_state`, fixed JSON keys from Task 2.
- Produces: `prepare_probe(wrench_ready: bool, gloves_ready: bool) -> Dictionary`, `observe_cycle() -> Dictionary`, `set_window(index: int, tick: int) -> Dictionary`, `expected_windows() -> Array[int]`, `lock_windows(b_isolated: bool) -> Dictionary`, and `split_signal(power_restored: bool) -> Dictionary`.

- [ ] **Step 1: Write failing state-machine tests**

Create tests that prove:

```gdscript
var state = GameState.new()
var config = {
    "task_id": "SCN-G01-00-MATH-01", "cycle_size": 12,
    "maintenance_pulses": [2, 6, 10], "weak_echo_offset": -1,
    "blockade_slots": [0, 3, 7, 8], "required_observation_cycles": 3,
    "window_count": 3, "window_spacing": 4
}
var puzzle = SignalWindowPuzzle.new(state, config)
t.equal(puzzle.expected_windows(), [1, 5, 9])
t.truthy(not puzzle.prepare_probe(true, false).ok, "gloves are mandatory")
t.truthy(puzzle.prepare_probe(true, true).ok, "both physical tools prepare the probe")
t.truthy(not puzzle.lock_windows(true).ok, "three observed cycles are mandatory")
puzzle.observe_cycle(); puzzle.observe_cycle(); puzzle.observe_cycle()
puzzle.set_window(0, 1); puzzle.set_window(1, 5); puzzle.set_window(2, 9)
t.truthy(not puzzle.lock_windows(false).ok, "B isolation remains mandatory")
t.truthy(puzzle.lock_windows(true).ok, "derived windows lock after safe isolation")
t.truthy(not puzzle.split_signal(false).ok, "a locked phase cannot reveal the ending before power restoration")
t.truthy(puzzle.split_signal(true).ok, "restored power and locked phase separate the signal")
```

Add separate assertions for unequal spacing, collision with slots `0/3/7/8`, wrong phase, out-of-range tick, wrong index, and repeated actions. Failures must leave the last correct window positions and other scene progress intact.

- [ ] **Step 2: Run RED tests**

```powershell
godot --headless --path godot --script res://tests/run_tests.gd
```

Expected: FAIL because `SignalWindowPuzzle` is undefined.

- [ ] **Step 3: Implement the pure state machine**

Use this result shape consistently:

```gdscript
func _result(ok: bool, feedback: String, completed := false) -> Dictionary:
    return {"ok": ok, "feedback": feedback, "completed": completed}
```

Derive each expected window as:

```gdscript
posmod(int(pulse) + int(config["weak_echo_offset"]), int(config["cycle_size"]))
```

`lock_windows()` checks in order: probe prepared, observed cycles reached, B isolated, three unique positions, circular spacing 4, no blockade collision, exact derived phase. Use attempt codes `PROBE_UNSAFE`, `OBSERVATION_INCOMPLETE`, `B_NOT_ISOLATED`, `WINDOW_NOT_EQUAL`, `BLOCKADE_COLLISION`, and `PHASE_MISMATCH`.

`split_signal(power_restored)` must reject with `POWER_NOT_RESTORED` until both the window is locked and the caller confirms restored power; this keeps the ending signal unavailable before the physical repair.

- [ ] **Step 4: Run focused and full GREEN tests**

```powershell
godot --headless --path godot --script res://tests/run_tests.gd
```

Expected: all signal-window assertions pass and `TESTS PASSED`.

- [ ] **Step 5: Commit**

```powershell
git add godot/scripts/puzzle/SignalWindowPuzzle.gd godot/tests/test_signal_window_puzzle.gd godot/tests/run_tests.gd
git commit -m "feat(godot): add twelve-tick signal diagnostic"
```

---

### Task 4: Make wrench and gloves necessary world tools

**Files:**
- Modify: `godot/scripts/interaction/EvidenceInspectionMechanics.gd`
- Modify: `godot/scripts/scenes/SCN_G01_00.gd`
- Modify: `godot/tests/test_evidence_inspection.gd`
- Modify: `godot/tests/runtime_smoke.gd`

**Interfaces:**
- Consumes: `InventoryService.acquire(item_id: String) -> bool`, tool IDs `ITM-G01-003` and `ITM-G01-004`.
- Produces: cabinet actions that acquire the two tools once, visually clear their original positions, expose existing clues and fuse latches, and preserve them through save/restore.

- [ ] **Step 1: Write failing tool-chain tests**

Assert that moving the wrench acquires `ITM-G01-003`, moving the gloves acquires `ITM-G01-004`, duplicate clicks do not duplicate inventory, fuse latches remain hidden until both obstructions are cleared, and the probe cannot be prepared unless both IDs are present.

- [ ] **Step 2: Run RED tests**

```powershell
godot --headless --path godot --script res://tests/run_tests.gd
```

Expected: FAIL because current obstruction movement does not acquire the tools.

- [ ] **Step 3: Implement minimal acquisition and visuals**

In `_on_cabinet_obstruction_input`, map `wrench -> ITM-G01-003` and `glove -> ITM-G01-004`, call `inventory_service.acquire()`, refresh the tool rail, and keep the existing clue-exposure state. Do not consume these tools when preparing the diagnostic.

- [ ] **Step 4: Add runtime assertions**

In `runtime_smoke.gd`, click the actual cabinet nodes, assert inventory IDs appear, assert cabinet HUD remains suppressed, close and reopen the cabinet, and assert tool/clue/fuse-latch state remains consistent.

- [ ] **Step 5: Run GREEN tests and runtime smoke**

```powershell
godot --headless --path godot --script res://tests/run_tests.gd
godot --headless --path godot --script res://tests/runtime_smoke.gd
```

Expected: `TESTS PASSED` and `RUNTIME SMOKE PASSED`.

- [ ] **Step 6: Commit**

```powershell
git add godot/scripts/interaction/EvidenceInspectionMechanics.gd godot/scripts/scenes/SCN_G01_00.gd godot/tests/test_evidence_inspection.gd godot/tests/runtime_smoke.gd
git commit -m "feat(godot): make cabinet tools part of repair chain"
```

---

### Task 5: Build and integrate the world-native signal-window console

**Files:**
- Create: `godot/scripts/puzzle/SignalWindowConsole.gd`
- Create: `godot/scenes/g01/SignalWindowConsole.tscn`
- Modify: `godot/scenes/g01/PowerPanelCloseup.tscn`
- Modify: `godot/scripts/puzzle/PowerPanelPuzzle.gd`
- Modify: `godot/scripts/scenes/SCN_G01_00.gd`
- Modify: `godot/scripts/core/HintService.gd`
- Modify: `godot/data/scenes/scn_g01_00.json`
- Modify: `godot/tests/test_power_panel.gd`
- Modify: `godot/tests/test_hint_service.gd`
- Modify: `godot/tests/test_scene_contract.gd`
- Modify: `godot/tests/runtime_smoke.gd`

**Interfaces:**
- Consumes: `SignalWindowPuzzle` methods from Task 3, tool IDs from Task 4, `MathProgressService` from Task 2.
- Produces signals `state_changed`, `diagnostic_completed`, and `device_feedback(code: String)`; method `setup(game_state: RefCounted, inventory_service: RefCounted, config: Dictionary) -> void`.

- [ ] **Step 1: Write failing power-gate and scene-contract tests**

Extend `test_power_panel.gd` so fuse installation is rejected with `DIAGNOSTIC_REQUIRED` after B isolation while `state.math_state.completed == false`, then succeeds after it is true. Assert the original order remains B isolation before fuse, fuse before coupler, coupler before protector.

Extend `test_scene_contract.gd` to assert:

```gdscript
t.equal(data["clues"].size(), 7)
t.equal(data["deductions"].size(), 4)
t.equal(math_data["task_id"], "SCN-G01-00-MATH-01")
t.equal(math_data["ending_sender"], "UNKNOWN")
var presets = FileAccess.get_file_as_string("res://export_presets.cfg")
t.truthy(not presets.contains("platform=\"Web\""), "no Web export preset is added")
```

- [ ] **Step 2: Run RED tests**

```powershell
godot --headless --path godot --script res://tests/run_tests.gd
```

Expected: FAIL because the diagnostic gate and console do not exist.

- [ ] **Step 3: Create the close-up scene**

Build `SignalWindowConsole.tscn` from Godot primitives and the existing project palette. It must contain named nodes `ProbeWrench`, `ProbeGloves`, `CycleDrum`, `SweepLamp`, `Window0`, `Window1`, `Window2`, `LockLever`, `Readout`, `HintGlow`, and `ReturnButton`. Sampling windows move around a 12-stop ring with mechanical snap; the player never types a number or presses a generic submit button.

- [ ] **Step 4: Implement console input and world feedback**

`SignalWindowConsole.gd` must:

- require both tools before probe setup;
- play three observable cycles before enabling final lock;
- move each shutter one physical stop per click/drag and save immediately;
- animate blockade collisions with red sweep, spring return, local shake, and a short procedural tone;
- animate success with a complete ring sweep and green/amber local lamps;
- use guided/standard/expert presentation differences without changing target `[1,5,9]`;
- hide objective, status, hint, deduction board, toast, and inventory layers while the console owns the close-up, then restore them on exit.

- [ ] **Step 5: Integrate the diagnostic into the existing panel sequence**

Connect the console under `PowerPanelCloseup.tscn`. After `DED-004`, the player may open the panel, isolate B, prepare/solve the diagnostic, install the fuse, align A↔C, and close the protector. `PowerPanelPuzzle.install_fuse()` checks `state.math_state.completed` but keeps every original safety condition.

- [ ] **Step 6: Add diagnostic hints and story copy**

Add three hint levels to `HintService.gd` and `scn_g01_00.json`:

1. re-observe the paper-tape rhythm and occupied sweep positions;
2. compare whether the three shutters are equally spaced;
3. point out that the weak return precedes each maintenance pulse by one tick, without naming `1,5,9`.

Keep the ending order: automated maintenance broadcast first, then `文明修复者，请不要来。`, sender `UNKNOWN`; never name 零零 or enter the city loop.

- [ ] **Step 7: Add complete runtime smoke coverage**

Drive actual scene nodes through: cabinet tools, seven clues, four deductions, B isolation, three observed cycles, shutters `1/5/9`, lock, fuse, coupler, protector, power restoration, automated broadcast, weak UNKNOWN signal. Assert all close-up HUD layers, saved state, ending order, and both resolutions.

- [ ] **Step 8: Run import, full tests, and smoke**

```powershell
godot --headless --path godot --import
godot --headless --path godot --script res://tests/run_tests.gd
godot --headless --path godot --script res://tests/runtime_smoke.gd
```

Expected: all exit 0 with `TESTS PASSED` and `RUNTIME SMOKE PASSED`.

- [ ] **Step 9: Commit**

```powershell
git add godot/scripts/puzzle/SignalWindowConsole.gd godot/scenes/g01/SignalWindowConsole.tscn godot/scenes/g01/PowerPanelCloseup.tscn godot/scripts/puzzle/PowerPanelPuzzle.gd godot/scripts/scenes/SCN_G01_00.gd godot/scripts/core/HintService.gd godot/data/scenes/scn_g01_00.json godot/tests/test_power_panel.gd godot/tests/test_hint_service.gd godot/tests/test_scene_contract.gd godot/tests/runtime_smoke.gd
git commit -m "feat(godot): integrate world-native signal window puzzle"
```

---

### Task 6: Prove honest duration and regenerate the complete Windows evidence package

**Files:**
- Modify: `.superpowers/sdd/2026-08-22-godot-windows-scn-g01-00-implementation/tools/actual-binary-smoke.ps1`
- Modify: `.superpowers/sdd/2026-08-22-godot-windows-scn-g01-00-implementation/task-11-report.md`
- Modify: `HOPA-QUALITY-SELF-REVIEW.md`
- Regenerate: `.superpowers/sdd/2026-08-22-godot-windows-scn-g01-00-implementation/outputs/**`
- Regenerate: `release/starwreck-godot-scn-g01-00-windows-<8-char-head>.zip`
- Regenerate: `release/starwreck-godot-scn-g01-00-windows-<8-char-head>.zip.sha256`

**Interfaces:**
- Consumes: completed Windows EXE, honest route, manifest schema, FFmpeg tooling.
- Produces: one 15–25 minute source video, three true source excerpts, dual-resolution screenshots, manifest, HOPA review, Windows ZIP, and SHA-256 all tied to the same HEAD.

- [ ] **Step 1: Remove all known padding mechanisms from the evidence route**

Set text movement/read rate to at least `5.5` characters per second. Remove every loop that walks all wrong hypotheses, all wrong deduction relations, or repeated invalid coupler positions. Keep only one plausible `contradicts -> supersedes` relation correction, one plausible mechanism misunderstanding, and one protector safety rejection.

- [ ] **Step 2: Export a fresh candidate**

```powershell
godot --headless --path godot --import
godot --headless --path godot --script res://tests/run_tests.gd
godot --headless --path godot --script res://tests/runtime_smoke.gd
godot --headless --path godot --export-release "Windows Desktop" release/starwreck-godot-scn-g01-00.exe
```

Expected: Godot 4.7.2, import/test/smoke/export all exit 0.

- [ ] **Step 3: Record the first honest baseline before generating final artifacts**

Run the updated Windows route at 1366×768 from a deleted save. Record timestamps for flashlight acquisition, seventh clue, fourth deduction, diagnostic completion, power restoration, automated broadcast, weak UNKNOWN signal, and slice completion.

Expected: 15:00–25:00. If below 15:00, stop this task and return to Task 4 or 5 to add meaningful tool, observation, calibration, feedback, or story operations. Do not change read speed, add waits, or add wrong actions.

- [ ] **Step 4: Record final evidence from one clean-save source run**

Capture the complete visible Windows route without edits. Derive the exploration/forensics, deduction-board, and physical repair clips as true timestamp excerpts from that source; each clip must include the new diagnostic where relevant and must pixel-match the source at sampled timestamps.

- [ ] **Step 5: Capture both resolution sets**

At 1366×768 and 1920×1080 capture: blackout, flashlight investigation, cabinet tools, accepted/rejected evidence relation, `DED-004`, signal-window setup, signal-window rejection, signal-window success, pre-repair panel, physical safety rejection, restored cockpit, automated broadcast, and weak UNKNOWN signal.

- [ ] **Step 6: Regenerate manifest, HOPA review, ZIP, and hashes**

Manifest entries include relative path, purpose, resolution, duration where applicable, byte size, SHA-256, source-video time range for each excerpt, Godot version, exact commit, and audio-track disclosure. ZIP naming uses the first eight HEAD characters. Compute and record ZIP, EXE, and PCK SHA-256 values.

- [ ] **Step 7: Run the evidence validator**

Verify every manifest path exists, size and SHA match, video durations and dimensions match, clips are source excerpts, ZIP README matches the same HEAD, and no `.godot`, `.import`, `.uid`, prior evidence ZIP, Web preset, debug file, or private source document is included.

- [ ] **Step 8: Commit tracked evidence documentation only**

```powershell
git add HOPA-QUALITY-SELF-REVIEW.md
git commit -m "docs: record honest SCN-G01-00 math evidence"
```

Do not commit generated videos, screenshots, caches, EXE, PCK, ZIP, or `.superpowers` working outputs unless the repository already tracks the exact destination file.

---

### Task 7: Independent review, remote sync, CI, and READY gate

**Files:**
- Review: all commits after remote PR #23 HEAD `3ac6d19ec82a2ec23a53847a089032031d932973`
- Review: final evidence outputs and ZIP
- Remote: branch `codex/godot-scn-g01-00-impl-v1`, Draft PR #23, Issue #22

**Interfaces:**
- Consumes: local reviewed candidate, same-HEAD evidence package.
- Produces: reviewer approval, remote CI artifact, accessible evidence artifact, and the fixed READY signal only if every gate passes.

- [ ] **Step 1: Request independent spec-compliance review**

Reviewer checks: exact 7/4, novel Chapter 12→13 bridge, no 零零 reveal, no next scene, no Web, no G5 copying, unique world-integrated math, `[1,5,9]` derived rather than exposed, all failure recovery, save safety, honest duration, and evidence integrity.

- [ ] **Step 2: Request independent code-quality review**

Reviewer checks: math logic isolated from UI/orchestration, strict save shape, no generic quiz generator, no huge addition to `SCN_G01_00.gd`, no softlock, full tests, generated-file hygiene, and no unrelated user changes.

- [ ] **Step 3: Fix every Critical or Important finding and repeat both reviews**

Do not classify the candidate as complete while any Critical or Important finding remains.

- [ ] **Step 4: Sync only reviewed tracked files to the remote PR branch**

Because the local repository is a snapshot-root history, the root PM agent must create the remote commit with GitHub Git Data operations using remote parent `3ac6d19ec82a2ec23a53847a089032031d932973`; do not force-push or rewrite unrelated history. Keep PR #23 Draft and unmerged.

- [ ] **Step 5: Verify remote CI and artifacts**

Confirm remote PR HEAD equals the READY candidate, Godot Windows SCN00 Gate passes on Godot 4.7.2, the 8-character ZIP artifact and SHA match local values, and the complete video/screenshots/manifest/HOPA evidence is accessible.

- [ ] **Step 6: Post READY only after every gate passes**

Post `READY FOR GODOT SCN-G01-00 TECHNICAL REVIEW` to Issue #22 with branch, exact HEAD, test results, Windows artifact, ZIP SHA-256, full video, three excerpts, dual-resolution screenshots, evidence manifest, known limitations, and declarations of no Web export and no `SCN-G01-01` gameplay.

- [ ] **Step 7: Perform PMO second-round acceptance**

Report `PMO PASS` or `PMO FAIL` with itemized evidence. Even on PASS, final status must state: `等待项目负责人 Windows 实际试玩终验`. Do not Ready, merge, close, or advance the scene.
