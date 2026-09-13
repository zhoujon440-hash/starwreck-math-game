class_name GameState
extends RefCounted

const SCHEMA_VERSION := 2
const BURN_BASELINE_TARGET := [1, 2, 2, 3]
const BURN_SCAN_TARGET := [0, 1, 2, 3]
const TAPE_ORDER_TARGET := [1, 0, 2]
const TAPE_FACE_TARGET := [2, 1, 2]
const PLATE_TRACE_TARGET := [0, 2, 3, 5]
const ORIGIN_TICK_TARGET := 0
const ECHO_PULSE_TARGET := 6
const ECHO_TICK_TARGET := 5
const BLOCKADE_MARK_TARGET := [0, 3, 7, 8]
const SAMPLE_WINDOW_TARGET := [1, 5, 9]
const MAINTENANCE_GAIN_TARGET := 3
const WEAK_GAIN_TARGET := 2
const WEAK_PHASE_TARGET := 11
const DEDUCTION_IDS := ["DED-001", "DED-002", "DED-003", "DED-004"]
const AUTHORED_DEDUCTION_EDGES := [
	{"from": "CLUE-002", "to": "CLUE-003", "relation": "supports"},
	{"from": "CLUE-007", "to": "CLUE-006", "relation": "supersedes"},
	{"from": "DED-002", "to": "CLUE-004", "relation": "supports"},
	{"from": "CLUE-004", "to": "CLUE-005", "relation": "supports"},
]

var schema_version := SCHEMA_VERSION
var scene_id := "SCN-G01-00"
var scene_phase := "EXPLORE"
var inventory_item_ids: Array[String] = []
var observed_clue_ids: Array[String] = []
var analyzed_clue_ids: Array[String] = []
var deduction_edges: Array[Dictionary] = []
var unlocked_deduction_ids: Array[String] = []
var installed_item_ids: Array[String] = []
var device_state := {
	"b_isolated": false,
	"fuse_installed": false,
	"coupler_angle": 0.0,
	"protector_on": false,
}
var world_state := "BLACKOUT"
var elapsed_seconds := 0.0
var last_progress_elapsed_seconds := 0.0
var hint_stage := 0
var current_view := "COCKPIT"
var investigation_state := _default_investigation_state()
var math_state := _default_math_state()

func snapshot() -> Dictionary:
	return {
		"schema_version": schema_version,
		"scene_id": scene_id,
		"scene_phase": scene_phase,
		"inventory_item_ids": inventory_item_ids.duplicate(),
		"observed_clue_ids": observed_clue_ids.duplicate(),
		"analyzed_clue_ids": analyzed_clue_ids.duplicate(),
		"deduction_edges": deduction_edges.duplicate(true),
		"unlocked_deduction_ids": unlocked_deduction_ids.duplicate(),
		"installed_item_ids": installed_item_ids.duplicate(),
		"device_state": device_state.duplicate(true),
		"world_state": world_state,
		"elapsed_seconds": elapsed_seconds,
		"last_progress_elapsed_seconds": last_progress_elapsed_seconds,
		"hint_stage": hint_stage,
		"current_view": current_view,
		"investigation_state": investigation_state.duplicate(true),
		"math_state": math_state.duplicate(true),
	}

func restore(data: Dictionary) -> bool:
	if not _valid_snapshot_shape(data):
		return false
	device_state = _default_device_state()
	investigation_state = _default_investigation_state()
	math_state = _default_math_state()
	schema_version = SCHEMA_VERSION
	scene_id = data.get("scene_id", "SCN-G01-00")
	scene_phase = data.get("scene_phase", "EXPLORE")
	_assign_strings(inventory_item_ids, data.get("inventory_item_ids", []))
	_assign_strings(observed_clue_ids, data.get("observed_clue_ids", []))
	_assign_strings(analyzed_clue_ids, data.get("analyzed_clue_ids", []))
	deduction_edges.clear()
	for edge in data.get("deduction_edges", []):
		if edge is Dictionary:
			deduction_edges.append(edge.duplicate(true))
	_assign_strings(unlocked_deduction_ids, data.get("unlocked_deduction_ids", []))
	_assign_strings(installed_item_ids, data.get("installed_item_ids", []))
	var restored_device = data.get("device_state", {})
	if restored_device is Dictionary:
		for key in restored_device.keys():
			device_state[key] = restored_device[key]
	world_state = data.get("world_state", "BLACKOUT")
	elapsed_seconds = float(data.get("elapsed_seconds", 0.0))
	last_progress_elapsed_seconds = float(data.get("last_progress_elapsed_seconds", 0.0))
	hint_stage = clampi(int(data.get("hint_stage", 0)), 0, 3)
	current_view = data.get("current_view", "COCKPIT")
	var restored_investigation = data.get("investigation_state", {})
	if restored_investigation is Dictionary:
		for key in restored_investigation.keys():
			var value = restored_investigation[key]
			if key == "inspection_observations":
				var merged: Dictionary = investigation_state[key]
				for nested_key in value.keys():
					merged[nested_key] = _integer_array(value[nested_key])
				investigation_state[key] = merged
			else:
				investigation_state[key] = _integer_array(value) if key in ["burn_scan_points", "tape_positions", "burn_baseline", "tape_order", "plate_trace_nodes"] else (value.duplicate(true) if value is Array or value is Dictionary else value)
	if data.has("math_state"):
		math_state = _normalized_math_state(data["math_state"])
	return true

func _valid_snapshot_shape(data: Dictionary) -> bool:
	if data.get("schema_version") != SCHEMA_VERSION:
		return false
	if not data.has("scene_id") or not data.get("scene_id") is String or data.get("scene_id") != "SCN-G01-00":
		return false
	if data.has("scene_phase") and (not data.get("scene_phase") is String or data.get("scene_phase") not in ["EXPLORE", "INVESTIGATE", "DEDUCTION", "REPAIR", "POWER_RESTORED", "SLICE_COMPLETE"]):
		return false
	if data.has("world_state") and (not data.get("world_state") is String or data.get("world_state") not in ["BLACKOUT", "POWER_RESTORED"]):
		return false
	if data.has("current_view") and (not data.get("current_view") is String or data.get("current_view") not in ["COCKPIT", "EVIDENCE", "CABINET", "POWER_PANEL", "SIGNAL_VERIFY"]):
		return false
	for field in ["inventory_item_ids", "observed_clue_ids", "analyzed_clue_ids", "installed_item_ids"]:
		if data.has(field) and not _is_string_array(data[field]):
			return false
	if data.has("unlocked_deduction_ids") and not _valid_unique_string_enum(data["unlocked_deduction_ids"], DEDUCTION_IDS):
		return false
	if data.has("deduction_edges") and not _valid_deduction_edges(data["deduction_edges"]):
		return false
	if data.has("device_state") and not _valid_device_state(data["device_state"]):
		return false
	for field in ["elapsed_seconds", "last_progress_elapsed_seconds", "hint_stage"]:
		if data.has(field) and not (data[field] is int or data[field] is float):
			return false
	if not data.has("investigation_state") or not _valid_investigation_state(data["investigation_state"]):
		return false
	if not data.has("math_state") or not _valid_math_state(data["math_state"]):
		return false
	if not _valid_terminal_phase_progress(data):
		return false
	if not _valid_persisted_deduction_progress(data):
		return false
	if not _valid_restored_world_progress(data):
		return false
	if not _valid_current_view_progress(data):
		return false
	return true

func _valid_terminal_phase_progress(data: Dictionary) -> bool:
	var math: Dictionary = data["math_state"]
	var verification: Dictionary = math["signal_verification"]
	var terminal_record: bool = math["measurement_stage"] == "complete" and math["completed"] and math["signal_split"] and _has_sealed_retained_record(verification)
	if data.get("scene_phase", "EXPLORE") == "SLICE_COMPLETE":
		return data.get("world_state", "BLACKOUT") == "POWER_RESTORED" and data.get("current_view", "") == "COCKPIT" and terminal_record
	if verification["sealed"] or terminal_record:
		return false
	return true

func _valid_restored_world_progress(data: Dictionary) -> bool:
	if data.get("world_state", "BLACKOUT") != "POWER_RESTORED":
		return true
	if data.get("scene_phase", "EXPLORE") not in ["POWER_RESTORED", "SLICE_COMPLETE"]:
		return false
	var device: Dictionary = data.get("device_state", {})
	if not device.get("b_isolated", false) or not device.get("fuse_installed", false) or not device.get("protector_on", false) or device.get("coupler_angle", 0.0) != 90.0:
		return false
	# Every restored-power view resumes at the receiver. The validated window
	# lock proves all diagnostic stages are ready, including cockpit transition saves.
	return data["math_state"]["window_locked"]

func _valid_current_view_progress(data: Dictionary) -> bool:
	if data.get("current_view", "COCKPIT") != "SIGNAL_VERIFY":
		return true
	if data.get("world_state", "BLACKOUT") != "POWER_RESTORED" or data.get("scene_phase", "EXPLORE") != "POWER_RESTORED":
		return false
	var math: Dictionary = data["math_state"]
	var verification: Dictionary = math["signal_verification"]
	if math["measurement_stage"] != "windows" or not math["window_locked"] or not _matches_fixed_int_array(math["sample_windows"], SAMPLE_WINDOW_TARGET):
		return false
	return not math["completed"] and not math["signal_split"] and not verification["sealed"]

func _valid_math_state(value: Variant) -> bool:
	if not value is Dictionary:
		return false
	var required := ["support_tier", "task_id", "probe_prepared", "observed_cycles", "sample_windows", "window_locked", "completed", "signal_split", "attempt_codes", "hint_stage", "measurement_stage", "origin_tick", "echo_measurement", "blockade_marks", "signal_verification"]
	if value.size() != required.size():
		return false
	for key in required:
		if not value.has(key):
			return false
	if not value["support_tier"] is String or value["support_tier"] not in ["guided", "standard", "expert"]:
		return false
	if not value["task_id"] is String or value["task_id"] != "SCN-G01-00-MATH-01":
		return false
	for key in ["probe_prepared", "window_locked", "completed", "signal_split"]:
		if not value[key] is bool:
			return false
	if not _valid_int(value["observed_cycles"], 0, 3):
		return false
	if not _valid_int_array(value["sample_windows"], 0, 11, 3, 3, false):
		return false
	if not _is_string_array(value["attempt_codes"]):
		return false
	if not _valid_int(value["hint_stage"], 0, 3):
		return false
	if not value["measurement_stage"] is String or value["measurement_stage"] not in ["origin", "echo", "blockade", "windows", "complete"]:
		return false
	if not _valid_int(value["origin_tick"], 0, 11):
		return false
	if not _valid_echo_measurement(value["echo_measurement"]):
		return false
	if not _valid_int_array(value["blockade_marks"], 0, 11, 0, 4, true):
		return false
	if not _valid_signal_verification(value["signal_verification"]):
		return false
	return _valid_measurement_progress(value)

func _valid_device_state(value: Variant) -> bool:
	if not value is Dictionary:
		return false
	var expected := {"b_isolated": TYPE_BOOL, "fuse_installed": TYPE_BOOL, "coupler_angle": TYPE_FLOAT, "protector_on": TYPE_BOOL}
	for key in value.keys():
		if key not in expected:
			return false
		if key == "coupler_angle":
			if not (value[key] is int or value[key] is float) or not is_finite(float(value[key])) or float(value[key]) < 0.0 or float(value[key]) > 90.0:
				return false
		elif not value[key] is bool:
			return false
	return true

func _valid_investigation_state(value: Variant) -> bool:
	if not value is Dictionary:
		return false
	var required := ["burn_scan_points", "tape_positions", "plate_latches", "plate_cover_lifted", "active_inspection_clue", "inspection_observations", "inspection_hypotheses", "cabinet_obstructions", "fuse_latches", "burn_baseline", "burn_baseline_locked", "burn_active_point", "burn_hold_progress", "tape_order", "tape_verified", "plate_trace_nodes", "repair_synthesis_steps", "repair_synthesis_complete"]
	if value.size() != required.size():
		return false
	for key in required:
		if not value.has(key):
			return false
	if value.has("burn_scan_points") and not _valid_int_array(value["burn_scan_points"], 0, 3, 0, 4, true):
		return false
	if value.has("tape_positions") and not _valid_int_array(value["tape_positions"], 0, 2, 3, 3, false):
		return false
	if value.has("plate_latches") and not _valid_bool_array(value["plate_latches"], 2):
		return false
	if not value["plate_cover_lifted"] is bool:
		return false
	if value.has("fuse_latches") and not _valid_bool_array(value["fuse_latches"], 2):
		return false
	if value.has("active_inspection_clue") and (not value["active_inspection_clue"] is String or value["active_inspection_clue"] not in ["", "CLUE-002", "CLUE-003", "CLUE-004"]):
		return false
	if value.has("inspection_observations") and not _valid_index_map(value["inspection_observations"]):
		return false
	if value.has("inspection_hypotheses") and not _valid_bool_map(value["inspection_hypotheses"], ["CLUE-002", "CLUE-003", "CLUE-004"]):
		return false
	if value.has("cabinet_obstructions") and not _valid_bool_map(value["cabinet_obstructions"], ["wrench", "glove"]):
		return false
	if not _valid_int_array(value["burn_baseline"], 0, 3, 4, 4, false):
		return false
	if not value["burn_baseline_locked"] is bool:
		return false
	if not _valid_int(value["burn_active_point"], -1, 3):
		return false
	if not _valid_unit_float(value["burn_hold_progress"]):
		return false
	if not _valid_int_array(value["tape_order"], 0, 2, 3, 3, true):
		return false
	if not value["tape_verified"] is bool:
		return false
	if not _valid_int_array(value["plate_trace_nodes"], 0, 5, 0, 6, true):
		return false
	if not _valid_repair_synthesis_steps(value["repair_synthesis_steps"]):
		return false
	if not value["repair_synthesis_complete"] is bool:
		return false
	if value["burn_baseline_locked"] and not _matches_fixed_int_array(value["burn_baseline"], BURN_BASELINE_TARGET):
		return false
	if not _matches_int_prefix(value["burn_scan_points"], BURN_SCAN_TARGET):
		return false
	var burn_points: Array = value["burn_scan_points"]
	var burn_locked: bool = value["burn_baseline_locked"]
	var burn_active: int = int(value["burn_active_point"])
	var burn_progress: float = float(value["burn_hold_progress"])
	if not burn_points.is_empty() and not burn_locked:
		return false
	if burn_active == -1:
		if not is_zero_approx(burn_progress):
			return false
	elif not burn_locked or burn_points.size() >= BURN_SCAN_TARGET.size() or burn_active != burn_points.size() or burn_progress >= 1.0:
		return false
	var plate_latches: Array = value["plate_latches"]
	if not bool(plate_latches[0]) and bool(plate_latches[1]):
		return false
	if value["plate_cover_lifted"] and (not bool(plate_latches[0]) or not bool(plate_latches[1])):
		return false
	if not _matches_int_prefix(value["plate_trace_nodes"], PLATE_TRACE_TARGET):
		return false
	if not value["plate_trace_nodes"].is_empty() and (not value["plate_cover_lifted"] or not bool(plate_latches[0]) or not bool(plate_latches[1])):
		return false
	if value["tape_verified"] and (not _matches_fixed_int_array(value["tape_order"], TAPE_ORDER_TARGET) or not _matches_fixed_int_array(value["tape_positions"], TAPE_FACE_TARGET)):
		return false
	if value["repair_synthesis_complete"] and not _is_complete_repair_synthesis(value["repair_synthesis_steps"]):
		return false
	return true

func _valid_deduction_edges(value: Variant) -> bool:
	if not value is Array:
		return false
	var accepted: Array[Dictionary] = []
	for edge in value:
		if not edge is Dictionary or edge.size() != 3:
			return false
		for key in ["from", "to", "relation"]:
			if not edge.has(key) or not edge[key] is String:
				return false
		var authored := false
		for allowed in AUTHORED_DEDUCTION_EDGES:
			if _same_deduction_edge(edge, allowed):
				authored = true
				break
		if not authored:
			return false
		for existing in accepted:
			if _same_deduction_edge(edge, existing):
				return false
		accepted.append(edge)
	return true

func _valid_persisted_deduction_progress(data: Dictionary) -> bool:
	var observed: Array = data.get("observed_clue_ids", [])
	var analyzed: Array = data.get("analyzed_clue_ids", [])
	var unlocked: Array = data.get("unlocked_deduction_ids", [])
	var edges: Array = data.get("deduction_edges", [])
	var investigation: Dictionary = data.get("investigation_state", {})
	for edge in edges:
		if not _deduction_endpoint_available(str(edge["from"]), observed, unlocked) or not _deduction_endpoint_available(str(edge["to"]), observed, unlocked):
			return false
	for deduction_id in unlocked:
		match deduction_id:
			"DED-001":
				if "CLUE-001" not in observed or "CLUE-001" not in analyzed:
					return false
			"DED-002":
				if "CLUE-002" not in observed or "CLUE-003" not in observed or not _has_persisted_edge(edges, AUTHORED_DEDUCTION_EDGES[0]):
					return false
			"DED-003":
				if "CLUE-006" not in observed or "CLUE-007" not in observed or not _has_persisted_edge(edges, AUTHORED_DEDUCTION_EDGES[1]):
					return false
			"DED-004":
				for prerequisite in ["DED-001", "DED-002", "DED-003"]:
					if prerequisite not in unlocked:
						return false
				if "CLUE-004" not in observed or "CLUE-005" not in observed:
					return false
				if not _has_persisted_edge(edges, AUTHORED_DEDUCTION_EDGES[2]) or not _has_persisted_edge(edges, AUTHORED_DEDUCTION_EDGES[3]):
					return false
				if not bool(investigation.get("repair_synthesis_complete", false)) or not _is_complete_repair_synthesis(investigation.get("repair_synthesis_steps", [])):
					return false
	return true

func _deduction_endpoint_available(id: String, observed: Array, unlocked: Array) -> bool:
	if id.begins_with("CLUE-"):
		return id in observed
	if id.begins_with("DED-"):
		return id in unlocked
	return false

func _has_persisted_edge(edges: Array, target: Dictionary) -> bool:
	for edge in edges:
		if _same_deduction_edge(edge, target):
			return true
	return false

func _same_deduction_edge(a: Dictionary, b: Dictionary) -> bool:
	return a.get("from") == b.get("from") and a.get("to") == b.get("to") and a.get("relation") == b.get("relation")

func _valid_unique_string_enum(value: Variant, allowed: Array) -> bool:
	if not value is Array:
		return false
	var seen := {}
	for entry in value:
		if not entry is String or entry not in allowed or seen.has(entry):
			return false
		seen[entry] = true
	return true

func _valid_index_map(value: Variant) -> bool:
	if not value is Dictionary:
		return false
	for key in value.keys():
		if key not in ["CLUE-002", "CLUE-003", "CLUE-004"] or not _valid_int_array(value[key], 0, 2, 0, 3, true):
			return false
	return true

func _valid_bool_map(value: Variant, allowed_keys: Array) -> bool:
	if not value is Dictionary:
		return false
	for key in value.keys():
		if key not in allowed_keys or not value[key] is bool:
			return false
	return true

func _valid_int_array(value: Variant, minimum: int, maximum: int, minimum_size: int, maximum_size: int, unique: bool) -> bool:
	if not value is Array or value.size() < minimum_size or value.size() > maximum_size:
		return false
	var seen := {}
	for entry in value:
		if not (entry is int or entry is float) or not is_finite(float(entry)) or not is_equal_approx(float(entry), roundf(float(entry))) or entry < minimum or entry > maximum:
			return false
		if unique and seen.has(entry):
			return false
		seen[entry] = true
	return true

func _valid_int(value: Variant, minimum: int, maximum: int) -> bool:
	return (value is int or value is float) and is_finite(float(value)) and is_equal_approx(float(value), roundf(float(value))) and value >= minimum and value <= maximum

func _matches_fixed_int_array(value: Variant, target: Array) -> bool:
	if not value is Array or value.size() != target.size():
		return false
	for index in target.size():
		if not _valid_int(value[index], int(target[index]), int(target[index])):
			return false
	return true

func _valid_unit_float(value: Variant) -> bool:
	return (value is int or value is float) and is_finite(float(value)) and float(value) >= 0.0 and float(value) <= 1.0

func _valid_echo_measurement(value: Variant) -> bool:
	if not value is Dictionary or value.size() != 3:
		return false
	for key in ["pulse", "echo", "confirmed"]:
		if not value.has(key):
			return false
	return _valid_int(value["pulse"], 0, 11) and _valid_int(value["echo"], 0, 11) and value["confirmed"] is bool

func _valid_signal_verification(value: Variant) -> bool:
	if not value is Dictionary:
		return false
	var required := ["maintenance_gain", "maintenance_locked", "weak_gain", "weak_phase", "weak_locked", "retained_channels", "sealed"]
	if value.size() != required.size():
		return false
	for key in required:
		if not value.has(key):
			return false
	if not _valid_int(value["maintenance_gain"], 0, 3) or not _valid_int(value["weak_gain"], 0, 3) or not _valid_int(value["weak_phase"], 0, 11):
		return false
	for key in ["maintenance_locked", "weak_locked", "sealed"]:
		if not value[key] is bool:
			return false
	if not _valid_channel_array(value["retained_channels"]):
		return false
	if value["maintenance_locked"] and value["maintenance_gain"] != MAINTENANCE_GAIN_TARGET:
		return false
	if value["weak_locked"] and (not value["maintenance_locked"] or value["weak_gain"] != WEAK_GAIN_TARGET or value["weak_phase"] != WEAK_PHASE_TARGET):
		return false
	if "maintenance" in value["retained_channels"] and not value["maintenance_locked"]:
		return false
	if "weak" in value["retained_channels"] and not value["weak_locked"]:
		return false
	if value["sealed"] and not _has_sealed_retained_record(value):
		return false
	return true

func _has_sealed_retained_record(value: Dictionary) -> bool:
	return value["sealed"] and _has_both_retained_channel_locks(value)

func _has_both_retained_channel_locks(value: Dictionary) -> bool:
	return value["maintenance_locked"] and value["weak_locked"] and value["retained_channels"] == ["maintenance", "weak"]

func _valid_channel_array(value: Variant) -> bool:
	if not value is Array or value.size() > 2:
		return false
	var seen := {}
	for channel in value:
		if not channel is String or channel not in ["maintenance", "weak"] or seen.has(channel):
			return false
		seen[channel] = true
	return true

func _valid_measurement_progress(value: Dictionary) -> bool:
	var stage: String = value["measurement_stage"]
	var required_cycles := {"origin": 0, "echo": 1, "blockade": 2, "windows": 3, "complete": 3}
	var echo_measurement: Dictionary = value["echo_measurement"]
	var blockade_marks: Array = value["blockade_marks"]
	var verification: Dictionary = value["signal_verification"]
	if int(value["observed_cycles"]) != int(required_cycles[stage]):
		return false
	if stage in ["origin", "echo"] and not blockade_marks.is_empty():
		return false
	if stage in ["echo", "blockade", "windows", "complete"] and value["origin_tick"] != ORIGIN_TICK_TARGET:
		return false
	if stage in ["blockade", "windows", "complete"] and (not echo_measurement["confirmed"] or int(echo_measurement["pulse"]) != ECHO_PULSE_TARGET or int(echo_measurement["echo"]) != ECHO_TICK_TARGET):
		return false
	if stage in ["windows", "complete"] and not _matches_fixed_int_array(blockade_marks, BLOCKADE_MARK_TARGET):
		return false
	if value["window_locked"] and (stage not in ["windows", "complete"] or not value["probe_prepared"] or value["observed_cycles"] != 3 or not _matches_fixed_int_array(value["sample_windows"], SAMPLE_WINDOW_TARGET)):
		return false
	var terminal_progress: bool = value["signal_split"] or value["completed"] or stage == "complete"
	if terminal_progress and (stage != "complete" or not value["probe_prepared"] or value["observed_cycles"] != 3 or not _matches_fixed_int_array(value["sample_windows"], SAMPLE_WINDOW_TARGET) or not value["window_locked"] or not value["completed"] or not value["signal_split"] or not _has_sealed_retained_record(verification)):
		return false
	return true

func _valid_repair_synthesis_steps(value: Variant) -> bool:
	if not value is Array or value.size() > 3:
		return false
	var slots := {}
	var plates := {}
	for step in value:
		if not step is Dictionary or step.size() != 2 or not step.has("slot") or not step.has("plate_id"):
			return false
		if not _valid_int(step["slot"], 0, 2) or not step["plate_id"] is String or step["plate_id"] not in ["REV3_STAMP", "AC_PATH", "FUSE_SPEC"]:
			return false
		if slots.has(step["slot"]) or plates.has(step["plate_id"]):
			return false
		slots[step["slot"]] = true
		plates[step["plate_id"]] = true
	return true

func _is_complete_repair_synthesis(steps: Array) -> bool:
	if steps.size() != 3:
		return false
	var expected := {0: "REV3_STAMP", 1: "AC_PATH", 2: "FUSE_SPEC"}
	for step in steps:
		if expected.get(int(step["slot"]), "") != step["plate_id"]:
			return false
	return true

func _valid_bool_array(value: Variant, expected_size: int) -> bool:
	if not value is Array or value.size() != expected_size:
		return false
	for entry in value:
		if not entry is bool:
			return false
	return true

func _matches_int_prefix(value: Array, target: Array) -> bool:
	if value.size() > target.size():
		return false
	for index in value.size():
		if int(value[index]) != int(target[index]):
			return false
	return true

func _is_string_array(value: Variant) -> bool:
	if not value is Array:
		return false
	for entry in value:
		if not entry is String:
			return false
	return true

func _integer_array(value: Array) -> Array:
	var normalized: Array = []
	for entry in value:
		normalized.append(int(entry))
	return normalized

func _default_device_state() -> Dictionary:
	return {"b_isolated": false, "fuse_installed": false, "coupler_angle": 0.0, "protector_on": false}

func _default_investigation_state() -> Dictionary:
	return {
		"burn_scan_points": [],
		"tape_positions": [0, 0, 0],
		"plate_latches": [false, false],
		"plate_cover_lifted": false,
		"active_inspection_clue": "",
		"inspection_observations": {"CLUE-002": [], "CLUE-003": [], "CLUE-004": []},
		"inspection_hypotheses": {"CLUE-002": false, "CLUE-003": false, "CLUE-004": false},
		"cabinet_obstructions": {"wrench": false, "glove": false},
		"fuse_latches": [false, false],
		"burn_baseline": [0, 0, 0, 0],
		"burn_baseline_locked": false,
		"burn_active_point": -1,
		"burn_hold_progress": 0.0,
		"tape_order": [0, 1, 2],
		"tape_verified": false,
		"plate_trace_nodes": [],
		"repair_synthesis_steps": [],
		"repair_synthesis_complete": false,
	}

func _default_math_state() -> Dictionary:
	return {
		"support_tier": "standard",
		"task_id": "SCN-G01-00-MATH-01",
		"probe_prepared": false,
		"observed_cycles": 0,
		"sample_windows": [0, 0, 0],
		"window_locked": false,
		"completed": false,
		"signal_split": false,
		"attempt_codes": [],
		"hint_stage": 0,
		"measurement_stage": "origin",
		"origin_tick": 0,
		"echo_measurement": {"pulse": 0, "echo": 0, "confirmed": false},
		"blockade_marks": [],
		"signal_verification": {
			"maintenance_gain": 0,
			"maintenance_locked": false,
			"weak_gain": 0,
			"weak_phase": 0,
			"weak_locked": false,
			"retained_channels": [],
			"sealed": false,
		},
	}

func _normalized_math_state(value: Dictionary) -> Dictionary:
	var normalized := value.duplicate(true)
	for key in ["observed_cycles", "hint_stage", "origin_tick"]:
		normalized[key] = int(normalized[key])
	normalized["sample_windows"] = _integer_array(normalized["sample_windows"])
	normalized["blockade_marks"] = _integer_array(normalized["blockade_marks"])
	var echo_measurement: Dictionary = normalized["echo_measurement"]
	echo_measurement["pulse"] = int(echo_measurement["pulse"])
	echo_measurement["echo"] = int(echo_measurement["echo"])
	normalized["echo_measurement"] = echo_measurement
	var signal_verification: Dictionary = normalized["signal_verification"]
	for key in ["maintenance_gain", "weak_gain", "weak_phase"]:
		signal_verification[key] = int(signal_verification[key])
	normalized["signal_verification"] = signal_verification
	return normalized

func _assign_strings(target: Array[String], source: Variant) -> void:
	target.clear()
	if source is Array:
		for value in source:
			target.append(str(value))
