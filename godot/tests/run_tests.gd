extends SceneTree

func _init() -> void:
	var t = preload("res://tests/TestAssert.gd").new()
	var suites = [
		preload("res://tests/test_narrative_continuity.gd").new(),
		preload("res://tests/test_scene_contract.gd").new(),
		preload("res://tests/test_game_state.gd").new(),
		preload("res://tests/test_math_progress.gd").new(),
		preload("res://tests/test_inventory_service.gd").new(),
		preload("res://tests/test_evidence_inspection.gd").new(),
		preload("res://tests/test_save_service.gd").new(),
		preload("res://tests/test_deduction_graph.gd").new(),
		preload("res://tests/test_repair_synthesis.gd").new(),
		preload("res://tests/test_power_panel.gd").new(),
		preload("res://tests/test_scene_flow.gd").new(),
		preload("res://tests/test_hint_service.gd").new(),
		preload("res://tests/test_signal_window_puzzle.gd").new(),
		preload("res://tests/test_dual_signal_verification.gd").new(),
	]
	for suite in suites:
		var orphan_count := int(Performance.get_monitor(Performance.OBJECT_ORPHAN_NODE_COUNT))
		suite.run(t)
		t.equal(int(Performance.get_monitor(Performance.OBJECT_ORPHAN_NODE_COUNT)), orphan_count, "suite must release its scene fixtures: %s" % suite.get_script().resource_path)
	for failure in t.failures:
		push_error(failure)
	if t.failures.is_empty():
		print("TESTS PASSED")
	else:
		print("TESTS FAILED: %d" % t.failures.size())
	quit(1 if not t.failures.is_empty() else 0)
