class_name MathProgressService
extends RefCounted

const TIERS := ["guided", "standard", "expert"]

var state: RefCounted

func _init(game_state: RefCounted) -> void:
	state = game_state

func set_support_tier(tier: String) -> bool:
	if tier not in TIERS:
		return false
	state.math_state["support_tier"] = tier
	return true

func record_attempt(code: String) -> void:
	if not code.is_empty() and code not in state.math_state["attempt_codes"]:
		state.math_state["attempt_codes"].append(code)

func use_hint(stage: int) -> bool:
	if stage < 1 or stage > 3 or stage <= int(state.math_state["hint_stage"]):
		return false
	state.math_state["hint_stage"] = stage
	return true
