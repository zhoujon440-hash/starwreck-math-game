extends RefCounted

func run(t) -> void:
	var state = preload("res://scripts/core/GameState.gd").new()
	state.scene_phase = "DEDUCTION"
	state.observed_clue_ids.assign(["CLUE-001", "CLUE-002"])
	state.device_state["b_isolated"] = true
	var data = state.snapshot()
	var restored = preload("res://scripts/core/GameState.gd").new()
	t.truthy(restored.restore(data), "valid snapshot must restore")
	t.equal(restored.scene_phase, "DEDUCTION")
	t.equal(restored.observed_clue_ids, ["CLUE-001", "CLUE-002"])
	t.equal(restored.device_state["b_isolated"], true)
	t.truthy(not restored.restore({"schema_version": 99, "scene_id": "SCN-G01-00"}), "future schema must be rejected")
	t.truthy(not restored.restore({"schema_version": 1}), "missing scene id must be rejected")

