class_name SignalWindowPuzzle
extends RefCounted

var state: RefCounted
var config: Dictionary

func _init(game_state: RefCounted, puzzle_config: Dictionary) -> void:
	state = game_state
	config = puzzle_config.duplicate(true)

func prepare_probe(wrench_ready: bool, gloves_ready: bool) -> Dictionary:
	if not wrench_ready or not gloves_ready:
		return _failure("PROBE_UNSAFE")
	state.math_state["probe_prepared"] = true
	return _result(true, "PROBE_PREPARED")

func set_origin_tick(tick: int) -> Dictionary:
	if not state.math_state["probe_prepared"]:
		return _failure("PROBE_UNSAFE")
	if state.math_state["measurement_stage"] != "origin":
		return _failure("MEASUREMENT_STAGE_MISMATCH")
	if tick < 0 or tick >= int(config["cycle_size"]):
		return _failure("ORIGIN_MISMATCH")
	state.math_state["origin_tick"] = tick
	return _result(true, "ORIGIN_SET")

func confirm_origin() -> Dictionary:
	var stage: String = state.math_state["measurement_stage"]
	if stage in ["echo", "blockade", "windows", "complete"] and int(state.math_state["origin_tick"]) == int(config.get("origin_tick", 0)):
		return _result(true, "ORIGIN_CONFIRMED")
	if stage != "origin":
		return _failure("MEASUREMENT_STAGE_MISMATCH")
	if not state.math_state["probe_prepared"]:
		return _failure("PROBE_UNSAFE")
	if int(state.math_state["origin_tick"]) != int(config.get("origin_tick", 0)):
		return _failure("ORIGIN_MISMATCH")
	state.math_state["measurement_stage"] = "echo"
	state.math_state["observed_cycles"] = 1
	return _result(true, "ORIGIN_CONFIRMED")

func set_echo_caliper(pulse_tick: int, echo_tick: int) -> Dictionary:
	if not state.math_state["probe_prepared"]:
		return _failure("PROBE_UNSAFE")
	if state.math_state["measurement_stage"] != "echo":
		return _failure("MEASUREMENT_STAGE_MISMATCH")
	if pulse_tick < 0 or pulse_tick >= int(config["cycle_size"]) or echo_tick < 0 or echo_tick >= int(config["cycle_size"]):
		return _failure("ECHO_OFFSET_MISMATCH")
	state.math_state["echo_measurement"] = {"pulse": pulse_tick, "echo": echo_tick, "confirmed": false}
	return _result(true, "ECHO_CALIPER_SET")

func confirm_echo_measurement() -> Dictionary:
	var stage: String = state.math_state["measurement_stage"]
	var measurement: Dictionary = state.math_state["echo_measurement"]
	if stage in ["blockade", "windows", "complete"] and measurement["confirmed"]:
		return _result(true, "ECHO_MEASUREMENT_CONFIRMED")
	if stage != "echo":
		return _failure("MEASUREMENT_STAGE_MISMATCH")
	if not state.math_state["probe_prepared"]:
		return _failure("PROBE_UNSAFE")
	var target_pulse := int(config.get("echo_caliper_pulse", config["maintenance_pulses"][1]))
	var target_echo := posmod(target_pulse + int(config["weak_echo_offset"]), int(config["cycle_size"]))
	if int(measurement["pulse"]) != target_pulse or int(measurement["echo"]) != target_echo:
		return _failure("ECHO_OFFSET_MISMATCH")
	measurement["confirmed"] = true
	state.math_state["echo_measurement"] = measurement
	state.math_state["measurement_stage"] = "blockade"
	state.math_state["observed_cycles"] = 2
	return _result(true, "ECHO_MEASUREMENT_CONFIRMED")

func toggle_blockade_mark(tick: int) -> Dictionary:
	if not state.math_state["probe_prepared"]:
		return _failure("PROBE_UNSAFE")
	if state.math_state["measurement_stage"] != "blockade":
		return _failure("MEASUREMENT_STAGE_MISMATCH")
	if tick < 0 or tick >= int(config["cycle_size"]):
		return _failure("BLOCKADE_MAP_INCOMPLETE")
	var marks: Array = state.math_state["blockade_marks"]
	if tick in marks:
		marks.erase(tick)
		return _result(true, "BLOCKADE_MARK_REMOVED")
	if marks.size() >= config["blockade_slots"].size():
		return _failure("BLOCKADE_MAP_INCOMPLETE")
	marks.append(tick)
	marks.sort()
	return _result(true, "BLOCKADE_MARK_SET")

func confirm_blockade_overlay() -> Dictionary:
	var stage: String = state.math_state["measurement_stage"]
	if stage in ["windows", "complete"] and _same_int_set(state.math_state["blockade_marks"], config["blockade_slots"]):
		return _result(true, "BLOCKADE_OVERLAY_CONFIRMED")
	if stage != "blockade":
		return _failure("MEASUREMENT_STAGE_MISMATCH")
	if not state.math_state["probe_prepared"]:
		return _failure("PROBE_UNSAFE")
	if not _same_int_set(state.math_state["blockade_marks"], config["blockade_slots"]):
		return _failure("BLOCKADE_MAP_INCOMPLETE")
	state.math_state["measurement_stage"] = "windows"
	state.math_state["observed_cycles"] = int(config["required_observation_cycles"])
	return _result(true, "BLOCKADE_OVERLAY_CONFIRMED")

func set_window(index: int, tick: int) -> Dictionary:
	if state.math_state["measurement_stage"] != "windows":
		return _failure("MEASUREMENT_INCOMPLETE")
	if index < 0 or index >= int(config["window_count"]) or tick < 0 or tick >= int(config["cycle_size"]):
		return _failure("PHASE_MISMATCH")
	if state.math_state["window_locked"]:
		if int(state.math_state["sample_windows"][index]) == tick:
			return _result(true, "WINDOW_ALREADY_SET")
		return _failure("PHASE_MISMATCH")
	state.math_state["sample_windows"][index] = tick
	return _result(true, "WINDOW_SET")

func expected_windows() -> Array[int]:
	var windows: Array[int] = []
	for pulse in config["maintenance_pulses"]:
		windows.append(posmod(int(pulse) + int(config["weak_echo_offset"]), int(config["cycle_size"])))
	return windows

func lock_windows(b_isolated: bool) -> Dictionary:
	if state.math_state["window_locked"]:
		return _result(true, "WINDOWS_LOCKED")
	if not state.math_state["probe_prepared"]:
		return _failure("PROBE_UNSAFE")
	if int(state.math_state["observed_cycles"]) < int(config["required_observation_cycles"]):
		return _failure("OBSERVATION_INCOMPLETE")
	if state.math_state["measurement_stage"] != "windows":
		return _failure("MEASUREMENT_INCOMPLETE")
	if not b_isolated:
		return _failure("B_NOT_ISOLATED")
	var positions: Array = state.math_state["sample_windows"]
	if not _has_unique_positions(positions):
		return _failure("WINDOW_NOT_EQUAL")
	if not _has_circular_spacing(positions):
		return _failure("WINDOW_NOT_EQUAL")
	if _has_blockade_collision(positions):
		return _failure("BLOCKADE_COLLISION")
	if positions != expected_windows():
		return _failure("PHASE_MISMATCH")
	state.math_state["window_locked"] = true
	return _result(true, "WINDOWS_LOCKED")

func _has_unique_positions(positions: Array) -> bool:
	var seen := {}
	for position in positions:
		if seen.has(position):
			return false
		seen[position] = true
	return true

func _has_circular_spacing(positions: Array) -> bool:
	var sorted_positions: Array[int] = []
	for position in positions:
		sorted_positions.append(int(position))
	sorted_positions.sort()
	for index in sorted_positions.size():
		var next_index := (index + 1) % sorted_positions.size()
		var spacing := posmod(sorted_positions[next_index] - sorted_positions[index], int(config["cycle_size"]))
		if spacing != int(config["window_spacing"]):
			return false
	return true

func _has_blockade_collision(positions: Array) -> bool:
	for position in positions:
		if int(position) in config["blockade_slots"]:
			return true
	return false

func _same_int_set(left: Array, right: Array) -> bool:
	if left.size() != right.size():
		return false
	var left_values: Array[int] = []
	var right_values: Array[int] = []
	for value in left:
		left_values.append(int(value))
	for value in right:
		right_values.append(int(value))
	left_values.sort()
	right_values.sort()
	return left_values == right_values

func _failure(code: String) -> Dictionary:
	_record_attempt(code)
	return _result(false, code)

func _record_attempt(code: String) -> void:
	if code not in state.math_state["attempt_codes"]:
		state.math_state["attempt_codes"].append(code)

func _result(ok: bool, feedback: String, completed := false) -> Dictionary:
	return {"ok": ok, "feedback": feedback, "completed": completed}
