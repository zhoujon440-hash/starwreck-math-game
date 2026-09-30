extends RefCounted

func run(t) -> void:
	var service_script = load("res://scripts/math/MathProgressService.gd")
	t.truthy(service_script != null, "math progress service must exist")
	if service_script == null:
		return
	var state = preload("res://scripts/core/GameState.gd").new()
	var service = service_script.new(state)
	t.truthy(service.set_support_tier("guided"), "guided is supported")
	t.equal(state.math_state["support_tier"], "guided")
	t.truthy(not service.set_support_tier("grade-3"), "grade labels are not runtime tiers")
	service.record_attempt("WINDOW_NOT_EQUAL")
	service.record_attempt("WINDOW_NOT_EQUAL")
	t.equal(state.math_state["attempt_codes"], ["WINDOW_NOT_EQUAL"], "attempt categories are deduplicated")
	t.truthy(service.use_hint(2), "hint stage can increase")
	t.truthy(not service.use_hint(1), "hint stage cannot move backward")
	t.truthy(not service.has_method("complete_task"), "the general math service cannot directly complete the dual-signal ending")
	var math_service_source := FileAccess.get_file_as_string("res://scripts/math/MathProgressService.gd")
	t.truthy("complete_task" not in math_service_source and 'state.math_state["completed"] = true' not in math_service_source, "the diagnostic helper source cannot retain a direct completion writer")
	var scene_source := FileAccess.get_file_as_string("res://scripts/scenes/SCN_G01_00.gd")
	t.truthy('func _on_signal_verification_completed()' in scene_source and 'state.math_state["completed"] = true' in scene_source and 'state.math_state["signal_split"] = true' in scene_source, "only the signal-verification callback owns terminal completion writes")
