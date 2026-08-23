extends SceneTree

func _init() -> void:
	var t = preload("res://tests/TestAssert.gd").new()
	var suites = [
		preload("res://tests/test_scene_contract.gd").new(),
		preload("res://tests/test_game_state.gd").new(),
		preload("res://tests/test_inventory_service.gd").new(),
		preload("res://tests/test_save_service.gd").new(),
		preload("res://tests/test_deduction_graph.gd").new(),
		preload("res://tests/test_power_panel.gd").new(),
	]
	for suite in suites:
		suite.run(t)
	for failure in t.failures:
		push_error(failure)
	if t.failures.is_empty():
		print("TESTS PASSED")
	else:
		print("TESTS FAILED: %d" % t.failures.size())
	quit(1 if not t.failures.is_empty() else 0)

