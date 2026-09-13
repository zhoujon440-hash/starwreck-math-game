extends RefCounted

const PUZZLE_PATH := "res://scripts/puzzle/RepairSynthesisPuzzle.gd"
const WORKBENCH_PATH := "res://scenes/ui/RepairSynthesisWorkbench.tscn"

func run(t) -> void:
	t.truthy(ResourceLoader.exists(PUZZLE_PATH), "repair-record synthesis needs a dedicated pure puzzle")
	if not ResourceLoader.exists(PUZZLE_PATH):
		return
	var script = load(PUZZLE_PATH)
	var state = preload("res://scripts/core/GameState.gd").new()
	state.inventory_item_ids.assign(["ITM-G01-002", "ITM-G01-003", "ITM-G01-004"])
	var puzzle = script.new(state)

	# Mutation caught: neither plate placement nor compression can bypass the
	# earned evidence and DED-003 gate.
	var locked = puzzle.place_plate(0, "REV3_STAMP")
	_assert_result_shape(t, locked, "locked workbench")
	t.truthy(not locked.ok and not locked.changed, "workbench remains locked before DED-003 and the four repair clues")
	t.equal(state.investigation_state["repair_synthesis_steps"], [], "locked placement cannot persist a plate")
	t.truthy(not puzzle.press_record().ok, "compression handle cannot bypass a locked workbench")
	state.investigation_state["repair_synthesis_steps"] = [{"slot": 0, "plate_id": "REV3_STAMP"}]
	t.truthy(not puzzle.remove_plate(0).ok, "locked workbench cannot alter a restored partial slot")
	t.equal(state.investigation_state["repair_synthesis_steps"], [{"slot": 0, "plate_id": "REV3_STAMP"}], "locked removal preserves the restored plate")
	state.investigation_state["repair_synthesis_steps"] = []

	state.observed_clue_ids.assign(["CLUE-004", "CLUE-005", "CLUE-006", "CLUE-007"])
	state.unlocked_deduction_ids.assign(["DED-003"])
	state.deduction_edges.assign([{"from": "CLUE-007", "to": "CLUE-006", "relation": "supersedes"}])
	t.truthy(puzzle.is_unlocked(), "DED-003 plus all four repair clues unlocks the physical workbench")

	# Mutation caught: a plausible wrong plate remains physical, removable, and
	# non-consuming while the readout explains the world evidence mismatch.
	var inventory_before: Array[String] = state.inventory_item_ids.duplicate()
	var wrong = puzzle.place_plate(0, "AC_PATH")
	_assert_result_shape(t, wrong, "wrong plate placement")
	t.truthy(wrong.ok and wrong.changed and wrong.feedback.contains("年代"), "wrong path plate stays seated with a specific era comparison")
	t.equal(state.investigation_state["repair_synthesis_steps"], [{"slot": 0, "plate_id": "AC_PATH"}], "wrong placement is preserved for physical recovery")
	t.truthy(not puzzle.press_record().ok and not state.investigation_state["repair_synthesis_complete"], "wrong mapping cannot stamp the record")
	var removed = puzzle.remove_plate(0)
	t.truthy(removed.ok and removed.changed and state.investigation_state["repair_synthesis_steps"].is_empty(), "wrong plate can be removed without resetting another system")
	t.equal(state.inventory_item_ids, inventory_before, "placement and recovery consume no carried item")

	# Mutation caught: the exact hand-derived mapping is required and a partial
	# two-plate save resumes as physical state rather than recomputing an answer.
	t.truthy(puzzle.place_plate(0, "REV3_STAMP").ok)
	t.truthy(puzzle.place_plate(1, "AC_PATH").ok)
	var partial_snapshot = state.snapshot()
	var resumed_state = preload("res://scripts/core/GameState.gd").new()
	t.truthy(resumed_state.restore(partial_snapshot), "two placed plates form a valid resumable save")
	t.equal(resumed_state.investigation_state["repair_synthesis_steps"], [
		{"slot": 0, "plate_id": "REV3_STAMP"},
		{"slot": 1, "plate_id": "AC_PATH"},
	], "resume preserves the exact physical slot mapping")
	var resumed = script.new(resumed_state)
	t.truthy(resumed.place_plate(2, "FUSE_SPEC").ok, "resumed workbench accepts the remaining spare-slot plate")
	var completions: Array[bool] = []
	resumed.synthesis_completed.connect(func(): completions.append(true))
	var pressed = resumed.press_record()
	_assert_result_shape(t, pressed, "completed compression")
	t.truthy(pressed.ok and pressed.completed and pressed.changed, "exact era-path-slot mapping stamps the repair record")
	t.truthy(resumed_state.investigation_state["repair_synthesis_complete"], "completion uses the strict Task 1 state flag")
	t.equal(completions.size(), 1, "first successful compression emits completion exactly once")
	var duplicate = resumed.press_record()
	t.truthy(duplicate.ok and duplicate.completed and not duplicate.changed, "re-pressing a sealed record is idempotent")
	t.equal(completions.size(), 1, "idempotent compression does not re-emit completion")
	t.truthy(not resumed.remove_plate(1).ok, "a sealed repair record cannot be dismantled")
	var json_round_trip = JSON.parse_string(JSON.stringify(resumed_state.snapshot()))
	var disk_resumed_state = preload("res://scripts/core/GameState.gd").new()
	t.truthy(disk_resumed_state.restore(json_round_trip), "completed synthesis survives Godot JSON number normalization")
	t.truthy(disk_resumed_state.investigation_state["repair_synthesis_complete"], "disk-resumed completion keeps the strict state flag")

	var parsed = JSON.parse_string(FileAccess.get_file_as_string("res://data/scenes/scn_g01_00.json"))
	t.truthy(parsed is Dictionary, "SCN-G01-00 synthesis presentation data parses")
	if parsed is Dictionary:
		var config: Dictionary = parsed.get("repair_synthesis_workbench", {})
		t.equal(config.get("slot_labels", []), ["年代", "批准路径", "备用槽"], "three mechanical slots keep the authored world labels")
		t.equal(config.get("plate_ids", []), ["REV3_STAMP", "AC_PATH", "FUSE_SPEC"], "three brass plates keep the authored evidence identities")
		t.equal(parsed.get("clues", []).size(), 7, "synthesis adds no eighth clue")
		t.equal(parsed.get("deductions", []).size(), 4, "synthesis adds no fifth deduction")
	t.truthy(ResourceLoader.exists(WORKBENCH_PATH), "repair synthesis has a dedicated in-world workbench scene")
	if ResourceLoader.exists(WORKBENCH_PATH):
		var workbench = load(WORKBENCH_PATH).instantiate()
		for path in [
			"Bench/PlateRack/REV3_STAMP",
			"Bench/PlateRack/AC_PATH",
			"Bench/PlateRack/FUSE_SPEC",
			"Bench/SlotRack/Slot0",
			"Bench/SlotRack/Slot1",
			"Bench/SlotRack/Slot2",
			"Bench/CompressionHandle",
			"Bench/Readout",
			"Bench/Return",
		]:
			t.truthy(workbench.has_node(path), "workbench exposes physical control %s" % path)
		if workbench.has_node("Bench/SlotRack/Slot0"):
			var slot: Button = workbench.get_node("Bench/SlotRack/Slot0")
			t.truthy(slot.custom_minimum_size.x >= 220.0 and slot.custom_minimum_size.y >= 72.0, "mechanical slots remain readable and clickable after 1366x768 canvas scaling")
		workbench.free()

func _assert_result_shape(t, result: Dictionary, context: String) -> void:
	var keys: Array = result.keys()
	keys.sort()
	t.equal(keys, ["changed", "completed", "feedback", "ok"], "%s returns the four-field synthesis contract" % context)
	t.truthy(result["ok"] is bool and result["completed"] is bool and result["feedback"] is String and result["changed"] is bool, "%s result fields keep strict types" % context)
