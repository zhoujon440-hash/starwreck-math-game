class_name EvidenceInspectionMechanics
extends RefCounted

var state: RefCounted
var forensic_config: Dictionary

func _init(game_state: RefCounted, config: Dictionary) -> void:
	state = game_state
	forensic_config = config.duplicate(true)

func observe_evidence_detail(clue_id: String, index: int) -> Dictionary:
	if clue_id not in ["CLUE-002", "CLUE-003", "CLUE-004"] or index < 0 or index > 2:
		return _result(false, false, "unknown_observation", false)
	var all_observations: Dictionary = state.investigation_state.get("inspection_observations", {})
	var observed: Array = all_observations.get(clue_id, [])
	var changed := index not in observed
	if changed:
		observed.append(index)
		observed.sort()
	all_observations[clue_id] = observed
	state.investigation_state["inspection_observations"] = all_observations
	return _result(true, observed.size() == 3, "observation_compared", changed)

func evidence_details_complete(clue_id: String) -> bool:
	var all_observations: Dictionary = state.investigation_state.get("inspection_observations", {})
	var observed: Array = all_observations.get(clue_id, [])
	return observed.size() == 3

func choose_evidence_hypothesis(clue_id: String, index: int) -> Dictionary:
	if not evidence_details_complete(clue_id):
		return _result(false, false, "observe_details_first", false)
	var targets := {"CLUE-002": 1, "CLUE-003": 2, "CLUE-004": 0}
	if clue_id not in targets or index != int(targets[clue_id]):
		return _result(false, false, "hypothesis_not_supported", false)
	var hypotheses: Dictionary = state.investigation_state.get("inspection_hypotheses", {})
	var changed := not bool(hypotheses.get(clue_id, false))
	hypotheses[clue_id] = true
	state.investigation_state["inspection_hypotheses"] = hypotheses
	return _result(true, true, "hypothesis_supported", changed)

func evidence_hypothesis_confirmed(clue_id: String) -> bool:
	var hypotheses: Dictionary = state.investigation_state.get("inspection_hypotheses", {})
	return bool(hypotheses.get(clue_id, false))

func calibrate_burn_segment(index: int, direction: int) -> Dictionary:
	if not evidence_hypothesis_confirmed("CLUE-002"):
		return _result(false, false, "observe_details_first", false)
	if bool(state.investigation_state.get("burn_baseline_locked", false)):
		return _result(true, true, "baseline_already_locked", false)
	var baseline: Array = state.investigation_state.get("burn_baseline", [0, 0, 0, 0])
	if index < 0 or index >= baseline.size() or direction not in [-1, 1]:
		return _result(false, false, "unknown_baseline_segment", false)
	baseline[index] = posmod(int(baseline[index]) + direction, 4)
	state.investigation_state["burn_baseline"] = baseline
	var ready := _matches_int_array(baseline, forensic_config.get("burn_baseline_target", []))
	return _result(true, ready, "baseline_ready" if ready else "baseline_segment_adjusted", true)

func lock_burn_baseline() -> Dictionary:
	if not evidence_hypothesis_confirmed("CLUE-002"):
		return _result(false, false, "observe_details_first", false)
	if bool(state.investigation_state.get("burn_baseline_locked", false)):
		return _result(true, true, "baseline_locked", false)
	var baseline: Array = state.investigation_state.get("burn_baseline", [])
	if not _matches_int_array(baseline, forensic_config.get("burn_baseline_target", [])):
		return _result(false, false, "BASELINE_UNSTABLE", false)
	state.investigation_state["burn_baseline_locked"] = true
	return _result(true, true, "baseline_locked", true)

func advance_burn_hold(index: int, delta: float) -> Dictionary:
	if not evidence_hypothesis_confirmed("CLUE-002"):
		return _result(false, false, "observe_details_first", false)
	if not bool(state.investigation_state.get("burn_baseline_locked", false)):
		return _result(false, false, "BASELINE_UNSTABLE", false)
	if not is_finite(delta) or delta <= 0.0:
		return _result(false, false, "invalid_hold_delta", false)
	var scanned: Array = state.investigation_state.get("burn_scan_points", [])
	var next_point := scanned.size()
	if next_point >= 4:
		return _result(true, true, "impact_trace_locked", false)
	if index < next_point:
		return _result(true, false, "scan_point_already_confirmed", false)
	if index != next_point or index < 0 or index > 3:
		return _result(false, false, "SCAN_DIRECTION_REJECTED", false)
	var active_point := int(state.investigation_state.get("burn_active_point", -1))
	if active_point not in [-1, index]:
		return _result(false, false, "SCAN_DIRECTION_REJECTED", false)
	state.investigation_state["burn_active_point"] = index
	var hold_seconds := maxf(float(forensic_config.get("burn_hold_seconds", 0.65)), 0.001)
	var progress := clampf(float(state.investigation_state.get("burn_hold_progress", 0.0)) + delta / hold_seconds, 0.0, 1.0)
	state.investigation_state["burn_hold_progress"] = progress
	if progress < 0.999999:
		return _result(true, false, "scan_hold_building", true)
	scanned.append(index)
	state.investigation_state["burn_scan_points"] = scanned
	state.investigation_state["burn_active_point"] = -1
	state.investigation_state["burn_hold_progress"] = 0.0
	var completed := scanned.size() == 4
	return _result(true, completed, "impact_trace_locked" if completed else "scan_point_confirmed", true)

func toggle_burn_scan_point(index: int) -> Dictionary:
	if not evidence_hypothesis_confirmed("CLUE-002"):
		return _result(false, false, "observe_details_first", false)
	if not bool(state.investigation_state.get("burn_baseline_locked", false)):
		return _result(false, false, "BASELINE_UNSTABLE", false)
	var scanned: Array = state.investigation_state.get("burn_scan_points", [])
	var next_point := scanned.size()
	if next_point >= 4:
		return _result(true, true, "impact_trace_locked", false)
	if index < next_point:
		return _result(true, false, "scan_point_already_confirmed", false)
	if index != next_point or index < 0 or index > 3:
		return _result(false, false, "SCAN_DIRECTION_REJECTED", false)
	var active_point := int(state.investigation_state.get("burn_active_point", -1))
	if active_point not in [-1, index]:
		return _result(false, false, "SCAN_DIRECTION_REJECTED", false)
	if active_point == index:
		scanned.append(index)
		state.investigation_state["burn_scan_points"] = scanned
		state.investigation_state["burn_active_point"] = -1
		state.investigation_state["burn_hold_progress"] = 0.0
		var completed := scanned.size() == 4
		return _result(true, completed, "impact_trace_locked" if completed else "scan_point_confirmed", true)
	state.investigation_state["burn_active_point"] = index
	state.investigation_state["burn_hold_progress"] = 0.0
	return _result(true, false, "scan_point_armed", true)

func cycle_tape_reel(index: int) -> Dictionary:
	if not evidence_hypothesis_confirmed("CLUE-003"):
		return _result(false, false, "observe_details_first", false)
	if bool(state.investigation_state.get("tape_verified", false)):
		return _result(true, true, "tape_run_verified", false)
	var positions: Array = state.investigation_state.get("tape_positions", [0, 0, 0])
	if index < 0 or index >= positions.size():
		return _result(false, false, "unknown_reel", false)
	positions[index] = (int(positions[index]) + 1) % 3
	state.investigation_state["tape_positions"] = positions
	return _result(true, false, "trace_reel_advanced", true)

func swap_tape_reels(left_index: int) -> Dictionary:
	if not evidence_hypothesis_confirmed("CLUE-003"):
		return _result(false, false, "observe_details_first", false)
	if bool(state.investigation_state.get("tape_verified", false)):
		return _result(true, true, "tape_run_verified", false)
	if left_index not in [0, 1]:
		return _result(false, false, "unknown_reel_swap", false)
	var order: Array = state.investigation_state.get("tape_order", [0, 1, 2])
	var reel = order[left_index]
	order[left_index] = order[left_index + 1]
	order[left_index + 1] = reel
	var positions: Array = state.investigation_state.get("tape_positions", [0, 0, 0])
	var face = positions[left_index]
	positions[left_index] = positions[left_index + 1]
	positions[left_index + 1] = face
	state.investigation_state["tape_order"] = order
	state.investigation_state["tape_positions"] = positions
	var completed := _matches_int_array(order, forensic_config.get("tape_order_target", []))
	return _result(true, completed, "tape_order_aligned" if completed else "tape_reels_swapped", true)

func verify_tape_run() -> Dictionary:
	if not evidence_hypothesis_confirmed("CLUE-003"):
		return _result(false, false, "observe_details_first", false)
	if bool(state.investigation_state.get("tape_verified", false)):
		return _result(true, true, "tape_run_verified", false)
	var order_matches := _matches_int_array(state.investigation_state.get("tape_order", []), forensic_config.get("tape_order_target", []))
	var faces_match := _matches_int_array(state.investigation_state.get("tape_positions", []), forensic_config.get("tape_positions_target", []))
	if not order_matches:
		return _result(false, false, "TAPE_ORDER_MISMATCH", false)
	if not faces_match:
		return _result(false, false, "TRACE_BREAKS_AT_SEAM", false)
	state.investigation_state["tape_verified"] = true
	return _result(true, true, "tape_run_verified", true)

func toggle_plate_latch(index: int) -> Dictionary:
	if not evidence_hypothesis_confirmed("CLUE-004"):
		return _result(false, false, "observe_details_first", false)
	var latches: Array = state.investigation_state.get("plate_latches", [false, false])
	if index < 0 or index > 1:
		return _result(false, false, "unknown_latch", false)
	if index == 1 and not bool(latches[0]):
		return _result(false, false, "pressure_latch_first", false)
	if bool(latches[index]):
		return _result(true, bool(latches[0]) and bool(latches[1]), "plate_latch_released", false)
	latches[index] = true
	state.investigation_state["plate_latches"] = latches
	return _result(true, bool(latches[0]) and bool(latches[1]), "plate_latch_released", true)

func lift_revision_cover() -> Dictionary:
	if not evidence_hypothesis_confirmed("CLUE-004"):
		return _result(false, false, "observe_details_first", false)
	if bool(state.investigation_state.get("plate_cover_lifted", false)):
		return _result(true, true, "revision_trace_exposed", false)
	var latches: Array = state.investigation_state.get("plate_latches", [false, false])
	var released := latches.size() == 2 and bool(latches[0]) and bool(latches[1])
	if not released:
		return _result(false, false, "cover_still_latched", false)
	state.investigation_state["plate_cover_lifted"] = true
	return _result(true, true, "revision_trace_exposed", true)

func trace_plate_node(index: int) -> Dictionary:
	if not evidence_hypothesis_confirmed("CLUE-004"):
		return _result(false, false, "observe_details_first", false)
	var latches: Array = state.investigation_state.get("plate_latches", [false, false])
	if latches.size() != 2 or not bool(latches[0]) or not bool(latches[1]):
		return _result(false, false, "cover_still_latched", false)
	if not bool(state.investigation_state.get("plate_cover_lifted", false)):
		return _result(false, false, "cover_still_latched", false)
	var target: Array = forensic_config.get("plate_trace_target", [])
	var traced: Array = state.investigation_state.get("plate_trace_nodes", [])
	if traced.size() >= target.size():
		return _result(true, true, "approved_path_traced", false)
	if index == 1:
		return _result(false, false, "TRACE_BREAKS_AT_SEAM", false)
	if index != int(target[traced.size()]):
		return _result(false, false, "trace_dead_end", false)
	traced.append(index)
	state.investigation_state["plate_trace_nodes"] = traced
	var completed := traced.size() == target.size()
	return _result(true, completed, "approved_path_traced" if completed else "trace_node_confirmed", true)

func evidence_operation_complete(clue_id: String) -> bool:
	match clue_id:
		"CLUE-002":
			return state.investigation_state.get("burn_scan_points", []).size() == 4
		"CLUE-003":
			return bool(state.investigation_state.get("tape_verified", false))
		"CLUE-004":
			return _matches_int_array(state.investigation_state.get("plate_trace_nodes", []), forensic_config.get("plate_trace_target", []))
	return false

func move_cabinet_obstruction(obstruction_name: String) -> Dictionary:
	var obstructions: Dictionary = state.investigation_state.get("cabinet_obstructions", {})
	if obstruction_name not in ["wrench", "glove"]:
		return _result(false, false, "unknown_obstruction", false)
	var changed := not bool(obstructions.get(obstruction_name, false))
	obstructions[obstruction_name] = true
	state.investigation_state["cabinet_obstructions"] = obstructions
	return _result(true, bool(obstructions.get("wrench", false)) and bool(obstructions.get("glove", false)), "obstruction_moved", changed)

func toggle_fuse_latch(index: int) -> Dictionary:
	var obstructions: Dictionary = state.investigation_state.get("cabinet_obstructions", {})
	if not bool(obstructions.get("wrench", false)) or not bool(obstructions.get("glove", false)):
		return _result(false, false, "holder_still_obscured", false)
	var latches: Array = state.investigation_state.get("fuse_latches", [false, false])
	if index < 0 or index > 1:
		return _result(false, false, "unknown_latch", false)
	if bool(latches[index]):
		return _result(true, bool(latches[0]) and bool(latches[1]), "fuse_clip_released", false)
	latches[index] = true
	state.investigation_state["fuse_latches"] = latches
	return _result(true, bool(latches[0]) and bool(latches[1]), "fuse_clip_released", true)

func can_take_fuse() -> bool:
	var latches: Array = state.investigation_state.get("fuse_latches", [false, false])
	return latches.size() == 2 and bool(latches[0]) and bool(latches[1])

func _matches_int_array(actual: Array, expected_value: Variant) -> bool:
	if not expected_value is Array:
		return false
	var expected: Array = expected_value
	if actual.size() != expected.size():
		return false
	for index in actual.size():
		if int(actual[index]) != int(expected[index]):
			return false
	return true

func _result(ok: bool, completed: bool, feedback: String, changed: bool) -> Dictionary:
	return {"ok": ok, "completed": completed, "feedback": feedback, "changed": changed}
