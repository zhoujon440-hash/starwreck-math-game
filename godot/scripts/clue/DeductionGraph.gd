class_name DeductionGraph
extends RefCounted

const VALID_RELATIONS = ["supports", "contradicts", "supersedes"]

var state: RefCounted
var data: Dictionary = {}
var clue_ids: Array[String] = []

func _init(game_state: RefCounted) -> void:
	state = game_state
	var parsed = JSON.parse_string(FileAccess.get_file_as_string("res://data/scenes/scn_g01_00.json"))
	if parsed is Dictionary:
		data = parsed
		for clue in data.get("clues", []):
			clue_ids.append(str(clue.get("id")))

func add_edge(from_id: String, to_id: String, relation: String) -> Dictionary:
	var result = {"accepted": false, "new_deductions": []}
	if relation not in VALID_RELATIONS or from_id not in clue_ids or to_id not in clue_ids:
		return result
	var edge = {"from": from_id, "to": to_id, "relation": relation}
	if not _is_valid_edge(edge):
		return result
	result.accepted = true
	if not _has_edge(edge):
		state.deduction_edges.append(edge)
	result.new_deductions = recompute()
	return result

func recompute() -> Array[String]:
	var unlocked: Array[String] = []
	var changed := true
	while changed:
		changed = false
		for deduction in data.get("deductions", []):
			var id = str(deduction.get("id"))
			if id in state.unlocked_deduction_ids:
				continue
			if _requirements_met(deduction):
				state.unlocked_deduction_ids.append(id)
				unlocked.append(id)
				changed = true
	return unlocked

func has_deduction(id: String) -> bool:
	return id in state.unlocked_deduction_ids

func _requirements_met(rule: Dictionary) -> bool:
	for clue_id in rule.get("requires_clues", []):
		if clue_id not in state.observed_clue_ids:
			return false
	for deduction_id in rule.get("requires_deductions", []):
		if deduction_id not in state.unlocked_deduction_ids:
			return false
	for edge in rule.get("requires_edges", []):
		if not _has_edge(edge):
			return false
	return true

func _is_valid_edge(edge: Dictionary) -> bool:
	for allowed in data.get("valid_relations", []):
		if _same_edge(edge, allowed):
			return true
	return false

func _has_edge(edge: Dictionary) -> bool:
	for existing in state.deduction_edges:
		if _same_edge(edge, existing):
			return true
	return false

func _same_edge(a: Dictionary, b: Dictionary) -> bool:
	return a.get("from") == b.get("from") and a.get("to") == b.get("to") and a.get("relation") == b.get("relation")

