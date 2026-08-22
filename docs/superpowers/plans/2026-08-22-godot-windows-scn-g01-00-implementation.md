# Godot Windows SCN-G01-00 Vertical Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Windows-native Godot 4.7.2 vertical slice for `SCN-G01-00` where the player explores, gathers evidence, performs deduction on a clue board, and physically repairs the power panel before the ship world state changes.

**Architecture:** The existing Web runtime is frozen as a reference prototype. A new isolated `godot/` subtree uses GDScript, local JSON data, inherited art with provenance, and small services (`GameState`, `SaveService`, `ClueService`, `DeductionGraph`, `InventoryService`) coordinated by `SceneDirector`; the power puzzle is a state machine rendered as physical scene controls, not a generic UI panel.

**Tech Stack:** Godot 4.7.2-stable Standard, GDScript 2.0, JSON, Godot headless test scripts, Windows x86_64 export templates, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-22-godot-windows-scn-g01-00-design.md`

## Global Constraints

- Formal target is Windows 10/11 x86_64 EXE only; do not create Web export.
- Use Godot `4.7.2-stable`; do not use 4.8-dev builds.
- `SCN-G01-00` only. Stop before `SCN-G01-01` gameplay.
- Preserve protagonist `星宇`, G01 prologue semantics, `ITM-G01-001 应急手灯`, `ITM-G01-002 临时保险丝`, and critical-item non-consumption on wrong use.
- Runtime must have no HTTP/CDN/network dependency.
- No HTML, DOM, WebView, browser shell, or embedded old Web runtime in the Godot game.
- No combat, health, enemy AI, or real-time 3D free movement.
- Main player loop must require clue reasoning before the final power-panel repair.
- Product acceptance is not granted by tests alone; final owner hands-on play is mandatory.

---

## File Structure

```text
godot/
  AGENTS.md
  project.godot
  export_presets.cfg
  assets/inherited/
  data/
    asset_provenance.json
    source_mapping.json
    scenes/scn_g01_00.json
  scenes/
    main/Main.tscn
    title/TitleScreen.tscn
    g01/SCN_G01_00.tscn
    g01/PowerPanelCloseup.tscn
    ui/DeductionBoard.tscn
    ui/InventoryHud.tscn
  scripts/
    core/GameState.gd
    core/SaveService.gd
    core/SceneDirector.gd
    clue/ClueService.gd
    clue/DeductionGraph.gd
    clue/DeductionBoard.gd
    inventory/InventoryService.gd
    interaction/FlashlightController.gd
    interaction/Inspectable.gd
    puzzle/PowerPanelPuzzle.gd
    scenes/SCN_G01_00.gd
    ui/TitleScreen.gd
  tests/
    TestAssert.gd
    run_tests.gd
    test_game_state.gd
    test_save_service.gd
    test_deduction_graph.gd
    test_inventory_service.gd
    test_power_panel.gd
    test_scene_contract.gd
scripts/
  verify_godot_asset_provenance.mjs
.github/workflows/
  godot-windows-scn00.yml
```

## Task 1: Establish the isolated Godot runtime boundary and executable smoke test

**Files:**
- Create: `godot/AGENTS.md`
- Create: `godot/project.godot`
- Create: `godot/export_presets.cfg`
- Create: `godot/scenes/main/Main.tscn`
- Create: `godot/scenes/title/TitleScreen.tscn`
- Create: `godot/scripts/ui/TitleScreen.gd`
- Create: `godot/tests/TestAssert.gd`
- Create: `godot/tests/run_tests.gd`
- Create: `godot/tests/test_scene_contract.gd`

**Interfaces:**
- Produces: a project that opens under Godot 4.7.2 and can run `--headless` tests.
- Produces: title action signal `new_game_requested` used by later scene integration.

- [ ] **Step 1: Create `godot/AGENTS.md` with the local runtime override**

```markdown
# Godot subtree rules

This subtree is the formal Windows-native runtime experiment authorized by the project owner.
Root Web/Vite runtime rules do not prohibit Godot work inside `godot/`.

- Engine: Godot 4.7.2-stable Standard, GDScript only.
- Target: Windows x86_64 only. No Web export.
- Scope: SCN-G01-00 only; stop before SCN-G01-01 gameplay.
- Reuse approved art/story/data; register provenance for every copied binary.
- No HTML/DOM/WebView/embedded browser runtime.
- Critical items are never consumed by wrong use.
- Exploration -> clues -> deduction -> item use -> physical puzzle -> world change is mandatory.
```

- [ ] **Step 2: Write the first failing scene-contract test**

`godot/tests/test_scene_contract.gd`:

```gdscript
extends RefCounted

func run(t):
    t.equal(ProjectSettings.get_setting("application/config/name"), "星骸拾荒者：十二星门")
    t.equal(ProjectSettings.get_setting("display/window/size/viewport_width"), 1920)
    t.equal(ProjectSettings.get_setting("display/window/size/viewport_height"), 1080)
```

`godot/tests/TestAssert.gd`:

```gdscript
extends RefCounted
var failures: Array[String] = []
func equal(actual, expected, message := ""):
    if actual != expected:
        failures.append(message if message != "" else "expected %s, got %s" % [expected, actual])
func truthy(value, message := ""):
    if not value:
        failures.append(message if message != "" else "expected truthy")
```

`godot/tests/run_tests.gd`:

```gdscript
extends SceneTree

func _init():
    var t = preload("res://tests/TestAssert.gd").new()
    var suites = [preload("res://tests/test_scene_contract.gd").new()]
    for suite in suites:
        suite.run(t)
    for failure in t.failures:
        push_error(failure)
    quit(1 if t.failures.size() > 0 else 0)
```

- [ ] **Step 3: Run the test before project settings exist and verify failure**

Run:

```bash
godot --headless --path godot --script res://tests/run_tests.gd
```

Expected: non-zero because project name/resolution are missing or wrong.

- [ ] **Step 4: Create `project.godot` and minimal title scene**

Required settings:

```ini
[application]
config/name="星骸拾荒者：十二星门"
run/main_scene="res://scenes/main/Main.tscn"

[display]
window/size/viewport_width=1920
window/size/viewport_height=1080
window/size/window_width_override=1366
window/size/window_height_override=768
window/stretch/mode="canvas_items"

[rendering]
renderer/rendering_method="gl_compatibility"
renderer/rendering_method.mobile="gl_compatibility"
```

`TitleScreen.gd` exposes:

```gdscript
signal new_game_requested
func _on_new_game_pressed() -> void:
    new_game_requested.emit()
```

- [ ] **Step 5: Configure Windows export only**

`export_presets.cfg` must contain one enabled preset named `Windows Desktop` with `platform="Windows Desktop"`, `binary_format/architecture="x86_64"`, and no Web preset.

- [ ] **Step 6: Re-run headless test**

Expected: PASS and exit code 0.

- [ ] **Step 7: Commit**

```bash
git add godot
git commit -m "feat(godot): bootstrap Windows native runtime"
```

## Task 2: Freeze inherited content and art provenance

**Files:**
- Create: `godot/data/source_mapping.json`
- Create: `godot/data/asset_provenance.json`
- Create: `godot/data/scenes/scn_g01_00.json`
- Create: `scripts/verify_godot_asset_provenance.mjs`
- Copy: eight approved source images listed in the design spec into `godot/assets/inherited/`
- Modify: `godot/tests/test_scene_contract.gd`

**Interfaces:**
- Produces: `scn_g01_00.json` with `clues`, `deductions`, `items`, `world_states`, and `power_panel` keys.
- Produces: provenance verifier invoked by CI.

- [ ] **Step 1: Add a failing data-contract assertion**

Extend `test_scene_contract.gd`:

```gdscript
var data = JSON.parse_string(FileAccess.get_file_as_string("res://data/scenes/scn_g01_00.json"))
t.truthy(data is Dictionary, "scene data must be a dictionary")
t.equal(data.scene_id, "SCN-G01-00")
t.equal(data.clues.size(), 7)
t.equal(data.deductions.size(), 4)
t.equal(data.items[0].id, "ITM-G01-001")
t.equal(data.items[1].id, "ITM-G01-002")
```

- [ ] **Step 2: Run and verify failure because the JSON does not exist**

- [ ] **Step 3: Create `scn_g01_00.json` with exact clue IDs and deduction rules**

Required clue IDs:

```json
["CLUE-001","CLUE-002","CLUE-003","CLUE-004","CLUE-005","CLUE-006","CLUE-007"]
```

Required deduction IDs:

```json
["DED-001","DED-002","DED-003","DED-004"]
```

The final deduction requirement must encode:

```json
{
  "id": "DED-004",
  "requires_deductions": ["DED-001", "DED-002", "DED-003"],
  "requires_clues": ["CLUE-004", "CLUE-005"],
  "text": "应隔离B支路，并通过备用A↔C耦合恢复照明。"
}
```

- [ ] **Step 4: Create source mapping**

`source_mapping.json` must map this scene back to:

```json
{
  "scene": "src/content/g01.ts",
  "experience": "src/data/trial/sceneExperiences.ts",
  "item_archive": "src/data/trial/items.ts",
  "baseline_commit": "561dfc8b380b70fddf25410b51fa053c6a70a867"
}
```

- [ ] **Step 5: Copy inherited images without editing bytes and record SHA-256**

The verifier must calculate SHA-256 for both source and copied file and fail unless they match the manifest.

Core verifier behavior:

```js
const sourceHash = sha256(readFileSync(source));
const targetHash = sha256(readFileSync(target));
if (sourceHash !== entry.sha256 || targetHash !== entry.sha256) process.exitCode = 1;
```

- [ ] **Step 6: Run data and provenance checks**

```bash
node scripts/verify_godot_asset_provenance.mjs
godot --headless --path godot --script res://tests/run_tests.gd
```

Expected: both PASS.

- [ ] **Step 7: Commit**

```bash
git add godot/data godot/assets/inherited scripts/verify_godot_asset_provenance.mjs godot/tests/test_scene_contract.gd
git commit -m "feat(godot): inherit SCN-G01-00 content and art"
```

## Task 3: Implement state, inventory, and robust save persistence

**Files:**
- Create: `godot/scripts/core/GameState.gd`
- Create: `godot/scripts/core/SaveService.gd`
- Create: `godot/scripts/inventory/InventoryService.gd`
- Create: `godot/tests/test_game_state.gd`
- Create: `godot/tests/test_save_service.gd`
- Create: `godot/tests/test_inventory_service.gd`
- Modify: `godot/tests/run_tests.gd`

**Interfaces:**
- `GameState.snapshot() -> Dictionary`
- `GameState.restore(data: Dictionary) -> bool`
- `InventoryService.acquire(item_id: String) -> bool`
- `InventoryService.try_install(item_id: String, target_id: String, accepted_item_id: String) -> bool`
- `SaveService.save_state(state: GameState) -> Error`
- `SaveService.load_state() -> Dictionary`

- [ ] **Step 1: Write failing inventory tests**

```gdscript
func run(t):
    var state = preload("res://scripts/core/GameState.gd").new()
    var inventory = preload("res://scripts/inventory/InventoryService.gd").new(state)
    t.truthy(inventory.acquire("ITM-G01-002"))
    t.truthy(not inventory.try_install("ITM-G01-002", "wrong-slot", "OTHER"))
    t.truthy("ITM-G01-002" in state.inventory_item_ids, "wrong use must not consume fuse")
    t.truthy(inventory.try_install("ITM-G01-002", "standby-fuse-slot", "ITM-G01-002"))
    t.truthy(not ("ITM-G01-002" in state.inventory_item_ids))
    t.truthy("ITM-G01-002" in state.installed_item_ids)
```

- [ ] **Step 2: Write failing save round-trip test**

```gdscript
state.scene_phase = "DEDUCTION"
state.observed_clue_ids = ["CLUE-001", "CLUE-002"]
var data = state.snapshot()
var restored = preload("res://scripts/core/GameState.gd").new()
t.truthy(restored.restore(data))
t.equal(restored.scene_phase, "DEDUCTION")
t.equal(restored.observed_clue_ids, ["CLUE-001", "CLUE-002"])
```

- [ ] **Step 3: Run tests and verify failure**

- [ ] **Step 4: Implement `GameState.gd`**

Required fields:

```gdscript
var schema_version := 1
var scene_id := "SCN-G01-00"
var scene_phase := "EXPLORE"
var inventory_item_ids: Array[String] = []
var observed_clue_ids: Array[String] = []
var deduction_edges: Array[Dictionary] = []
var unlocked_deduction_ids: Array[String] = []
var installed_item_ids: Array[String] = []
var device_state := {"b_isolated": false, "fuse_installed": false, "coupler_angle": 0, "protector_on": false}
var world_state := "BLACKOUT"
var elapsed_seconds := 0.0
```

`snapshot()` must return only JSON-compatible values. `restore()` must reject unsupported schema values and missing `scene_id`.

- [ ] **Step 5: Implement atomic `SaveService.gd`**

Write `user://save_01.tmp`, flush/close, then replace `user://save_01.json`. If JSON parse fails on load, return `{}` and do not crash.

- [ ] **Step 6: Implement `InventoryService.gd`**

Wrong target returns `false` without removing the item. Correct installation removes inventory item once and adds to `installed_item_ids` once.

- [ ] **Step 7: Re-run all headless tests**

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add godot/scripts/core godot/scripts/inventory godot/tests
git commit -m "feat(godot): add persistent game state and inventory"
```

## Task 4: Implement deduction logic before building the clue-board visuals

**Files:**
- Create: `godot/scripts/clue/ClueService.gd`
- Create: `godot/scripts/clue/DeductionGraph.gd`
- Create: `godot/tests/test_deduction_graph.gd`
- Modify: `godot/tests/run_tests.gd`

**Interfaces:**
- `ClueService.observe(clue_id: String) -> bool`
- `DeductionGraph.add_edge(from_id: String, to_id: String, relation: String) -> Dictionary`
- Result shape: `{ "accepted": bool, "new_deductions": Array[String] }`
- `DeductionGraph.has_deduction(id: String) -> bool`

- [ ] **Step 1: Write failing tests for correct and incorrect relations**

```gdscript
var state = preload("res://scripts/core/GameState.gd").new()
var graph = preload("res://scripts/clue/DeductionGraph.gd").new(state)
for id in ["CLUE-001","CLUE-002","CLUE-003","CLUE-004","CLUE-005","CLUE-006","CLUE-007"]:
    state.observed_clue_ids.append(id)

t.truthy(graph.add_edge("CLUE-002", "CLUE-003", "supports").accepted)
t.truthy(graph.has_deduction("DED-002"))
t.truthy(graph.add_edge("CLUE-007", "CLUE-006", "supersedes").accepted)
t.truthy(graph.has_deduction("DED-003"))
var bad = graph.add_edge("CLUE-006", "CLUE-007", "supports")
t.truthy(not bad.accepted)
t.truthy(not graph.has_deduction("DED-004"))
```

- [ ] **Step 2: Add the final deduction test**

After DED-001/002/003 exist and CLUE-004/005 are observed, call `graph.recompute()` and require `DED-004` to unlock.

- [ ] **Step 3: Run and verify failure**

- [ ] **Step 4: Implement rule loading from `scn_g01_00.json`**

Do not hardcode clue text in UI scripts. `DeductionGraph` may hardcode only supported relation enum values:

```gdscript
const VALID_RELATIONS = ["supports", "contradicts", "supersedes"]
```

- [ ] **Step 5: Ensure brute-force behavior is not rewarded**

Rejected edges must not be persisted in `state.deduction_edges`. Duplicate valid edges must be idempotent. Unknown clue IDs must be rejected.

- [ ] **Step 6: Run tests**

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add godot/scripts/clue godot/tests
git commit -m "feat(godot): add clue and deduction graph logic"
```

## Task 5: Build the explorable cockpit and flashlight-first evidence discovery

**Files:**
- Create: `godot/scenes/g01/SCN_G01_00.tscn`
- Create: `godot/scripts/interaction/FlashlightController.gd`
- Create: `godot/scripts/interaction/Inspectable.gd`
- Create: `godot/scripts/scenes/SCN_G01_00.gd`
- Create: `godot/scripts/core/SceneDirector.gd`
- Modify: `godot/scenes/main/Main.tscn`
- Modify: `godot/tests/test_scene_contract.gd`

**Interfaces:**
- `Inspectable.observed(clue_id: String)` signal.
- `FlashlightController.is_point_lit(world_position: Vector2) -> bool`.
- `SceneDirector.start_new_game()` and `SceneDirector.resume_game()`.

- [ ] **Step 1: Add a failing structural test that loads the scene**

```gdscript
var packed = load("res://scenes/g01/SCN_G01_00.tscn")
t.truthy(packed != null)
var scene = packed.instantiate()
t.truthy(scene.has_node("World/Background"))
t.truthy(scene.has_node("World/Flashlight"))
t.truthy(scene.has_node("World/PowerPanelHotspot"))
t.truthy(scene.has_node("UI/InventoryHud"))
scene.free()
```

- [ ] **Step 2: Run and verify failure**

- [ ] **Step 3: Build the world scene from inherited art**

Use `g01-cockpit-cabinet-closed-v2.png` as initial blackout world art. Add `CanvasModulate`/overlay so the base scene is dark but still navigable under emergency red flashes.

- [ ] **Step 4: Implement the flashlight as a real world tool**

After picking `ITM-G01-001`, enable a `PointLight2D`/masked spotlight following mouse position with smoothing. Before pickup, flashlight node remains disabled.

- [ ] **Step 5: Implement flashlight-gated inspectables**

For CLUE-002/003/004/007, interaction only succeeds when the inspection point is inside the flashlight illumination threshold. Hover outside light must not reveal clue names.

- [ ] **Step 6: Add world-space feedback instead of debug markers**

Hover uses a shader/outline or subtle emissive pulse on the object area. No large circles, labels, HTML-like buttons, or permanent hotspot borders.

- [ ] **Step 7: Re-run structural tests and manually run the scene at both target resolutions**

Run:

```bash
godot --path godot --editor
```

Verify 1920×1080 and 1366×768 keep key world objects clickable.

- [ ] **Step 8: Commit**

```bash
git add godot/scenes/g01 godot/scripts/interaction godot/scripts/scenes godot/scripts/core/SceneDirector.gd godot/tests/test_scene_contract.gd
git commit -m "feat(godot): build flashlight-driven cockpit exploration"
```

## Task 6: Build the free-form deduction board UI

**Files:**
- Create: `godot/scenes/ui/DeductionBoard.tscn`
- Create: `godot/scripts/clue/DeductionBoard.gd`
- Modify: `godot/scenes/g01/SCN_G01_00.tscn`
- Modify: `godot/tests/test_scene_contract.gd`

**Interfaces:**
- Uses `ClueService` and `DeductionGraph` from Task 4.
- Emits `deduction_unlocked(id: String)` for scene feedback only; logical state stays in `DeductionGraph`.

- [ ] **Step 1: Add a failing scene test**

Require nodes:

```gdscript
t.truthy(scene.has_node("UI/DeductionBoard/BoardCanvas"))
t.truthy(scene.has_node("UI/DeductionBoard/ObservedClues"))
```

- [ ] **Step 2: Implement evidence-card creation only for observed clues**

Do not create hidden placeholders. `refresh_cards()` iterates only `state.observed_clue_ids`.

- [ ] **Step 3: Implement free card dragging and connection endpoints**

Cards are `Control` nodes on `BoardCanvas`; drag moves card position. Drag from an output socket to another card opens a compact relation selector with exactly three choices: supports / contradicts / supersedes.

- [ ] **Step 4: Route attempted relations through `DeductionGraph.add_edge()`**

Accepted relation creates a persistent line and may spawn a new deduction card. Rejected relation flashes the temporary line and removes it without saying which relation is correct.

- [ ] **Step 5: Make deduction cards reusable as inputs to DED-004**

When DED-001/002/003 unlock, their cards appear and remain movable. DED-004 unlocks only when the graph/rules say it is valid.

- [ ] **Step 6: Add pause/focus behavior**

Opening board sets `get_tree().paused = true`; the board itself uses `process_mode = Node.PROCESS_MODE_WHEN_PAUSED`. Closing resumes the scene.

- [ ] **Step 7: Verify at both resolutions**

No card or relation selector may leave the visible safe area.

- [ ] **Step 8: Commit**

```bash
git add godot/scenes/ui/DeductionBoard.tscn godot/scripts/clue/DeductionBoard.gd godot/scenes/g01/SCN_G01_00.tscn godot/tests/test_scene_contract.gd
git commit -m "feat(godot): add interactive deduction board"
```

## Task 7: Implement the maintenance cabinet, inventory, and clue-producing item inspection

**Files:**
- Create: `godot/scenes/ui/InventoryHud.tscn`
- Modify: `godot/scenes/g01/SCN_G01_00.tscn`
- Modify: `godot/scripts/scenes/SCN_G01_00.gd`
- Modify: `godot/scripts/inventory/InventoryService.gd`
- Modify: `godot/tests/test_inventory_service.gd`

**Interfaces:**
- Picking fuse produces `ITM-G01-002` and makes `CLUE-005` observable.
- Inspecting old label makes `CLUE-006` observable but does not add the label to inventory.

- [ ] **Step 1: Add failing tests for collectible vs non-collectible objects**

```gdscript
t.truthy(inventory.acquire("ITM-G01-002"))
t.truthy("ITM-G01-002" in state.inventory_item_ids)
t.truthy(not inventory.acquire_environment_only("RUNTIME-ITM-G01-SCN00-LABEL"))
t.truthy(not ("RUNTIME-ITM-G01-SCN00-LABEL" in state.inventory_item_ids))
```

- [ ] **Step 2: Build maintenance-cabinet close-up using inherited cabinet art**

Cabinet is entered through camera tween/scene sub-camera, not a centered modal. Fuse, wrench, glove, and label live as world sprites/areas over the cabinet art.

- [ ] **Step 3: Add fuse pickup animation**

Fuse sprite moves toward the inventory HUD then disappears from cabinet world state. Reloaded save must keep it absent if already acquired/installed.

- [ ] **Step 4: Add old-label inspection as a decoy clue**

The player can record CLUE-006. Do not visually mark it as “wrong” or “decoy.”

- [ ] **Step 5: Add Rev.3 marking CLUE-007 in a separate physical location**

CLUE-007 must not be bundled into the same click as CLUE-006, forcing the player to compare them.

- [ ] **Step 6: Re-run tests and manually verify camera transitions**

- [ ] **Step 7: Commit**

```bash
git add godot/scenes godot/scripts godot/tests/test_inventory_service.gd
git commit -m "feat(godot): add maintenance cabinet and clue-bearing items"
```

## Task 8: Implement the physical power-panel puzzle state machine

**Files:**
- Create: `godot/scenes/g01/PowerPanelCloseup.tscn`
- Create: `godot/scripts/puzzle/PowerPanelPuzzle.gd`
- Create: `godot/tests/test_power_panel.gd`
- Modify: `godot/tests/run_tests.gd`

**Interfaces:**
- `set_b_isolated(value: bool) -> Dictionary`
- `install_fuse(item_id: String) -> Dictionary`
- `set_coupler_angle(degrees: float) -> Dictionary`
- `toggle_protector() -> Dictionary`
- Action result: `{ "ok": bool, "feedback": String, "completed": bool }`

- [ ] **Step 1: Write failing order and persistence tests**

```gdscript
var state = preload("res://scripts/core/GameState.gd").new()
state.unlocked_deduction_ids.append("DED-004")
state.inventory_item_ids.append("ITM-G01-002")
var puzzle = preload("res://scripts/puzzle/PowerPanelPuzzle.gd").new(state)

t.truthy(not puzzle.toggle_protector().ok)
t.truthy(puzzle.set_b_isolated(true).ok)
t.truthy(puzzle.install_fuse("ITM-G01-002").ok)
t.truthy(puzzle.set_coupler_angle(90.0).ok)
var result = puzzle.toggle_protector()
t.truthy(result.ok)
t.truthy(result.completed)
t.equal(state.world_state, "POWER_RESTORED")
```

- [ ] **Step 2: Write the anti-skip test**

Without `DED-004`, attempting to operate the final power panel must allow observation but refuse completion; it must not auto-unlock the deduction.

- [ ] **Step 3: Run and verify failure**

- [ ] **Step 4: Implement puzzle state transitions**

Correct prerequisites:

```text
DED-004 unlocked
B isolated == true
ITM-G01-002 installed == true
coupler angle within 90° ± 8°
then protector can latch
```

- [ ] **Step 5: Build physical controls in `PowerPanelCloseup.tscn`**

- B lever: draggable along a vertical track with two snap positions.
- Fuse: inventory drag enters a world-space fuse slot with snap animation.
- Coupler: mouse drag rotates a physical knob; do not use a slider UI control.
- Protector: lever/handle drag or press motion with spring return on invalid state.

- [ ] **Step 6: Implement wrong-action world feedback**

Invalid coupler/protector action triggers local red status lamp, small camera shake, relay sound if a local sound is available, and a spring return. Do not show an answer text box.

- [ ] **Step 7: Run tests**

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add godot/scenes/g01/PowerPanelCloseup.tscn godot/scripts/puzzle/PowerPanelPuzzle.gd godot/tests
git commit -m "feat(godot): add reasoning-gated physical power panel"
```

## Task 9: Integrate the 15–25 minute vertical slice and world-state payoff

**Files:**
- Modify: `godot/scripts/core/SceneDirector.gd`
- Modify: `godot/scripts/scenes/SCN_G01_00.gd`
- Modify: `godot/scenes/g01/SCN_G01_00.tscn`
- Modify: `godot/scripts/core/SaveService.gd`
- Create: `godot/tests/test_scene_flow.gd`
- Modify: `godot/tests/run_tests.gd`

**Interfaces:**
- Produces end state `scene_phase == "SLICE_COMPLETE"`.
- Emits no transition into SCN-G01-01 gameplay.

- [ ] **Step 1: Write a failing flow-state test**

Test the state-level path:

```text
EXPLORE -> INVESTIGATE -> DEDUCTION -> REPAIR -> POWER_RESTORED -> SLICE_COMPLETE
```

Assert that `SLICE_COMPLETE` has no `next_scene_id` other than a non-interactive `SCN-G01-01-TEASER` marker.

- [ ] **Step 2: Run and verify failure**

- [ ] **Step 3: Integrate title New Game into SceneDirector**

New Game clears `user://save_01.json` only after confirmation if a save exists, creates fresh `GameState`, and loads `SCN_G01_00.tscn`.

- [ ] **Step 4: Add Continue behavior**

Continue loads the last save and restores clue cards, deduction edges, fuse acquisition/installation, power-panel control states, and world lighting.

- [ ] **Step 5: Implement world payoff**

When power is restored:

1. emergency red flash stops;
2. cabin light bands illuminate in sequence;
3. control console indicators wake;
4. background art/state transitions from blackout framing toward `g01-cockpit.png` presentation;
5. camera pulls back from panel;
6. a subtle ship-tail echo indicator activates;
7. the route/door toward the navigation core gains light;
8. final copy indicates only that the signal continues deeper into the ship.

No “Congratulations / Puzzle Complete” modal.

- [ ] **Step 6: Save at each irreversible correct milestone**

Save after: flashlight pickup, fuse pickup, each new deduction, correct fuse installation, B isolation, final power restore.

- [ ] **Step 7: Re-run all headless tests**

Expected: PASS.

- [ ] **Step 8: Manual owner-oriented play check**

Developer must complete the full slice without debug shortcuts. Record elapsed time. If an experienced developer completes it in under 8 minutes on first clean save, do not add arbitrary delays; instead inspect whether evidence/puzzle bypasses exist and fix those bypasses.

- [ ] **Step 9: Commit**

```bash
git add godot
git commit -m "feat(godot): complete SCN-G01-00 native vertical slice"
```

## Task 10: Add Windows CI, release package, and evidence gate

**Files:**
- Create: `.github/workflows/godot-windows-scn00.yml`
- Create: `godot/tools/package_windows.sh`
- Create: `godot/README.md`
- Modify: `README_TRIAL.md` only to mark Web trial as frozen prototype; do not delete old documentation.

**Interfaces:**
- CI artifact: `starwreck-godot-scn-g01-00-windows-<shortsha>.zip`
- SHA file: same name + `.sha256`.

- [ ] **Step 1: Create a CI job pinned to Godot 4.7.2 stable**

The job must:

```text
checkout
verify inherited asset provenance
install/download Godot 4.7.2-stable + official export templates
run godot headless tests
import resources headlessly
export Windows x86_64 release
zip EXE + PCK (if separate) + README
calculate SHA-256
upload artifact
```

Do not use a floating `latest` Godot image/tag.

- [ ] **Step 2: Add packaging determinism checks**

Build twice in the same runner if practical. If Godot export embeds nondeterministic metadata and hashes differ, document that fact and require the final single artifact hash rather than weakening functional gates.

- [ ] **Step 3: Add `godot/README.md` with exact local commands**

Include:

```bash
godot --headless --path godot --script res://tests/run_tests.gd
godot --path godot --editor
godot --headless --path godot --export-release "Windows Desktop" ../release/starwreck-godot-scn-g01-00.exe
```

- [ ] **Step 4: Produce manual visual evidence**

Required captures at 1920×1080 and 1366×768:

- blackout initial scene;
- flashlight investigation;
- cabinet close-up;
- deduction board with at least one valid and one rejected relation;
- DED-004 unlocked;
- physical power panel before repair;
- wrong action feedback;
- restored-power world state.

- [ ] **Step 5: Produce video evidence**

Required videos:

1. full clean-save playthrough, target 15–25 minutes;
2. 30–90s exploration/evidence clip;
3. 30–90s deduction-board clip;
4. 30–90s physical power-panel clip.

- [ ] **Step 6: Run final regression commands**

```bash
node scripts/verify_godot_asset_provenance.mjs
godot --headless --path godot --script res://tests/run_tests.gd
godot --headless --path godot --export-release "Windows Desktop" release/starwreck-godot-scn-g01-00.exe
sha256sum release/*
```

Expected: provenance PASS, tests PASS, export success, hashes printed.

- [ ] **Step 7: Open a Draft PR**

PR title:

```text
[P0][GODOT] Windows原生SCN-G01-00推理解谜Vertical Slice
```

PR must remain Draft until PMO technical review.

- [ ] **Step 8: Post exact readiness signal to the governing issue**

```text
READY FOR GODOT SCN-G01-00 TECHNICAL REVIEW
```

Include:

- branch and HEAD;
- Godot version;
- test output;
- Windows artifact ID/link;
- ZIP SHA-256;
- full-play video;
- three short interaction clips;
- known issues;
- explicit statement that no Web export and no SCN-G01-01 gameplay were added.

- [ ] **Step 9: Commit**

```bash
git add .github/workflows/godot-windows-scn00.yml godot/tools/package_windows.sh godot/README.md README_TRIAL.md
git commit -m "ci(godot): package Windows SCN-G01-00 review build"
```

## Final Self-Review Checklist

Before posting READY, Codex must verify all of the following:

- [ ] No `TBD`, `TODO`, fake controls, or placeholder “success” buttons exist in the slice.
- [ ] No Web export preset exists.
- [ ] No HTML/DOM/WebView runtime is loaded.
- [ ] Exactly seven clue definitions and four deduction definitions are present for SCN-G01-00.
- [ ] CLUE-006 is not visually labeled as a decoy; CLUE-007 must genuinely supersede it through player reasoning.
- [ ] DED-004 cannot unlock without DED-001/002/003 and CLUE-004/005.
- [ ] Power-panel completion is impossible before DED-004.
- [ ] Wrong item use never consumes `ITM-G01-001` or `ITM-G01-002`.
- [ ] Correct partial puzzle progress survives save/reload.
- [ ] World state visibly changes after power restore.
- [ ] The slice stops before SCN-G01-01 gameplay.
- [ ] Both 1920×1080 and 1366×768 are manually checked.
- [ ] Windows EXE launches without Node/npm/browser.
