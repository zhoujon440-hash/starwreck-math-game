class_name HintService
extends RefCounted

const TIER_SECONDS := [120.0, 300.0, 540.0]

var state: RefCounted
var hints: Dictionary = {}

func _init(game_state: RefCounted) -> void:
	state = game_state
	var parsed = JSON.parse_string(FileAccess.get_file_as_string("res://data/scenes/scn_g01_00.json"))
	if parsed is Dictionary and parsed.get("hints") is Dictionary:
		hints = parsed.get("hints")

func current_hint() -> String:
	var idle_seconds = maxf(0.0, state.elapsed_seconds - state.last_progress_elapsed_seconds)
	var tier := 0
	for threshold in TIER_SECONDS:
		if idle_seconds >= threshold:
			tier += 1
	if tier == 0:
		return ""
	state.hint_stage = maxi(state.hint_stage, tier)
	var phase = _hint_phase()
	var phase_hints = hints.get(phase, [])
	if phase_hints is Array and phase_hints.size() >= tier:
		return str(phase_hints[tier - 1])
	return ""

func mark_progress() -> void:
	state.last_progress_elapsed_seconds = state.elapsed_seconds
	state.hint_stage = 0

func _hint_phase() -> String:
	if "ITM-G01-001" not in state.inventory_item_ids and "ITM-G01-001" not in state.installed_item_ids:
		return "EXPLORE"
	if str(state.current_view) == "EVIDENCE":
		var active_clue := str(state.investigation_state.get("active_inspection_clue", ""))
		match active_clue:
			"CLUE-002":
				return "BURN_SCAN" if bool(state.investigation_state.get("burn_baseline_locked", false)) else "BURN_BASELINE"
			"CLUE-003":
				return "TAPE_ORDER"
			"CLUE-004":
				return "PLATE_TRACE"
	if _needs_synthesis():
		return "SYNTHESIS"
	if _in_signal_receiver():
		var verification: Dictionary = state.math_state.get("signal_verification", {})
		var retained: Array = verification.get("retained_channels", [])
		if not bool(verification.get("maintenance_locked", false)):
			return "MAINTENANCE"
		if not bool(verification.get("weak_locked", false)):
			return "WEAK"
		if bool(verification.get("sealed", false)):
			return "REPAIR"
		return "KEEP_FINAL" if retained.size() == 1 else "KEEP_GATES"
	if _in_measurement_route():
		if not bool(state.math_state.get("probe_prepared", false)):
			return "DIAGNOSTIC"
		match str(state.math_state.get("measurement_stage", "origin")):
			"origin":
				return "ORIGIN"
			"echo":
				return "CALIPER"
			"blockade":
				return "BLOCKADE"
			"windows":
				return "WINDOWS"
			_:
				return "REPAIR"
	if state.observed_clue_ids.size() < 7:
		return "INVESTIGATE"
	if "DED-004" not in state.unlocked_deduction_ids:
		return "DEDUCTION"
	return "REPAIR"

func _needs_synthesis() -> bool:
	if bool(state.investigation_state.get("repair_synthesis_complete", false)) or "DED-004" in state.unlocked_deduction_ids:
		return false
	if "DED-003" not in state.unlocked_deduction_ids:
		return false
	for clue_id in ["CLUE-004", "CLUE-005", "CLUE-006", "CLUE-007"]:
		if clue_id not in state.observed_clue_ids:
			return false
	return true

func _in_measurement_route() -> bool:
	if "DED-004" not in state.unlocked_deduction_ids:
		return false
	if bool(state.math_state.get("window_locked", false)):
		return false
	return bool(state.device_state.get("b_isolated", false))

func _in_signal_receiver() -> bool:
	return str(state.current_view) == "SIGNAL_VERIFY" or (
		state.world_state == "POWER_RESTORED"
		and bool(state.math_state.get("window_locked", false))
		and not bool(state.math_state.get("signal_verification", {}).get("sealed", false))
	)
