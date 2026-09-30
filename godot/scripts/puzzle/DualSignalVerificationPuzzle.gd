class_name DualSignalVerificationPuzzle
extends RefCounted

const MAINTENANCE_GAIN_TARGET := 3
const WEAK_GAIN_TARGET := 2
const WEAK_PHASE_TARGET := 11
const SAMPLE_WINDOW_TARGET := [1, 5, 9]

var state: RefCounted
var config: Dictionary

func _init(game_state: RefCounted, puzzle_config: Dictionary) -> void:
	state = game_state
	config = puzzle_config.duplicate(true)

func adjust_gain(channel: String, direction: int) -> Dictionary:
	if not _receiver_ready():
		return _result(false, "SIGNAL_RECEIVER_NOT_READY")
	if channel not in ["maintenance", "weak"]:
		return _result(false, "UNKNOWN_CHANNEL")
	if direction not in [-1, 1]:
		return _result(false, "GAIN_DIRECTION_INVALID")
	var verification: Dictionary = state.math_state["signal_verification"]
	if bool(verification["%s_locked" % channel]) or bool(verification["sealed"]):
		return _result(false, "CHANNEL_LOCKED")
	var gain_key := "%s_gain" % channel
	verification[gain_key] = clampi(int(verification[gain_key]) + direction, 0, 3)
	return _result(true, "GAIN_ADJUSTED")

func set_weak_phase(tick: int) -> Dictionary:
	if not _receiver_ready():
		return _result(false, "SIGNAL_RECEIVER_NOT_READY")
	var verification: Dictionary = state.math_state["signal_verification"]
	if bool(verification["weak_locked"]) or bool(verification["sealed"]):
		return _result(false, "CHANNEL_LOCKED")
	if tick < 0 or tick >= int(config.get("cycle_size", 12)):
		return _result(false, "WEAK_PHASE_MISMATCH")
	verification["weak_phase"] = tick
	return _result(true, "WEAK_PHASE_SET")

func lock_channel(channel: String) -> Dictionary:
	if not _receiver_ready():
		return _result(false, "SIGNAL_RECEIVER_NOT_READY")
	if channel not in ["maintenance", "weak"]:
		return _result(false, "UNKNOWN_CHANNEL")
	var verification: Dictionary = state.math_state["signal_verification"]
	if bool(verification["%s_locked" % channel]):
		return _result(true, "CHANNEL_ALREADY_LOCKED")
	if channel == "maintenance":
		if int(verification["maintenance_gain"]) != MAINTENANCE_GAIN_TARGET:
			return _result(false, "MAINTENANCE_GAIN_MISMATCH")
		verification["maintenance_locked"] = true
		return _result(true, "MAINTENANCE_LOCKED", false, "maintenance")
	if not bool(verification["maintenance_locked"]):
		return _result(false, "MAINTENANCE_CHANNEL_REQUIRED")
	if int(verification["weak_gain"]) != WEAK_GAIN_TARGET:
		return _result(false, "WEAK_GAIN_MISMATCH")
	if int(verification["weak_phase"]) != _expected_weak_phase():
		return _result(false, "WEAK_PHASE_MISMATCH")
	verification["weak_locked"] = true
	return _result(true, "WEAK_LOCKED", false, "weak")

func set_retained(channel: String, retained: bool) -> Dictionary:
	if not _receiver_ready():
		return _result(false, "SIGNAL_RECEIVER_NOT_READY")
	if channel not in ["maintenance", "weak"]:
		return _result(false, "UNKNOWN_CHANNEL")
	var verification: Dictionary = state.math_state["signal_verification"]
	if not bool(verification["%s_locked" % channel]):
		return _result(false, "CHANNEL_NOT_LOCKED")
	if bool(verification["sealed"]):
		return _result(false, "RECORD_ALREADY_SEALED", true)
	var retained_channels: Array = verification["retained_channels"]
	if retained and channel not in retained_channels:
		retained_channels.append(channel)
	elif not retained:
		retained_channels.erase(channel)
	retained_channels.sort_custom(func(left: String, right: String): return ["maintenance", "weak"].find(left) < ["maintenance", "weak"].find(right))
	return _result(true, "RETAIN_GATE_SET")

func seal_record() -> Dictionary:
	if not _receiver_ready():
		return _result(false, "SIGNAL_RECEIVER_NOT_READY")
	var verification: Dictionary = state.math_state["signal_verification"]
	if bool(verification["sealed"]):
		return _result(true, "RECORD_ALREADY_SEALED", true)
	if not bool(verification["maintenance_locked"]) or not bool(verification["weak_locked"]) or verification["retained_channels"] != ["maintenance", "weak"]:
		return _result(false, "BOTH_RECORDS_REQUIRED")
	verification["sealed"] = true
	return _result(true, "RECORD_SEALED", true)

func _receiver_ready() -> bool:
	if state == null or state.world_state != "POWER_RESTORED":
		return false
	if not bool(state.math_state.get("window_locked", false)) or state.math_state.get("sample_windows", []) != SAMPLE_WINDOW_TARGET:
		return false
	return int(config.get("cycle_size", 0)) == 12 and int(config.get("weak_echo_offset", 0)) == -1

func _expected_weak_phase() -> int:
	return posmod(int(config.get("weak_echo_offset", -1)), int(config.get("cycle_size", 12)))

func _result(ok: bool, feedback: String, completed := false, revealed_channel := "") -> Dictionary:
	return {
		"ok": ok,
		"completed": completed,
		"feedback": feedback,
		"revealed_channel": revealed_channel,
	}
