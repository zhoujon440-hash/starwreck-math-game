extends RefCounted

func run(t) -> void:
	var locked_state = preload("res://scripts/core/GameState.gd").new()
	locked_state.inventory_item_ids.append("ITM-G01-002")
	var locked = preload("res://scripts/puzzle/PowerPanelPuzzle.gd").new(locked_state)
	t.truthy(not locked.set_b_isolated(true).ok)
	t.truthy(not locked.toggle_protector().ok)
	t.truthy("DED-004" not in locked_state.unlocked_deduction_ids)
	t.truthy("ITM-G01-002" in locked_state.inventory_item_ids)
	locked.free()

	var state = preload("res://scripts/core/GameState.gd").new()
	state.unlocked_deduction_ids.append("DED-004")
	state.inventory_item_ids.append("ITM-G01-002")
	var puzzle = preload("res://scripts/puzzle/PowerPanelPuzzle.gd").new(state)
	t.truthy(not puzzle.toggle_protector().ok)
	t.truthy(not puzzle.install_fuse("WRONG").ok)
	t.truthy("ITM-G01-002" in state.inventory_item_ids)
	t.truthy(puzzle.set_b_isolated(true).ok)
	t.truthy(puzzle.install_fuse("ITM-G01-002").ok)
	t.truthy(puzzle.set_coupler_angle(90.0).ok)
	var result = puzzle.toggle_protector()
	t.truthy(result.ok)
	t.truthy(result.completed)
	t.equal(state.world_state, "POWER_RESTORED")
	puzzle.free()
	var packed = load("res://scenes/g01/PowerPanelCloseup.tscn")
	t.truthy(packed != null)
	if packed != null:
		var panel = packed.instantiate()
		for path in ["BIsolationLever", "StandbyFuseSlot", "CouplerKnob", "ProtectorLever", "StatusLamp"]:
			t.truthy(panel.has_node(path))
		panel.free()

